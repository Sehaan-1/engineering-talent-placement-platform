import { db } from "@/db";
import {
  candidates,
  skillCategories,
  skillDefinitions,
  skillMatrices,
  availabilities,
  placements,
  interviews,
} from "@/db/schema";
import { requireAuthJson, getJsonBody, jsonError } from "@/lib/types";
import { and, eq, desc, or } from "drizzle-orm";
import { getOrgContext } from "@/lib/org";
import { logAudit, computeDiff } from "@/lib/audit";
import type { NextRequest } from "next/server";

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

async function getAccessibleCandidate(id: number, userId: number, orgId?: number) {
  const condition = orgId
    ? or(eq(candidates.orgId, orgId), eq(candidates.ownerId, userId))
    : eq(candidates.ownerId, userId);

  const rows = await db
    .select()
    .from(candidates)
    .where(and(eq(candidates.id, id), condition!))
    .limit(1);
  return rows[0] ?? null;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuthJson();
  if (error) return error;
  const orgCtx = await getOrgContext().catch(() => null);

  const { id } = await params;
  const candidateId = Number(id);
  if (!Number.isFinite(candidateId)) return jsonError("Invalid id");
  const candidate = await getAccessibleCandidate(candidateId, user.id, orgCtx?.org.id);
  if (!candidate) return jsonError("Candidate not found", 404);

  const [skills, availability, candidatePlacements] = await Promise.all([
    db
      .select({
        id: skillMatrices.id,
        candidateId: skillMatrices.candidateId,
        skillId: skillMatrices.skillId,
        proficiency: skillMatrices.proficiency,
        yearsUsed: skillMatrices.yearsUsed,
        lastUsedAt: skillMatrices.lastUsedAt,
        notes: skillMatrices.notes,
        name: skillDefinitions.name,
        slug: skillDefinitions.slug,
        framework: skillDefinitions.slug, // legacy compat
        categoryName: skillCategories.name,
        categorySlug: skillCategories.slug,
        categoryColor: skillCategories.color,
      })
      .from(skillMatrices)
      .innerJoin(skillDefinitions, eq(skillDefinitions.id, skillMatrices.skillId))
      .innerJoin(skillCategories, eq(skillCategories.id, skillDefinitions.categoryId))
      .where(eq(skillMatrices.candidateId, candidateId))
      .orderBy(desc(skillMatrices.lastUsedAt)),
    db.select().from(availabilities).where(eq(availabilities.candidateId, candidateId)),
    db.select().from(placements).where(eq(placements.candidateId, candidateId)),
  ]);

  const placementIds = candidatePlacements.map((p) => p.id);
  const interviewRows = placementIds.length
    ? await db
        .select()
        .from(interviews)
        .where(eq(interviews.candidateId, candidateId))
    : [];

  return Response.json({
    candidate,
    skills,
    availability,
    placements: candidatePlacements,
    interviews: interviewRows,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuthJson();
  if (error) return error;
  const orgCtx = await getOrgContext().catch(() => null);

  const { id } = await params;
  const candidateId = Number(id);
  if (!Number.isFinite(candidateId)) return jsonError("Invalid id");
  const existing = await getAccessibleCandidate(candidateId, user.id, orgCtx?.org.id);
  if (!existing) return jsonError("Candidate not found", 404);

  const body = await getJsonBody<Record<string, unknown>>(req);
  if (!body) return jsonError("Invalid JSON body");

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof body.fullName === "string" && body.fullName.trim()) {
    patch.fullName = body.fullName.trim();
  }
  if (typeof body.headline === "string" && body.headline.trim()) {
    patch.headline = body.headline.trim();
  }
  if (typeof body.email === "string" && body.email.trim()) {
    patch.email = body.email.trim().toLowerCase();
  }
  if (typeof body.phone === "string") patch.phone = body.phone.trim() || null;
  if (typeof body.location === "string" && body.location.trim()) {
    patch.location = body.location.trim();
  }
  if (typeof body.region === "string" && ALLOWED_REGION.has(body.region)) {
    patch.region = body.region;
  }
  if (typeof body.timezone === "string" && body.timezone.trim()) {
    patch.timezone = body.timezone.trim();
  }
  if (typeof body.timezoneOverlap === "string" && body.timezoneOverlap.trim()) {
    patch.timezoneOverlap = body.timezoneOverlap.trim();
  }
  if (typeof body.seniority === "string" && ALLOWED_SENIORITY.has(body.seniority)) {
    patch.seniority = body.seniority;
  }
  if (typeof body.yearsExperience === "number") {
    patch.yearsExperience = Math.max(0, Math.floor(body.yearsExperience));
  }
  if (typeof body.hourlyRateUsd === "number") {
    patch.hourlyRateUsd = Math.max(0, Math.floor(body.hourlyRateUsd));
  }
  if (
    typeof body.verification === "string" &&
    ALLOWED_VERIFICATION.has(body.verification)
  ) {
    patch.verification = body.verification;
  }
  if (typeof body.bio === "string") patch.bio = body.bio;
  if (typeof body.portfolioUrl === "string")
    patch.portfolioUrl = body.portfolioUrl.trim() || null;
  if (typeof body.githubUrl === "string")
    patch.githubUrl = body.githubUrl.trim() || null;
  if (typeof body.linkedinUrl === "string")
    patch.linkedinUrl = body.linkedinUrl.trim() || null;
  if (Array.isArray(body.tags)) patch.tags = body.tags as string[];

  const [updated] = await db
    .update(candidates)
    .set(patch)
    .where(eq(candidates.id, candidateId))
    .returning();

  if (orgCtx) {
    const action =
      body.verification && body.verification !== existing.verification
        ? "verify"
        : "update";

    logAudit({
      orgId: orgCtx.org.id,
      actorId: user.id,
      actorName: user.name,
      actorEmail: user.email,
      targetType: "candidate",
      targetId: candidateId,
      targetTitle: updated.fullName,
      action,
      diff: computeDiff(existing, updated),
    });
  }

  return Response.json({ candidate: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuthJson();
  if (error) return error;
  const orgCtx = await getOrgContext().catch(() => null);

  const { id } = await params;
  const candidateId = Number(id);
  if (!Number.isFinite(candidateId)) return jsonError("Invalid id");
  const existing = await getAccessibleCandidate(candidateId, user.id, orgCtx?.org.id);
  if (!existing) return jsonError("Candidate not found", 404);

  await db.delete(candidates).where(eq(candidates.id, candidateId));

  if (orgCtx) {
    logAudit({
      orgId: orgCtx.org.id,
      actorId: user.id,
      actorName: user.name,
      actorEmail: user.email,
      targetType: "candidate",
      targetId: candidateId,
      targetTitle: existing.fullName,
      action: "delete",
    });
  }

  return Response.json({ ok: true });
}
