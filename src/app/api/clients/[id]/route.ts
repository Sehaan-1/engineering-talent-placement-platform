import { db } from "@/db";
import { clients, clientContacts, placements, candidates, shortlists } from "@/db/schema";
import { ensurePhase5Tables } from "@/lib/seed";
import { requireAuthJson, getJsonBody, jsonError } from "@/lib/types";
import { and, desc, eq, or } from "drizzle-orm";
import { getOrgContext } from "@/lib/org";
import { logAudit, computeDiff } from "@/lib/audit";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

async function getAccessibleClient(id: number, userId: number, orgId?: number) {
  const condition = orgId
    ? or(eq(clients.orgId, orgId), eq(clients.ownerId, userId))
    : eq(clients.ownerId, userId);

  const rows = await db
    .select()
    .from(clients)
    .where(and(eq(clients.id, id), condition!))
    .limit(1);
  return rows[0] ?? null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuthJson();
  if (error) return error;

  await ensurePhase5Tables();
  const orgCtx = await getOrgContext().catch(() => null);

  const { id } = await params;
  const clientId = Number(id);
  if (!Number.isFinite(clientId)) return jsonError("Invalid client ID");

  const client = await getAccessibleClient(clientId, user.id, orgCtx?.org.id);
  if (!client) return jsonError("Client not found", 404);

  const [contactsList, placementRows, shortlistRows] = await Promise.all([
    db
      .select()
      .from(clientContacts)
      .where(eq(clientContacts.clientId, clientId))
      .orderBy(desc(clientContacts.isPrimary), desc(clientContacts.createdAt)),
    db
      .select({
        placement: placements,
        candidate: candidates,
      })
      .from(placements)
      .innerJoin(candidates, eq(candidates.id, placements.candidateId))
      .where(eq(placements.clientId, clientId))
      .orderBy(desc(placements.updatedAt)),
    db
      .select({
        shortlist: shortlists,
        placement: placements,
        candidate: candidates,
      })
      .from(shortlists)
      .innerJoin(placements, eq(placements.id, shortlists.placementId))
      .innerJoin(candidates, eq(candidates.id, placements.candidateId))
      .where(eq(shortlists.clientId, clientId))
      .orderBy(desc(shortlists.sharedAt)),
  ]);

  return Response.json({
    client,
    contacts: contactsList,
    placements: placementRows.map((r) => ({
      ...r.placement,
      candidate: {
        id: r.candidate.id,
        fullName: r.candidate.fullName,
        avatarColor: r.candidate.avatarColor,
        seniority: r.candidate.seniority,
        hourlyRateUsd: r.candidate.hourlyRateUsd,
      },
    })),
    shortlists: shortlistRows.map((r) => ({
      ...r.shortlist,
      placement: {
        id: r.placement.id,
        roleTitle: r.placement.roleTitle,
        status: r.placement.status,
      },
      candidate: {
        id: r.candidate.id,
        fullName: r.candidate.fullName,
        avatarColor: r.candidate.avatarColor,
      },
    })),
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuthJson();
  if (error) return error;

  await ensurePhase5Tables();
  const orgCtx = await getOrgContext().catch(() => null);

  const { id } = await params;
  const clientId = Number(id);
  if (!Number.isFinite(clientId)) return jsonError("Invalid client ID");

  const client = await getAccessibleClient(clientId, user.id, orgCtx?.org.id);
  if (!client) return jsonError("Client not found", 404);

  const body = await getJsonBody<Record<string, unknown>>(req);
  if (!body) return jsonError("Invalid JSON body");

  const patch: Record<string, unknown> = { updatedAt: new Date() };

  if (typeof body.name === "string" && body.name.trim()) {
    patch.name = body.name.trim();
  }
  if (typeof body.website === "string") {
    patch.website = body.website.trim() || null;
  } else if (body.website === null) {
    patch.website = null;
  }
  if (typeof body.industry === "string") {
    patch.industry = body.industry.trim() || null;
  } else if (body.industry === null) {
    patch.industry = null;
  }
  if (typeof body.contactName === "string" && body.contactName.trim()) {
    patch.contactName = body.contactName.trim();
  }
  if (typeof body.contactEmail === "string" && body.contactEmail.trim()) {
    patch.contactEmail = body.contactEmail.trim().toLowerCase();
  }
  if (typeof body.logoColor === "string" && body.logoColor.trim()) {
    patch.logoColor = body.logoColor.trim();
  }

  const [updated] = await db
    .update(clients)
    .set(patch)
    .where(eq(clients.id, clientId))
    .returning();

  if (orgCtx) {
    logAudit({
      orgId: orgCtx.org.id,
      actorId: user.id,
      actorName: user.name,
      actorEmail: user.email,
      targetType: "client",
      targetId: clientId,
      targetTitle: updated.name,
      action: "update",
      diff: computeDiff(client, updated),
    });
  }

  return Response.json({ client: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuthJson();
  if (error) return error;

  await ensurePhase5Tables();
  const orgCtx = await getOrgContext().catch(() => null);

  const { id } = await params;
  const clientId = Number(id);
  if (!Number.isFinite(clientId)) return jsonError("Invalid client ID");

  const client = await getAccessibleClient(clientId, user.id, orgCtx?.org.id);
  if (!client) return jsonError("Client not found", 404);

  // Delete client (cascades contacts and shortlists, unlinks placements via set null)
  await db.delete(clients).where(eq(clients.id, clientId));

  if (orgCtx) {
    logAudit({
      orgId: orgCtx.org.id,
      actorId: user.id,
      actorName: user.name,
      actorEmail: user.email,
      targetType: "client",
      targetId: clientId,
      targetTitle: client.name,
      action: "delete",
    });
  }

  return Response.json({ ok: true });
}
