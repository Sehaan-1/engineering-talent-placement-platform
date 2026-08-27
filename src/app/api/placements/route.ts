import { db } from "@/db";
import { candidates, clients, placements } from "@/db/schema";
import { requireAuthJson, getJsonBody, jsonError } from "@/lib/types";
import { and, desc, eq, or } from "drizzle-orm";
import { getOrgContext } from "@/lib/org";
import { logAudit } from "@/lib/audit";
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

  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const clientIdParam = url.searchParams.get("clientId");
  const clientId = clientIdParam ? Number(clientIdParam) : null;

  const conditions = [
    orgCtx
      ? eq(candidates.orgId, orgCtx.org.id)
      : eq(candidates.ownerId, user.id),
  ];

  if (status && ALLOWED_STATUS.has(status)) {
    conditions.push(eq(placements.status, status as "sourced"));
  }
  if (clientId && Number.isFinite(clientId)) {
    conditions.push(eq(placements.clientId, clientId));
  }

  const rows = await db
    .select({
      placement: placements,
      candidate: candidates,
      client: clients,
    })
    .from(placements)
    .innerJoin(candidates, eq(candidates.id, placements.candidateId))
    .leftJoin(clients, eq(clients.id, placements.clientId))
    .where(and(...conditions))
    .orderBy(desc(placements.updatedAt));

  return Response.json({
    placements: rows.map((r) => ({
      ...r.placement,
      candidate: {
        id: r.candidate.id,
        fullName: r.candidate.fullName,
        avatarColor: r.candidate.avatarColor,
        seniority: r.candidate.seniority,
      },
      client: r.client
        ? {
            id: r.client.id,
            name: r.client.name,
            logoColor: r.client.logoColor,
            industry: r.client.industry,
          }
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
    clientId?: number | null;
    clientName?: string;
    roleTitle?: string;
    status?: string;
    valueUsd?: number;
    startDate?: string | null;
    notes?: string;
  }>(req);
  if (!body) return jsonError("Invalid JSON body");
  const candidateId = Number(body.candidateId);
  if (!Number.isFinite(candidateId)) return jsonError("candidateId required");

  let clientName = body.clientName?.trim();
  let clientId = body.clientId ? Number(body.clientId) : null;

  if (clientId) {
    const clientCondition = orgCtx
      ? or(eq(clients.orgId, orgCtx.org.id), eq(clients.ownerId, user.id))
      : eq(clients.ownerId, user.id);

    const [clientRow] = await db
      .select()
      .from(clients)
      .where(and(eq(clients.id, clientId), clientCondition!))
      .limit(1);
    if (clientRow) {
      clientName = clientRow.name;
    } else {
      clientId = null;
    }
  }

  if (!clientName) return jsonError("Client name is required");
  if (!body.roleTitle?.trim()) return jsonError("Role title is required");
  const owned = await ownsCandidate(candidateId, user.id, orgCtx?.org.id);
  if (!owned) return jsonError("Candidate not found", 404);

  const status = ALLOWED_STATUS.has(body.status ?? "")
    ? (body.status as "sourced")
    : "sourced";

  const [created] = await db
    .insert(placements)
    .values({
      candidateId,
      clientId,
      clientName,
      roleTitle: body.roleTitle.trim(),
      status,
      valueUsd: Math.max(0, Math.floor(body.valueUsd ?? 0)),
      startDate: body.startDate ? new Date(body.startDate) : null,
      notes: body.notes?.trim() ?? "",
    })
    .returning();

  if (orgCtx) {
    logAudit({
      orgId: orgCtx.org.id,
      actorId: user.id,
      actorName: user.name,
      actorEmail: user.email,
      targetType: "placement",
      targetId: created.id,
      targetTitle: `${created.roleTitle} @ ${created.clientName} (${owned.fullName})`,
      action: "create",
      metadata: {
        candidateId,
        candidateName: owned.fullName,
        clientName,
        status: created.status,
        valueUsd: created.valueUsd,
      },
    });
  }

  return Response.json({ placement: created }, { status: 201 });
}
