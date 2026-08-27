import { db } from "@/db";
import { candidates, skillCategories, skillDefinitions, skillMatrices } from "@/db/schema";
import { requireAuthJson, getJsonBody, jsonError } from "@/lib/types";
import { and, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const ALLOWED_PROFICIENCY = new Set([
  "learning",
  "working",
  "strong",
  "expert",
]);

async function ownsSkill(skillId: number, userId: number) {
  const rows = await db
    .select({ id: skillMatrices.id })
    .from(skillMatrices)
    .innerJoin(candidates, eq(candidates.id, skillMatrices.candidateId))
    .where(and(eq(skillMatrices.id, skillId), eq(candidates.ownerId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuthJson();
  if (error) return error;
  const { id } = await params;
  const skillId = Number(id);
  if (!Number.isFinite(skillId)) return jsonError("Invalid id");
  const owned = await ownsSkill(skillId, user.id);
  if (!owned) return jsonError("Skill not found", 404);

  const body = await getJsonBody<Record<string, unknown>>(req);
  if (!body) return jsonError("Invalid JSON body");

  const patch: Record<string, unknown> = {
    lastUsedAt: new Date(),
  };

  if (typeof body.skillId === "number") {
    patch.skillId = body.skillId;
  }
  if (
    typeof body.proficiency === "string" &&
    ALLOWED_PROFICIENCY.has(body.proficiency)
  ) {
    patch.proficiency = body.proficiency;
  }
  if (typeof body.yearsUsed === "number") {
    patch.yearsUsed = Math.max(0, Math.floor(body.yearsUsed));
  }
  if (typeof body.notes === "string") patch.notes = body.notes;

  const [updated] = await db
    .update(skillMatrices)
    .set(patch)
    .where(eq(skillMatrices.id, skillId))
    .returning();

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
    .where(eq(skillMatrices.id, updated.id))
    .limit(1);

  return Response.json({ skill: enriched || updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuthJson();
  if (error) return error;
  const { id } = await params;
  const skillId = Number(id);
  if (!Number.isFinite(skillId)) return jsonError("Invalid id");
  const owned = await ownsSkill(skillId, user.id);
  if (!owned) return jsonError("Skill not found", 404);
  await db.delete(skillMatrices).where(eq(skillMatrices.id, skillId));
  return Response.json({ ok: true });
}
