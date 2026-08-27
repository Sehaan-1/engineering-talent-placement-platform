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
import { requireAuthJson } from "@/lib/types";
import { eq, sql, and, gte, desc } from "drizzle-orm";
import { ensureSkillTables } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET() {
  const { user, error } = await requireAuthJson();
  if (error) return error;

  await ensureSkillTables();

  const [candCount, availRows, placementRows, interviewRows, skillRows, categoryRows] =
    await Promise.all([
      db
        .select({ c: sql<number>`count(*)::int` })
        .from(candidates)
        .where(eq(candidates.ownerId, user.id)),
      db
        .select({
          status: availabilities.status,
          c: sql<number>`count(*)::int`,
        })
        .from(availabilities)
        .innerJoin(candidates, eq(candidates.id, availabilities.candidateId))
        .where(eq(candidates.ownerId, user.id))
        .groupBy(availabilities.status),
      db
        .select({
          status: placements.status,
          c: sql<number>`count(*)::int`,
          v: sql<number>`coalesce(sum(${placements.valueUsd}),0)::int`,
        })
        .from(placements)
        .innerJoin(candidates, eq(candidates.id, placements.candidateId))
        .where(eq(candidates.ownerId, user.id))
        .groupBy(placements.status),
      db
        .select({ id: interviews.id })
        .from(interviews)
        .innerJoin(candidates, eq(candidates.id, interviews.candidateId))
        .where(
          and(
            eq(candidates.ownerId, user.id),
            gte(interviews.scheduledAt, new Date()),
            eq(interviews.outcome, "scheduled")
          )
        ),
      db
        .select({
          skillId: skillMatrices.skillId,
          skillName: skillDefinitions.name,
          skillSlug: skillDefinitions.slug,
          categoryName: skillCategories.name,
          categoryColor: skillCategories.color,
          c: sql<number>`count(*)::int`,
        })
        .from(skillMatrices)
        .innerJoin(skillDefinitions, eq(skillDefinitions.id, skillMatrices.skillId))
        .innerJoin(skillCategories, eq(skillCategories.id, skillDefinitions.categoryId))
        .innerJoin(candidates, eq(candidates.id, skillMatrices.candidateId))
        .where(eq(candidates.ownerId, user.id))
        .groupBy(
          skillMatrices.skillId,
          skillDefinitions.name,
          skillDefinitions.slug,
          skillCategories.name,
          skillCategories.color
        )
        .orderBy(desc(sql`count(*)`)),
      db
        .select({
          categoryName: skillCategories.name,
          categoryColor: skillCategories.color,
          c: sql<number>`count(*)::int`,
        })
        .from(skillMatrices)
        .innerJoin(skillDefinitions, eq(skillDefinitions.id, skillMatrices.skillId))
        .innerJoin(skillCategories, eq(skillCategories.id, skillDefinitions.categoryId))
        .innerJoin(candidates, eq(candidates.id, skillMatrices.candidateId))
        .where(eq(candidates.ownerId, user.id))
        .groupBy(skillCategories.name, skillCategories.color),
    ]);

  const pipelineValue = placementRows
    .filter((p) => p.status !== "placed" && p.status !== "archived")
    .reduce((sum, p) => sum + Number(p.v ?? 0), 0);
  const placedValue = placementRows
    .filter((p) => p.status === "placed")
    .reduce((sum, p) => sum + Number(p.v ?? 0), 0);

  return Response.json({
    counts: {
      candidates: Number(candCount[0]?.c ?? 0),
      upcomingInterviews: interviewRows.length,
    },
    pipelineValue,
    placedValue,
    availabilityByStatus: Object.fromEntries(
      availRows.map((a) => [a.status, Number(a.c)])
    ),
    placementsByStatus: Object.fromEntries(
      placementRows.map((p) => [p.status, { count: Number(p.c), value: Number(p.v) }])
    ),
    skillsByFramework: Object.fromEntries(
      skillRows.map((s) => [s.skillSlug, Number(s.c)])
    ),
    skillsByDefinition: skillRows.map((s) => ({
      name: s.skillName,
      slug: s.skillSlug,
      categoryName: s.categoryName,
      categoryColor: s.categoryColor,
      count: Number(s.c),
    })),
    skillsByCategory: Object.fromEntries(
      categoryRows.map((c) => [c.categoryName, Number(c.c)])
    ),
  });
}
