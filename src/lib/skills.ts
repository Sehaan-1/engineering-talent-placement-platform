import { db } from "@/db";
import { skillDefinitions, skillCategories } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { unstable_cache } from "next/cache";

export const getSkillDefinitions = unstable_cache(
  async () => {
    return db
      .select({
        id: skillDefinitions.id,
        categoryId: skillDefinitions.categoryId,
        name: skillDefinitions.name,
        slug: skillDefinitions.slug,
        icon: skillDefinitions.icon,
        categoryName: skillCategories.name,
        categorySlug: skillCategories.slug,
        categoryColor: skillCategories.color,
      })
      .from(skillDefinitions)
      .innerJoin(
        skillCategories,
        eq(skillCategories.id, skillDefinitions.categoryId)
      )
      .orderBy(asc(skillDefinitions.name));
  },
  ["skill-definitions-cache"],
  { revalidate: 3600, tags: ["skills"] }
);
