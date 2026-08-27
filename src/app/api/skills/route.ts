import { db } from "@/db";
import { candidates, skillCategories, skillDefinitions, skillMatrices } from "@/db/schema";
import { requireAuthJson, getJsonBody, jsonError } from "@/lib/types";
import { and, eq, desc, asc } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { ensureSkillTables } from "@/lib/seed";

export const dynamic = "force-dynamic";

const ALLOWED_PROFICIENCY = new Set([
  "learning",
  "working",
  "strong",
  "expert",
]);

async function ownsCandidate(candidateId: number, userId: number) {
  const rows = await db
    .select({ id: candidates.id })
    .from(candidates)
    .where(and(eq(candidates.id, candidateId), eq(candidates.ownerId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuthJson();
  if (error) return error;

  await ensureSkillTables();

  const url = new URL(req.url);
  const candidateIdStr = url.searchParams.get("candidateId");

  if (!candidateIdStr) {
    // Return all skill definitions with categories
    const rows = await db
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

    return Response.json({ definitions: rows });
  }

  const candidateId = Number(candidateIdStr);
  if (!Number.isFinite(candidateId)) return jsonError("candidateId required");
  const owned = await ownsCandidate(candidateId, user.id);
  if (!owned) return jsonError("Candidate not found", 404);

  const rows = await db
    .select({
      id: skillMatrices.id,
      candidateId: skillMatrices.candidateId,
      skillId: skillMatrices.skillId,
      proficiency: skillMatrices.proficiency,
      yearsUsed: skillMatrices.yearsUsed,
      lastUsedAt: skillMatrices.lastUsedAt,
      notes: skillMatrices.notes,
      skillName: skillDefinitions.name,
      skillSlug: skillDefinitions.slug,
      categoryName: skillCategories.name,
      categorySlug: skillCategories.slug,
      categoryColor: skillCategories.color,
    })
    .from(skillMatrices)
    .innerJoin(skillDefinitions, eq(skillDefinitions.id, skillMatrices.skillId))
    .innerJoin(skillCategories, eq(skillCategories.id, skillDefinitions.categoryId))
    .where(eq(skillMatrices.candidateId, candidateId))
    .orderBy(desc(skillMatrices.lastUsedAt));

  return Response.json({ skills: rows });
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuthJson();
  if (error) return error;

  await ensureSkillTables();

  const body = await getJsonBody<{
    candidateId?: number;
    skillId?: number;
    skillName?: string;
    framework?: string;
    categorySlug?: string;
    proficiency?: string;
    yearsUsed?: number;
    notes?: string;
  }>(req);

  if (!body) return jsonError("Invalid JSON body");
  const candidateId = Number(body.candidateId);
  if (!Number.isFinite(candidateId)) return jsonError("candidateId required");

  const owned = await ownsCandidate(candidateId, user.id);
  if (!owned) return jsonError("Candidate not found", 404);

  if (!body.proficiency || !ALLOWED_PROFICIENCY.has(body.proficiency)) {
    return jsonError("Invalid proficiency");
  }

  let skillId = body.skillId ? Number(body.skillId) : null;

  // If skillId not directly given, look up by skillName or framework/slug
  if (!skillId) {
    const rawName = body.skillName?.trim() || body.framework?.trim();
    if (!rawName) return jsonError("Skill definition or name required");

    const slug = rawName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

    const existingDef = await db
      .select()
      .from(skillDefinitions)
      .where(eq(skillDefinitions.slug, slug))
      .limit(1);

    if (existingDef[0]) {
      skillId = existingDef[0].id;
    } else {
      // Find category
      let categoryId: number | null = null;
      if (body.categorySlug) {
        const cat = await db
          .select()
          .from(skillCategories)
          .where(eq(skillCategories.slug, body.categorySlug))
          .limit(1);
        if (cat[0]) categoryId = cat[0].id;
      }
      if (!categoryId) {
        const fallbackCat = await db.select().from(skillCategories).limit(1);
        if (fallbackCat[0]) categoryId = fallbackCat[0].id;
      }

      if (!categoryId) {
        const [newCat] = await db
          .insert(skillCategories)
          .values({
            name: "Frontend",
            slug: "frontend",
            color: "#3b82f6",
          })
          .returning();
        categoryId = newCat.id;
      }

      const [newDef] = await db
        .insert(skillDefinitions)
        .values({
          categoryId,
          name: rawName,
          slug,
        })
        .returning();
      skillId = newDef.id;
    }
  }

  const [created] = await db
    .insert(skillMatrices)
    .values({
      candidateId,
      skillId,
      proficiency: body.proficiency as "learning",
      yearsUsed: Math.max(0, Math.floor(body.yearsUsed ?? 0)),
      notes: body.notes?.trim() ?? "",
    })
    .returning();

  // Fetch with joined info
  const [enriched] = await db
    .select({
      id: skillMatrices.id,
      candidateId: skillMatrices.candidateId,
      skillId: skillMatrices.skillId,
      proficiency: skillMatrices.proficiency,
      yearsUsed: skillMatrices.yearsUsed,
      lastUsedAt: skillMatrices.lastUsedAt,
      notes: skillMatrices.notes,
      skillName: skillDefinitions.name,
      skillSlug: skillDefinitions.slug,
      categoryName: skillCategories.name,
      categorySlug: skillCategories.slug,
      categoryColor: skillCategories.color,
    })
    .from(skillMatrices)
    .innerJoin(skillDefinitions, eq(skillDefinitions.id, skillMatrices.skillId))
    .innerJoin(skillCategories, eq(skillCategories.id, skillDefinitions.categoryId))
    .where(eq(skillMatrices.id, created.id))
    .limit(1);

  return Response.json({ skill: enriched || created }, { status: 201 });
}
