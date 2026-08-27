import { requireCandidate } from "@/lib/auth";
import { db } from "@/db";
import {
  skillMatrices,
  skillDefinitions,
  skillCategories,
} from "@/db/schema";
import { eq, desc, asc } from "drizzle-orm";
import CandidateProfileView from "./CandidateProfileView";

export const dynamic = "force-dynamic";

export default async function CandidateProfilePage() {
  const { candidate } = await requireCandidate();

  const [currentSkills, allSkillDefs, allCategories] = await Promise.all([
    db
      .select({
        matrix: skillMatrices,
        definition: skillDefinitions,
        category: skillCategories,
      })
      .from(skillMatrices)
      .innerJoin(
        skillDefinitions,
        eq(skillDefinitions.id, skillMatrices.skillId)
      )
      .leftJoin(
        skillCategories,
        eq(skillCategories.id, skillDefinitions.categoryId)
      )
      .where(eq(skillMatrices.candidateId, candidate.id))
      .orderBy(desc(skillMatrices.lastUsedAt)),
    db
      .select({
        id: skillDefinitions.id,
        name: skillDefinitions.name,
        slug: skillDefinitions.slug,
        categoryId: skillDefinitions.categoryId,
      })
      .from(skillDefinitions)
      .orderBy(asc(skillDefinitions.name)),
    db
      .select()
      .from(skillCategories)
      .orderBy(asc(skillCategories.name)),
  ]);

  return (
    <CandidateProfileView
      candidate={{
        ...candidate,
        createdAt: candidate.createdAt.toISOString(),
        updatedAt: candidate.updatedAt.toISOString(),
      }}
      skills={currentSkills.map((s) => ({
        id: s.matrix.id,
        skillId: s.matrix.skillId,
        name: s.definition.name,
        slug: s.definition.slug,
        categoryName: s.category?.name,
        categoryColor: s.category?.color,
        proficiency: s.matrix.proficiency,
        yearsUsed: s.matrix.yearsUsed,
        notes: s.matrix.notes,
        lastUsedAt: s.matrix.lastUsedAt.toISOString(),
      }))}
      allSkillDefs={allSkillDefs}
      categories={allCategories}
    />
  );
}
