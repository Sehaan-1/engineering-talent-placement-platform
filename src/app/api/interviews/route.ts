import { db } from "@/db";
import { candidates, placements, interviews } from "@/db/schema";
import { requireAuthJson, getJsonBody, jsonError } from "@/lib/types";
import { and, desc, eq, or } from "drizzle-orm";
import { getOrgContext } from "@/lib/org";
import { logAudit } from "@/lib/audit";
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

async function ownsCandidate(candidateId: number, userId: number, orgId?: number) {
  const condition = orgId
    ? or(eq(candidates.orgId, orgId), eq(candidates.ownerId, userId))
    : eq(candidates.ownerId, userId);

  const rows = await db
    .select({ id: candidates.id, fullName: candidates.fullName })
    .from(candidates)
    .where(and(eq(candidates.id, candidateId), condition!))
    .limit(1);
  return rows[0] ?? null;
}

async function ownsPlacement(placementId: number | null, userId: number, orgId?: number) {
  if (placementId == null) return true;
  const condition = orgId
    ? or(eq(candidates.orgId, orgId), eq(candidates.ownerId, userId))
    : eq(candidates.ownerId, userId);

  const rows = await db
    .select({ id: placements.id })
    .from(placements)
    .innerJoin(candidates, eq(candidates.id, placements.candidateId))
    .where(and(eq(placements.id, placementId), condition!))
    .limit(1);
  return rows[0] != null;
}

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuthJson();
  if (error) return error;
  const orgCtx = await getOrgContext().catch(() => null);

  const url = new URL(req.url);
  const upcoming = url.searchParams.get("upcoming") === "1";

  const condition = orgCtx
    ? eq(candidates.orgId, orgCtx.org.id)
    : eq(candidates.ownerId, user.id);

  const rows = await db
    .select({
      interview: interviews,
      candidate: candidates,
      placement: placements,
    })
    .from(interviews)
    .innerJoin(candidates, eq(candidates.id, interviews.candidateId))
    .leftJoin(placements, eq(placements.id, interviews.placementId))
    .where(condition)
    .orderBy(desc(interviews.scheduledAt));

  const filtered = upcoming
    ? rows.filter(
        (r) =>
          r.interview.scheduledAt.getTime() >= Date.now() &&
          r.interview.outcome === "scheduled"
      )
    : rows;

  return Response.json({
    interviews: filtered.map((r) => ({
      ...r.interview,
      candidate: {
        id: r.candidate.id,
        fullName: r.candidate.fullName,
        avatarColor: r.candidate.avatarColor,
        seniority: r.candidate.seniority,
      },
      placement: r.placement
        ? { id: r.placement.id, clientName: r.placement.clientName, roleTitle: r.placement.roleTitle }
        : null,
    })),
  });
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuthJson();
  if (error) return error;
  const orgCtx = await getOrgContext().catch(() => null);

  const body = await getJsonBody<{
    candidateId?: number;
    placementId?: number | null;
    type?: string;
    scheduledAt?: string;
    durationMinutes?: number;
    outcome?: string;
    interviewer?: string;
    score?: number | null;
    feedback?: string;
  }>(req);
  if (!body) return jsonError("Invalid JSON body");
  const candidateId = Number(body.candidateId);
  if (!Number.isFinite(candidateId)) return jsonError("candidateId required");
  if (!body.scheduledAt) return jsonError("scheduledAt is required");

  const candidateRow = await ownsCandidate(candidateId, user.id, orgCtx?.org.id);
  if (!candidateRow) return jsonError("Candidate not found", 404);

  const placementId =
    body.placementId == null ? null : Number(body.placementId);
  if (placementId != null && !Number.isFinite(placementId))
    return jsonError("Invalid placementId");
  if (!(await ownsPlacement(placementId, user.id, orgCtx?.org.id)))
    return jsonError("Placement not found", 404);

  const type = ALLOWED_TYPE.has(body.type ?? "")
    ? (body.type as "screen")
    : "technical";
  const outcome = ALLOWED_OUTCOME.has(body.outcome ?? "")
    ? (body.outcome as "scheduled")
    : "scheduled";
  const score =
    body.score == null
      ? null
      : Number.isFinite(Number(body.score))
        ? Number(body.score)
        : null;

  const [created] = await db
    .insert(interviews)
    .values({
      candidateId,
      placementId,
      type,
      scheduledAt: new Date(body.scheduledAt),
      durationMinutes: Math.max(15, Math.floor(body.durationMinutes ?? 60)),
      outcome,
      interviewer: body.interviewer?.trim() ?? "",
      score,
      feedback: body.feedback?.trim() ?? "",
    })
    .returning();

  if (orgCtx) {
    logAudit({
      orgId: orgCtx.org.id,
      actorId: user.id,
      actorName: user.name,
      actorEmail: user.email,
      targetType: "interview",
      targetId: created.id,
      targetTitle: `${type.toUpperCase()} interview (${candidateRow.fullName})`,
      action: "create",
      metadata: {
        candidateId,
        candidateName: candidateRow.fullName,
        scheduledAt: created.scheduledAt,
        type,
      },
    });
  }

  // Create notifications
  const dateStr = new Date(body.scheduledAt).toLocaleDateString();
  const candName = candidateRow?.fullName || "Candidate";

  import("@/lib/notify").then(({ createNotification }) => {
    createNotification(
      user.id,
      "interview_scheduled",
      "Interview Scheduled",
      `${type.toUpperCase()} interview scheduled for ${candName} on ${dateStr}`,
      "/interviews"
    );

    const [cand] = [{ userId: null as number | null }];
    db.select({ userId: candidates.userId })
      .from(candidates)
      .where(eq(candidates.id, candidateId))
      .limit(1)
      .then(([c]) => {
        if (c?.userId) {
          createNotification(
            c.userId,
            "interview_scheduled",
            "New Interview Scheduled",
            `You have a ${type} interview scheduled on ${dateStr}`,
            "/candidate/dashboard"
          );
        }
      });
  });

  return Response.json({ interview: created }, { status: 201 });
}
