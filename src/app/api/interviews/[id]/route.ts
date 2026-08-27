import { db } from "@/db";
import { candidates, interviews } from "@/db/schema";
import { requireAuthJson, getJsonBody, jsonError } from "@/lib/types";
import { and, eq, or } from "drizzle-orm";
import { getOrgContext } from "@/lib/org";
import { logAudit, computeDiff } from "@/lib/audit";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const ALLOWED_TYPE = new Set([
  "screen",
  "technical",
  "system-design",
  "behavioral",
  "final",
]);
const ALLOWED_OUTCOME = new Set([
  "scheduled",
  "passed",
  "failed",
  "no-show",
  "rescheduled",
]);

async function ownsInterview(id: number, userId: number, orgId?: number) {
  const condition = orgId
    ? or(eq(candidates.orgId, orgId), eq(candidates.ownerId, userId))
    : eq(candidates.ownerId, userId);

  const rows = await db
    .select({
      interview: interviews,
      candidate: {
        id: candidates.id,
        fullName: candidates.fullName,
      },
    })
    .from(interviews)
    .innerJoin(candidates, eq(candidates.id, interviews.candidateId))
    .where(and(eq(interviews.id, id), condition!))
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
  const iid = Number(id);
  if (!Number.isFinite(iid)) return jsonError("Invalid id");
  const record = await ownsInterview(iid, user.id, orgCtx?.org.id);
  if (!record) return jsonError("Interview not found", 404);

  const existing = record.interview;
  const body = await getJsonBody<Record<string, unknown>>(req);
  if (!body) return jsonError("Invalid JSON body");

  const patch: Record<string, unknown> = {};
  if (typeof body.type === "string" && ALLOWED_TYPE.has(body.type))
    patch.type = body.type;
  if (typeof body.scheduledAt === "string")
    patch.scheduledAt = new Date(body.scheduledAt);
  if (typeof body.durationMinutes === "number")
    patch.durationMinutes = Math.max(15, Math.floor(body.durationMinutes));
  if (typeof body.outcome === "string" && ALLOWED_OUTCOME.has(body.outcome))
    patch.outcome = body.outcome;
  if (typeof body.interviewer === "string")
    patch.interviewer = body.interviewer.trim();
  if (typeof body.score === "number") patch.score = body.score;
  if (body.score === null) patch.score = null;
  if (typeof body.feedback === "string") patch.feedback = body.feedback;

  const [updated] = await db
    .update(interviews)
    .set(patch)
    .where(eq(interviews.id, iid))
    .returning();

  if (orgCtx) {
    logAudit({
      orgId: orgCtx.org.id,
      actorId: user.id,
      actorName: user.name,
      actorEmail: user.email,
      targetType: "interview",
      targetId: iid,
      targetTitle: `${updated.type.toUpperCase()} interview (${record.candidate.fullName})`,
      action: "update",
      diff: computeDiff(existing, updated),
    });
  }

  return Response.json({ interview: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuthJson();
  if (error) return error;
  const orgCtx = await getOrgContext().catch(() => null);

  const { id } = await params;
  const iid = Number(id);
  if (!Number.isFinite(iid)) return jsonError("Invalid id");
  const record = await ownsInterview(iid, user.id, orgCtx?.org.id);
  if (!record) return jsonError("Interview not found", 404);

  await db.delete(interviews).where(eq(interviews.id, iid));

  if (orgCtx) {
    logAudit({
      orgId: orgCtx.org.id,
      actorId: user.id,
      actorName: user.name,
      actorEmail: user.email,
      targetType: "interview",
      targetId: iid,
      targetTitle: `${record.interview.type.toUpperCase()} interview (${record.candidate.fullName})`,
      action: "delete",
    });
  }

  return Response.json({ ok: true });
}
