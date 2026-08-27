import SkillsView from "./SkillsView";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { candidates, skillCategories, skillDefinitions, skillMatrices } from "@/db/schema";
import { eq, sql, asc } from "drizzle-orm";
import { ensureSkillTables, seedSkillDefinitions } from "@/lib/seed";

export const dynamic = "force-dynamic";

export default async function SkillsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  await ensureSkillTables();
  await seedSkillDefinitions();

  const allSkills = await db
    .select({
      id: skillMatrices.id,
      candidateId: candidates.id,
      candidateName: candidates.fullName,
      candidateHeadline: candidates.headline,
      avatarColor: candidates.avatarColor,
      skillId: skillMatrices.skillId,
      name: skillDefinitions.name,
      slug: skillDefinitions.slug,
      categoryName: skillCategories.name,
      categorySlug: skillCategories.slug,
      categoryColor: skillCategories.color,
      proficiency: skillMatrices.proficiency,
      yearsUsed: skillMatrices.yearsUsed,
    })
    .from(skillMatrices)
    .innerJoin(skillDefinitions, eq(skillDefinitions.id, skillMatrices.skillId))
    .innerJoin(skillCategories, eq(skillCategories.id, skillDefinitions.categoryId))
    .innerJoin(candidates, eq(candidates.id, skillMatrices.candidateId))
    .where(eq(candidates.ownerId, user.id));

  const categories = await db
    .select()
    .from(skillCategories)
    .orderBy(asc(skillCategories.id));

  const definitions = await db
    .select({
      id: skillDefinitions.id,
      categoryId: skillDefinitions.categoryId,
      name: skillDefinitions.name,
      slug: skillDefinitions.slug,
      categoryName: skillCategories.name,
      categorySlug: skillCategories.slug,
      categoryColor: skillCategories.color,
    })
    .from(skillDefinitions)
    .innerJoin(skillCategories, eq(skillCategories.id, skillDefinitions.categoryId))
    .orderBy(asc(skillDefinitions.name));

  const counts = await db
    .select({
      skillSlug: skillDefinitions.slug,
      c: sql<number>`count(*)::int`,
    })
    .from(skillMatrices)
    .innerJoin(skillDefinitions, eq(skillDefinitions.id, skillMatrices.skillId))
    .innerJoin(candidates, eq(candidates.id, skillMatrices.candidateId))
    .where(eq(candidates.ownerId, user.id))
    .groupBy(skillDefinitions.slug);

  return (
    <SkillsView
      skills={allSkills.map((s) => ({
        id: s.id,
        skillId: s.skillId,
        name: s.name,
        slug: s.slug,
        categoryName: s.categoryName,
        categorySlug: s.categorySlug,
        categoryColor: s.categoryColor,
        proficiency: s.proficiency,
        yearsUsed: s.yearsUsed,
        candidate: {
          id: s.candidateId,
          fullName: s.candidateName,
          headline: s.candidateHeadline,
          avatarColor: s.avatarColor,
        },
      }))}
      categories={categories}
      definitions={definitions}
      counts={Object.fromEntries(counts.map((c) => [c.skillSlug, Number(c.c)]))}
    />
  );
}
