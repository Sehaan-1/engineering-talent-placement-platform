import { db } from "@/db";
import { candidates, clients, placements, shortlists } from "@/db/schema";
import { ensurePhase2Tables } from "@/lib/seed";
import { requireAuthJson, getJsonBody, jsonError } from "@/lib/types";
import { and, desc, eq } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const { user, error } = await requireAuthJson();
  if (error) return error;

  await ensurePhase2Tables();

  const rows = await db
    .select({
      shortlist: shortlists,
      placement: placements,
      client: clients,
      candidate: candidates,
    })
    .from(shortlists)
    .innerJoin(placements, eq(placements.id, shortlists.placementId))
    .innerJoin(clients, eq(clients.id, shortlists.clientId))
    .innerJoin(candidates, eq(candidates.id, placements.candidateId))
    .where(eq(clients.ownerId, user.id))
    .orderBy(desc(shortlists.sharedAt));

  return Response.json({
    shortlists: rows.map((r) => ({
      ...r.shortlist,
      placement: {
        id: r.placement.id,
        roleTitle: r.placement.roleTitle,
        status: r.placement.status,
        valueUsd: r.placement.valueUsd,
      },
      client: {
        id: r.client.id,
        name: r.client.name,
        logoColor: r.client.logoColor,
      },
      candidate: {
        id: r.candidate.id,
        fullName: r.candidate.fullName,
        avatarColor: r.candidate.avatarColor,
        seniority: r.candidate.seniority,
        hourlyRateUsd: r.candidate.hourlyRateUsd,
      },
    })),
  });
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuthJson();
  if (error) return error;

  await ensurePhase2Tables();

  const body = await getJsonBody<{
    placementId?: number;
    clientId?: number;
    expiresInDays?: number;
  }>(req);

  if (!body) return jsonError("Invalid JSON body");
  const placementId = Number(body.placementId);
  if (!Number.isFinite(placementId)) return jsonError("placementId is required");

  // Verify recruiter owns the placement
  const placementRows = await db
    .select({
      placement: placements,
      candidate: candidates,
    })
    .from(placements)
    .innerJoin(candidates, eq(candidates.id, placements.candidateId))
    .where(and(eq(placements.id, placementId), eq(candidates.ownerId, user.id)))
    .limit(1);

  if (placementRows.length === 0) {
    return jsonError("Placement not found or unauthorized", 404);
  }

  const { placement } = placementRows[0];
  let clientId = body.clientId ? Number(body.clientId) : placement.clientId;

  if (!clientId) {
    // Attempt to match or create client by clientName
    const clientRows = await db
      .select()
      .from(clients)
      .where(and(eq(clients.ownerId, user.id), eq(clients.name, placement.clientName)))
      .limit(1);

    if (clientRows.length > 0) {
      clientId = clientRows[0].id;
    } else {
      const [newClient] = await db
        .insert(clients)
        .values({
          ownerId: user.id,
          name: placement.clientName,
          contactName: "Primary Contact",
          contactEmail: `contact@${placement.clientName.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`,
          logoColor: "#6366f1",
        })
        .returning();
      clientId = newClient.id;
    }

    // Link placement to client
    await db
      .update(placements)
      .set({ clientId })
      .where(eq(placements.id, placement.id));
  }

  const days = Math.min(365, Math.max(1, body.expiresInDays ?? 30));
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  const token = randomBytes(32).toString("hex");

  const [shortlist] = await db
    .insert(shortlists)
    .values({
      placementId: placement.id,
      clientId,
      accessToken: token,
      expiresAt,
    })
    .returning();

  return Response.json(
    {
      shortlist,
      accessToken: token,
      url: `/shortlist/${token}`,
      expiresAt: shortlist.expiresAt,
    },
    { status: 201 }
  );
}
