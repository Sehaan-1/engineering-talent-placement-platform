import CandidatesView from "./CandidatesView";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import {
  candidates,
  skillCategories,
  skillDefinitions,
  skillMatrices,
  availabilities,
} from "@/db/schema";
import { and, desc, eq, or, ilike, gte, lte, inArray, sql, asc } from "drizzle-orm";
import { ensureSkillTables, seedSkillDefinitions } from "@/lib/seed";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  q?: string;
  skills?: string;
  framework?: string;
  seniority?: string;
  region?: string;
  rateMin?: string;
  rateMax?: string;
  availability?: string;
  verification?: string;
  new?: string;
}>;

export default async function CandidatesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  await ensureSkillTables();
  await seedSkillDefinitions();

  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const skillsParam = sp.skills?.trim() ?? "";
  const frameworkParam = sp.framework?.trim() ?? "";
  const seniority = sp.seniority?.trim() ?? "";
  const region = sp.region?.trim() ?? "";
  const rateMin = sp.rateMin?.trim() ?? "";
  const rateMax = sp.rateMax?.trim() ?? "";
  const availability = sp.availability?.trim() ?? "";
  const verification = sp.verification?.trim() ?? "";

  // Available skills for filter picker
  const availableSkillDefs = await db
    .select({
      id: skillDefinitions.id,
      name: skillDefinitions.name,
      slug: skillDefinitions.slug,
      categoryName: skillCategories.name,
      categoryColor: skillCategories.color,
    })
    .from(skillDefinitions)
    .innerJoin(skillCategories, eq(skillCategories.id, skillDefinitions.categoryId))
    .orderBy(asc(skillDefinitions.name));

  const whereParts = [eq(candidates.ownerId, user.id)];

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

  if (seniority) {
    const list = seniority.split(",").map((s) => s.trim()).filter(Boolean);
    if (list.length === 1) {
      whereParts.push(eq(candidates.seniority, list[0] as "junior"));
    } else if (list.length > 1) {
      whereParts.push(inArray(candidates.seniority, list as ("junior" | "mid" | "senior" | "staff" | "principal")[]));
    }
  }

  if (region) {
    const list = region.split(",").map((r) => r.trim()).filter(Boolean);
    if (list.length === 1) {
      whereParts.push(eq(candidates.region, list[0] as "us"));
    } else if (list.length > 1) {
      whereParts.push(inArray(candidates.region, list as ("us" | "ca" | "uk" | "eu" | "other")[]));
    }
  }

  if (verification && ["unverified", "pending", "verified", "rejected"].includes(verification)) {
    whereParts.push(eq(candidates.verification, verification as "unverified"));
  }

  if (rateMin && Number.isFinite(Number(rateMin))) {
    whereParts.push(gte(candidates.hourlyRateUsd, Number(rateMin)));
  }

  if (rateMax && Number.isFinite(Number(rateMax))) {
    whereParts.push(lte(candidates.hourlyRateUsd, Number(rateMax)));
  }

  const rows = await db
    .select()
    .from(candidates)
    .where(and(...whereParts))
    .orderBy(desc(candidates.createdAt));

  const allSkills = await db
    .select({
      id: skillMatrices.id,
      candidateId: skillMatrices.candidateId,
      skillId: skillMatrices.skillId,
      proficiency: skillMatrices.proficiency,
      yearsUsed: skillMatrices.yearsUsed,
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
    .where(eq(candidates.ownerId, user.id));

  const skillMap = new Map<
    number,
    Array<{
      id: number;
      skillId: number;
      name: string;
      slug: string;
      framework?: string;
      proficiency: string;
      yearsUsed: number;
      categoryName: string;
      categorySlug: string;
      categoryColor: string;
    }>
  >();

  for (const row of allSkills) {
    const arr = skillMap.get(row.candidateId) ?? [];
    arr.push({
      ...row,
      framework: row.slug,
    });
    skillMap.set(row.candidateId, arr);
  }

  let filtered = rows;

  const targetSkills = (skillsParam || frameworkParam)
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  if (targetSkills.length > 0) {
    filtered = filtered.filter((c) => {
      const cSkills = skillMap.get(c.id) ?? [];
      const cSlugs = new Set(cSkills.map((s) => s.slug.toLowerCase()));
      const cNames = new Set(cSkills.map((s) => s.name.toLowerCase()));
      return targetSkills.some((target) => cSlugs.has(target) || cNames.has(target));
    });
  }

  if (availability && ["available", "limited", "booked", "on-leave"].includes(availability)) {
    const availRows = await db
      .select({ candidateId: availabilities.candidateId })
      .from(availabilities)
      .where(eq(availabilities.status, availability as "available"));
    const availSet = new Set(availRows.map((a) => a.candidateId));
    filtered = filtered.filter((c) => availSet.has(c.id));
  }

  return (
    <CandidatesView
      candidates={filtered.map((c) => ({
        ...c,
        skills: skillMap.get(c.id) ?? [],
      }))}
      availableSkills={availableSkillDefs}
      filters={{
        q,
        skills: skillsParam,
        framework: frameworkParam,
        seniority,
        region,
        rateMin,
        rateMax,
        availability,
        verification,
      }}
      openNew={sp.new === "1"}
    />
  );
}
