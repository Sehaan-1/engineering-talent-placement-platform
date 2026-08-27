import { db } from "@/db";
import { candidates, availabilities } from "@/db/schema";
import { requireAuthJson, getJsonBody, jsonError } from "@/lib/types";
import { getOrgContext } from "@/lib/org";
import { and, eq, desc, or } from "drizzle-orm";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const ALLOWED_STATUS = new Set([
  "available",
  "limited",
  "booked",
  "on-leave",
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

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuthJson();
  if (error) return error;
  const orgCtx = await getOrgContext().catch(() => null);

  const condition = orgCtx
    ? eq(candidates.orgId, orgCtx.org.id)
    : eq(candidates.ownerId, user.id);

  const rows = await db
    .select({
      availability: availabilities,
      candidate: candidates,
    })
    .from(availabilities)
    .innerJoin(candidates, eq(candidates.id, availabilities.candidateId))
    .where(condition)
    .orderBy(desc(availabilities.weekStart));
  return Response.json({
    availability: rows.map((r) => ({
      ...r.availability,
      candidate: {
        id: r.candidate.id,
        fullName: r.candidate.fullName,
        headline: r.candidate.headline,
        avatarColor: r.candidate.avatarColor,
        region: r.candidate.region,
      },
    })),
  });
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuthJson();
  if (error) return error;
  const body = await getJsonBody<{
    candidateId?: number;
    weekStart?: string;
    hoursPerWeek?: number;
    status?: string;
    preferredStart?: string;
    notes?: string;
  }>(req);
  if (!body) return jsonError("Invalid JSON body");
  const candidateId = Number(body.candidateId);
  if (!Number.isFinite(candidateId)) return jsonError("candidateId required");
  if (!body.weekStart) return jsonError("weekStart is required");
  const owned = await ownsCandidate(candidateId, user.id);
  if (!owned) return jsonError("Candidate not found", 404);
  const status = ALLOWED_STATUS.has(body.status ?? "")
    ? (body.status as "available")
    : "available";
  const [created] = await db
    .insert(availabilities)
    .values({
      candidateId,
      weekStart: new Date(body.weekStart),
      hoursPerWeek: Math.max(0, Math.floor(body.hoursPerWeek ?? 40)),
      status,
      preferredStart: body.preferredStart?.trim() ?? "2 weeks",
      notes: body.notes?.trim() ?? "",
    })
    .returning();
  return Response.json({ availability: created }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const { user, error } = await requireAuthJson();
  if (error) return error;

  const body = await getJsonBody<{
    candidateId?: number;
    availabilityId?: number;
    status?: string;
    notes?: string;
    hoursPerWeek?: number;
  }>(req);

  if (!body) return jsonError("Invalid JSON body");

  let targetCandidateId: number;

  if (user.role === "candidate") {
    const candidateRows = await db
      .select({ id: candidates.id })
      .from(candidates)
      .where(eq(candidates.userId, user.id))
      .limit(1);

    if (candidateRows.length === 0) {
      return jsonError("Candidate profile not found", 404);
    }
    targetCandidateId = candidateRows[0].id;
  } else {
    const candidateId = Number(body.candidateId);
    if (!Number.isFinite(candidateId)) return jsonError("candidateId required");
    const owned = await ownsCandidate(candidateId, user.id);
    if (!owned) return jsonError("Candidate not found", 404);
    targetCandidateId = candidateId;
  }

  const status = ALLOWED_STATUS.has(body.status ?? "")
    ? (body.status as "available" | "limited" | "booked" | "on-leave")
    : undefined;

  // Find latest or specific availability row
  let targetAvailId = body.availabilityId ? Number(body.availabilityId) : null;
  if (!targetAvailId) {
    const latest = await db
      .select()
      .from(availabilities)
      .where(eq(availabilities.candidateId, targetCandidateId))
      .orderBy(desc(availabilities.weekStart))
      .limit(1);
    if (latest.length > 0) {
      targetAvailId = latest[0].id;
    }
  }

  if (targetAvailId) {
    const updates: Partial<typeof availabilities.$inferInsert> = {};
    if (status) updates.status = status;
    if (typeof body.notes === "string") updates.notes = body.notes.trim();
    if (user.role !== "candidate" && typeof body.hoursPerWeek === "number") {
      updates.hoursPerWeek = Math.max(0, Math.floor(body.hoursPerWeek));
    }

    const [updated] = await db
      .update(availabilities)
      .set(updates)
      .where(
        and(
          eq(availabilities.id, targetAvailId),
          eq(availabilities.candidateId, targetCandidateId)
        )
      )
      .returning();

    if (user.role === "candidate" && status) {
      import("@/lib/notify").then(async ({ createNotification }) => {
        const [cand] = await db
          .select()
          .from(candidates)
          .where(eq(candidates.id, targetCandidateId))
          .limit(1);

        if (cand) {
          createNotification(
            cand.ownerId,
            "availability_changed",
            "Availability Changed",
            `${cand.fullName} updated availability status to ${status.toUpperCase()}`,
            `/candidates/${cand.id}`
          );
        }
      });
    }

    return Response.json({ availability: updated });
  } else {
    const weekStart = new Date();
    weekStart.setUTCHours(0, 0, 0, 0);
    const [created] = await db
      .insert(availabilities)
      .values({
        candidateId: targetCandidateId,
        weekStart,
        hoursPerWeek: 40,
        status: status ?? "available",
        preferredStart: "2 weeks",
        notes: body.notes?.trim() ?? "",
      })
      .returning();
    return Response.json({ availability: created });
  }
}

