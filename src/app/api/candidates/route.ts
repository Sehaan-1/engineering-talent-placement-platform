import { db } from "@/db";
import {
  candidates,
  skillCategories,
  skillDefinitions,
  skillMatrices,
  availabilities,
} from "@/db/schema";
import { requireAuthJson, getJsonBody, jsonError } from "@/lib/types";
import { desc, eq, ilike, or, and, gte, lte, inArray, type SQL, sql } from "drizzle-orm";
import { pickColor } from "@/lib/auth-utils";
import type { NextRequest } from "next/server";
import { ensureSkillTables } from "@/lib/seed";
import { getOrgContext } from "@/lib/org";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const ALLOWED_SENIORITY = new Set([
  "junior",
  "mid",
  "senior",
  "staff",
  "principal",
]);
const ALLOWED_REGION = new Set(["us", "ca", "uk", "eu", "other"]);
const ALLOWED_VERIFICATION = new Set([
  "unverified",
  "pending",
  "verified",
  "rejected",
]);
const ALLOWED_AVAILABILITY = new Set([
  "available",
  "limited",
  "booked",
  "on-leave",
]);

export async function GET(req: Request) {
  const { user, error } = await requireAuthJson();
  if (error) return error;

  await ensureSkillTables();
  const orgCtx = await getOrgContext().catch(() => null);

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const skillsParam = url.searchParams.get("skills")?.trim() ?? "";
  const frameworkParam = url.searchParams.get("framework")?.trim() ?? ""; // legacy compat
  const seniorityParam = url.searchParams.get("seniority")?.trim() ?? "";
  const regionParam = url.searchParams.get("region")?.trim() ?? "";
  const verificationParam = url.searchParams.get("verification")?.trim() ?? "";
  const availabilityParam = url.searchParams.get("availability")?.trim() ?? "";
  const rateMinStr = url.searchParams.get("rateMin");
  const rateMaxStr = url.searchParams.get("rateMax");

  const whereParts: SQL[] = [
    orgCtx
      ? eq(candidates.orgId, orgCtx.org.id)
      : eq(candidates.ownerId, user.id),
  ];

  // Text search
  if (q) {
    const term = `%${q}%`;
    const textFilter = or(
      ilike(candidates.fullName, term),
      ilike(candidates.headline, term),
      ilike(candidates.location, term),
      ilike(candidates.email, term),
      ilike(candidates.bio, term),
      sql`exists (
        select 1 from jsonb_array_elements_text(${candidates.tags}) as elem
        where elem ilike ${term}
      )`
    );
    if (textFilter) whereParts.push(textFilter);
  }

  // Seniority filter (supports comma-separated)
  if (seniorityParam) {
    const list = seniorityParam
      .split(",")
      .map((s) => s.trim())
      .filter((s) => ALLOWED_SENIORITY.has(s)) as ("junior" | "mid" | "senior" | "staff" | "principal")[];
    if (list.length === 1) {
      whereParts.push(eq(candidates.seniority, list[0]));
    } else if (list.length > 1) {
      whereParts.push(inArray(candidates.seniority, list));
    }
  }

  // Region filter (supports comma-separated)
  if (regionParam) {
    const list = regionParam
      .split(",")
      .map((r) => r.trim())
      .filter((r) => ALLOWED_REGION.has(r)) as ("us" | "ca" | "uk" | "eu" | "other")[];
    if (list.length === 1) {
      whereParts.push(eq(candidates.region, list[0]));
    } else if (list.length > 1) {
      whereParts.push(inArray(candidates.region, list));
    }
  }

  // Verification filter
  if (verificationParam && ALLOWED_VERIFICATION.has(verificationParam)) {
    whereParts.push(
      eq(candidates.verification, verificationParam as "unverified")
    );
  }

  // Hourly rate range
  if (rateMinStr && Number.isFinite(Number(rateMinStr))) {
    whereParts.push(gte(candidates.hourlyRateUsd, Number(rateMinStr)));
  }
  if (rateMaxStr && Number.isFinite(Number(rateMaxStr))) {
    whereParts.push(lte(candidates.hourlyRateUsd, Number(rateMaxStr)));
  }

  const candidateRows = await db
    .select()
    .from(candidates)
    .where(and(...whereParts))
    .orderBy(desc(candidates.createdAt));

  // Fetch all skills for candidates owned by user
  const allCandidateSkills = await db
    .select({
      id: skillMatrices.id,
      candidateId: skillMatrices.candidateId,
      skillId: skillMatrices.skillId,
      proficiency: skillMatrices.proficiency,
      yearsUsed: skillMatrices.yearsUsed,
      notes: skillMatrices.notes,
      name: skillDefinitions.name,
      slug: skillDefinitions.slug,
      categoryName: skillCategories.name,
      categorySlug: skillCategories.slug,
      categoryColor: skillCategories.color,
    })
    .from(skillMatrices)
    .innerJoin(skillDefinitions, eq(skillDefinitions.id, skillMatrices.skillId))
    .innerJoin(skillCategories, eq(skillCategories.id, skillDefinitions.categoryId))
    .innerJoin(candidates, eq(candidates.id, skillMatrices.candidateId))
    .where(
      orgCtx
        ? eq(candidates.orgId, orgCtx.org.id)
        : eq(candidates.ownerId, user.id)
    );

  const skillMap = new Map<
    number,
    Array<{
      id: number;
      skillId: number;
      name: string;
      slug: string;
      proficiency: string;
      yearsUsed: number;
      categoryName: string;
      categorySlug: string;
      categoryColor: string;
      notes: string | null;
    }>
  >();

  for (const s of allCandidateSkills) {
    const list = skillMap.get(s.candidateId) ?? [];
    list.push(s);
    skillMap.set(s.candidateId, list);
  }

  // In-memory filter on aggregated skills if query param present
  let results = candidateRows;
  if (skillsParam || frameworkParam) {
    const searchSkills = (skillsParam || frameworkParam)
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    results = candidateRows.filter((c) => {
      const cSkills = skillMap.get(c.id) ?? [];
      return searchSkills.some((term) =>
        cSkills.some(
          (cs) =>
            cs.slug.toLowerCase() === term ||
            cs.name.toLowerCase().includes(term) ||
            cs.categorySlug.toLowerCase() === term
        )
      );
    });
  }

  // Availability status filter (requires querying current availabilities)
  if (availabilityParam && ALLOWED_AVAILABILITY.has(availabilityParam)) {
    const availRows = await db
      .select({ candidateId: availabilities.candidateId })
      .from(availabilities)
      .where(
        eq(
          availabilities.status,
          availabilityParam as "available" | "limited" | "booked" | "on-leave"
        )
      );
    const validCandidateIds = new Set(availRows.map((a) => a.candidateId));
    results = results.filter((c) => validCandidateIds.has(c.id));
  }

  return Response.json({
    candidates: results.map((c) => ({
      ...c,
      skills: skillMap.get(c.id) ?? [],
    })),
  });
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuthJson();
  if (error) return error;

  await ensureSkillTables();
  const orgCtx = await getOrgContext().catch(() => null);

  const body = await getJsonBody<{
    fullName?: string;
    headline?: string;
    email?: string;
    phone?: string;
    location?: string;
    region?: string;
    timezone?: string;
    timezoneOverlap?: string;
    seniority?: string;
    yearsExperience?: number;
    hourlyRateUsd?: number;
    verification?: string;
    bio?: string;
    portfolioUrl?: string;
    githubUrl?: string;
    linkedinUrl?: string;
    tags?: string[];
    skills?: Array<{
      skillId?: number;
      slug?: string;
      name?: string;
      proficiency?: "learning" | "working" | "strong" | "expert";
      yearsUsed?: number;
    }>;
  }>(req);

  if (!body) return jsonError("Invalid JSON body");
  if (!body.fullName?.trim()) return jsonError("Full name is required");
  if (!body.email?.trim()) return jsonError("Email is required");
  if (!body.headline?.trim()) return jsonError("Headline is required");
  if (!body.location?.trim()) return jsonError("Location is required");
  if (!body.timezone?.trim()) return jsonError("Timezone is required");
  if (!body.timezoneOverlap?.trim())
    return jsonError("Timezone overlap is required");

  const seniority = ALLOWED_SENIORITY.has(body.seniority ?? "")
    ? (body.seniority as "junior")
    : "mid";
  const region = ALLOWED_REGION.has(body.region ?? "")
    ? (body.region as "us")
    : "us";
  const verification = ALLOWED_VERIFICATION.has(body.verification ?? "")
    ? (body.verification as "unverified")
    : "pending";

  const [created] = await db
    .insert(candidates)
    .values({
      ownerId: user.id,
      orgId: orgCtx?.org.id ?? null,
      fullName: body.fullName.trim(),
      headline: body.headline.trim(),
      email: body.email.trim().toLowerCase(),
      phone: body.phone?.trim() || null,
      location: body.location.trim(),
      region,
      timezone: body.timezone.trim(),
      timezoneOverlap: body.timezoneOverlap.trim(),
      seniority,
      yearsExperience: Math.max(0, Math.floor(body.yearsExperience ?? 0)),
      hourlyRateUsd: Math.max(0, Math.floor(body.hourlyRateUsd ?? 0)),
      verification,
      bio: body.bio?.trim() ?? "",
      portfolioUrl: body.portfolioUrl?.trim() || null,
      githubUrl: body.githubUrl?.trim() || null,
      linkedinUrl: body.linkedinUrl?.trim() || null,
      tags: Array.isArray(body.tags) ? body.tags : [],
      avatarColor: pickColor(body.email),
    })
    .returning();

  // Attach skills if provided
  if (Array.isArray(body.skills) && body.skills.length > 0) {
    for (const s of body.skills) {
      let skillId = s.skillId;
      if (!skillId && (s.slug || s.name)) {
        const slug = (s.slug || s.name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
        const [def] = await db
          .select()
          .from(skillDefinitions)
          .where(eq(skillDefinitions.slug, slug))
          .limit(1);
        if (def) skillId = def.id;
      }
      if (skillId) {
        await db.insert(skillMatrices).values({
          candidateId: created.id,
          skillId,
          proficiency: s.proficiency || "working",
          yearsUsed: Math.max(0, Math.floor(s.yearsUsed ?? 1)),
        });
      }
    }
  }

  if (orgCtx) {
    logAudit({
      orgId: orgCtx.org.id,
      actorId: user.id,
      actorName: user.name,
      actorEmail: user.email,
      targetType: "candidate",
      targetId: created.id,
      targetTitle: created.fullName,
      action: "create",
      metadata: {
        seniority: created.seniority,
        region: created.region,
        rate: created.hourlyRateUsd,
      },
    });
  }

  return Response.json({ candidate: created }, { status: 201 });
}
