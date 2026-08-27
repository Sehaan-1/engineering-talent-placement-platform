import { db } from "@/db";
import { skillCategories, skillDefinitions } from "@/db/schema";
import { requireAuthJson, getJsonBody, jsonError } from "@/lib/types";
import { eq, asc } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { ensureSkillTables, seedSkillDefinitions } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET() {
  const { error } = await requireAuthJson();
  if (error) return error;

  await ensureSkillTables();
  await seedSkillDefinitions();

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
      icon: skillDefinitions.icon,
      categoryName: skillCategories.name,
      categorySlug: skillCategories.slug,
      categoryColor: skillCategories.color,
    })
    .from(skillDefinitions)
    .innerJoin(skillCategories, eq(skillCategories.id, skillDefinitions.categoryId))
    .orderBy(asc(skillDefinitions.name));

  const categoriesWithDefinitions = categories.map((cat) => ({
    ...cat,
    definitions: definitions.filter((d) => d.categoryId === cat.id),
  }));

  return Response.json({
    categories: categoriesWithDefinitions,
    definitions,
  });
}

export async function POST(req: NextRequest) {
  const { error } = await requireAuthJson();
  if (error) return error;

  await ensureSkillTables();

  const body = await getJsonBody<{
    name?: string;
    slug?: string;
    categoryId?: number;
    categorySlug?: string;
    categoryName?: string;
    icon?: string;
  }>(req);

  if (!body || !body.name?.trim()) {
    return jsonError("Skill name is required");
  }

  const name = body.name.trim();
  const slug = (body.slug?.trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, "-")).replace(/^-+|-+$/g, "");

  // Check if skill definition with slug already exists
  const existing = await db
    .select()
    .from(skillDefinitions)
    .where(eq(skillDefinitions.slug, slug))
    .limit(1);

  if (existing[0]) {
    return Response.json({ definition: existing[0] });
  }

  let categoryId = body.categoryId;

  if (!categoryId && body.categorySlug) {
    const catRow = await db
      .select()
      .from(skillCategories)
      .where(eq(skillCategories.slug, body.categorySlug))
      .limit(1);
    if (catRow[0]) {
      categoryId = catRow[0].id;
    }
  }

  if (!categoryId) {
    // Default to 'frontend' or first category
    const fallback = await db
      .select()
      .from(skillCategories)
      .where(eq(skillCategories.slug, "frontend"))
      .limit(1);
    if (fallback[0]) {
      categoryId = fallback[0].id;
    } else {
      const anyCat = await db.select().from(skillCategories).limit(1);
      if (anyCat[0]) {
        categoryId = anyCat[0].id;
      }
    }
  }

  if (!categoryId) {
    const [newCat] = await db
      .insert(skillCategories)
      .values({
        name: body.categoryName || "General",
        slug: body.categorySlug || "general",
        color: "#6366f1",
      })
      .returning();
    categoryId = newCat.id;
  }

  const [created] = await db
    .insert(skillDefinitions)
    .values({
      categoryId,
      name,
      slug,
      icon: body.icon?.trim() || null,
    })
    .returning();

  return Response.json({ definition: created }, { status: 201 });
}
