import { db } from "@/db";
import { candidates, placements } from "@/db/schema";
import { requireAuthJson, getJsonBody, jsonError } from "@/lib/types";
import { and, eq, or } from "drizzle-orm";
import { getOrgContext } from "@/lib/org";
import { logAudit, computeDiff } from "@/lib/audit";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const ALLOWED_STATUS = new Set([
  "sourced",
  "screening",
  "submitted",
  "interviewing",
  "offer",
  "placed",
  "archived",
]);

async function ownsPlacement(id: number, userId: number, orgId?: number) {
  const condition = orgId
    ? or(eq(candidates.orgId, orgId), eq(candidates.ownerId, userId))
    : eq(candidates.ownerId, userId);

  const rows = await db
    .select({
      placement: placements,
      candidate: {
        id: candidates.id,
        fullName: candidates.fullName,
      },
    })
    .from(placements)
    .innerJoin(candidates, eq(candidates.id, placements.candidateId))
    .where(and(eq(placements.id, id), condition!))
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
  const pid = Number(id);
  if (!Number.isFinite(pid)) return jsonError("Invalid id");
  const record = await ownsPlacement(pid, user.id, orgCtx?.org.id);
  if (!record) return jsonError("Placement not found", 404);

  const existingPlacement = record.placement;

  const body = await getJsonBody<Record<string, unknown>>(req);
  if (!body) return jsonError("Invalid JSON body");
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof body.clientName === "string" && body.clientName.trim())
    patch.clientName = body.clientName.trim();
  if (typeof body.clientId === "number")
    patch.clientId = body.clientId;
  if (body.clientId === null)
    patch.clientId = null;
  if (typeof body.roleTitle === "string" && body.roleTitle.trim())
    patch.roleTitle = body.roleTitle.trim();
  if (typeof body.status === "string" && ALLOWED_STATUS.has(body.status))
    patch.status = body.status;
  if (typeof body.valueUsd === "number")
    patch.valueUsd = Math.max(0, Math.floor(body.valueUsd));
  if (typeof body.startDate === "string")
    patch.startDate = new Date(body.startDate);
  if (body.startDate === null) patch.startDate = null;
  if (typeof body.notes === "string") patch.notes = body.notes;

  const [updated] = await db
    .update(placements)
    .set(patch)
    .where(eq(placements.id, pid))
    .returning();

  if (orgCtx) {
    const isStatusOnly =
      body.status &&
      body.status !== existingPlacement.status &&
      Object.keys(body).length === 1;

    logAudit({
      orgId: orgCtx.org.id,
      actorId: user.id,
      actorName: user.name,
      actorEmail: user.email,
      targetType: "placement",
      targetId: pid,
      targetTitle: `${updated.roleTitle} @ ${updated.clientName} (${record.candidate.fullName})`,
      action: isStatusOnly ? "status_change" : "update",
      diff: computeDiff(existingPlacement, updated),
      metadata: {
        candidateId: updated.candidateId,
        candidateName: record.candidate.fullName,
      },
    });
  }

  if (body.status && typeof body.status === "string") {
    import("@/lib/notify").then(async ({ createNotification }) => {
      const [cand] = await db
        .select()
        .from(candidates)
        .where(eq(candidates.id, updated.candidateId))
        .limit(1);

      createNotification(
        user.id,
        "status_changed",
        "Pipeline Milestone Updated",
        `${cand?.fullName || "Candidate"} moved to ${updated.status.toUpperCase()} (${updated.clientName})`,
        "/placements"
      );

      if (cand?.userId) {
        createNotification(
          cand.userId,
          "status_changed",
          "Placement Update",
          `Your application for ${updated.roleTitle} at ${updated.clientName} is now: ${updated.status.toUpperCase()}`,
          "/candidate/dashboard"
        );
      }
    });
  }

  return Response.json({ placement: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuthJson();
  if (error) return error;
  const orgCtx = await getOrgContext().catch(() => null);

  const { id } = await params;
  const pid = Number(id);
  if (!Number.isFinite(pid)) return jsonError("Invalid id");
  const record = await ownsPlacement(pid, user.id, orgCtx?.org.id);
  if (!record) return jsonError("Placement not found", 404);

  await db.delete(placements).where(eq(placements.id, pid));

  if (orgCtx) {
    logAudit({
      orgId: orgCtx.org.id,
      actorId: user.id,
      actorName: user.name,
      actorEmail: user.email,
      targetType: "placement",
      targetId: pid,
      targetTitle: `${record.placement.roleTitle} @ ${record.placement.clientName}`,
      action: "delete",
    });
  }

  return Response.json({ ok: true });
}
