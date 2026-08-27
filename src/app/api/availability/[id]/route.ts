import { db } from "@/db";
import { candidates, availabilities } from "@/db/schema";
import { requireAuthJson, getJsonBody, jsonError } from "@/lib/types";
import { and, eq, or } from "drizzle-orm";
import { getOrgContext } from "@/lib/org";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const ALLOWED_STATUS = new Set([
  "available",
  "limited",
  "booked",
  "on-leave",
]);

async function ownsAvailability(id: number, userId: number, orgId?: number) {
  const condition = orgId
    ? or(eq(candidates.orgId, orgId), eq(candidates.ownerId, userId))
    : eq(candidates.ownerId, userId);

  const rows = await db
    .select({ id: availabilities.id })
    .from(availabilities)
    .innerJoin(candidates, eq(candidates.id, availabilities.candidateId))
    .where(and(eq(availabilities.id, id), condition!))
    .limit(1);
  return rows[0] ?? null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuthJson();
  if (error) return error;
  const orgCtx = await getOrgContext().catch(() => null);

  const { id } = await params;
  const aid = Number(id);
  if (!Number.isFinite(aid)) return jsonError("Invalid id");
  const owned = await ownsAvailability(aid, user.id, orgCtx?.org.id);
  if (!owned) return jsonError("Availability not found", 404);

  const body = await getJsonBody<Record<string, unknown>>(req);
  if (!body) return jsonError("Invalid JSON body");
  const patch: Record<string, unknown> = {};
  if (typeof body.weekStart === "string")
    patch.weekStart = new Date(body.weekStart);
  if (typeof body.hoursPerWeek === "number")
    patch.hoursPerWeek = Math.max(0, Math.floor(body.hoursPerWeek));
  if (typeof body.status === "string" && ALLOWED_STATUS.has(body.status))
    patch.status = body.status;
  if (typeof body.preferredStart === "string")
    patch.preferredStart = body.preferredStart.trim();
  if (typeof body.notes === "string") patch.notes = body.notes;

  const [updated] = await db
    .update(availabilities)
    .set(patch)
    .where(eq(availabilities.id, aid))
    .returning();

  return Response.json({ availability: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuthJson();
  if (error) return error;
  const orgCtx = await getOrgContext().catch(() => null);

  const { id } = await params;
  const aid = Number(id);
  if (!Number.isFinite(aid)) return jsonError("Invalid id");
  const owned = await ownsAvailability(aid, user.id, orgCtx?.org.id);
  if (!owned) return jsonError("Availability not found", 404);

  await db.delete(availabilities).where(eq(availabilities.id, aid));
  return Response.json({ ok: true });
}
