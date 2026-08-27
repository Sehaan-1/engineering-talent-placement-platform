import { db } from "@/db";
import { clients, clientContacts, placements } from "@/db/schema";
import { ensurePhase5Tables } from "@/lib/seed";
import { requireAuthJson, getJsonBody, jsonError } from "@/lib/types";
import { and, desc, eq, sql } from "drizzle-orm";
import { getOrgContext } from "@/lib/org";
import { logAudit } from "@/lib/audit";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const { user, error } = await requireAuthJson();
  if (error) return error;

  await ensurePhase5Tables();
  const orgCtx = await getOrgContext().catch(() => null);

  const clientList = await db
    .select({
      id: clients.id,
      name: clients.name,
      website: clients.website,
      industry: clients.industry,
      contactName: clients.contactName,
      contactEmail: clients.contactEmail,
      logoColor: clients.logoColor,
      createdAt: clients.createdAt,
      updatedAt: clients.updatedAt,
      placementCount: sql<number>`count(distinct ${placements.id})::int`,
      activePlacementCount: sql<number>`count(distinct case when ${placements.status} in ('sourced', 'screening', 'submitted', 'interviewing', 'offer') then ${placements.id} end)::int`,
    })
    .from(clients)
    .leftJoin(placements, eq(placements.clientId, clients.id))
    .where(
      orgCtx
        ? eq(clients.orgId, orgCtx.org.id)
        : eq(clients.ownerId, user.id)
    )
    .groupBy(clients.id)
    .orderBy(desc(clients.updatedAt));

  return Response.json({ clients: clientList });
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuthJson();
  if (error) return error;

  await ensurePhase5Tables();
  const orgCtx = await getOrgContext().catch(() => null);

  const body = await getJsonBody<{
    name?: string;
    website?: string;
    industry?: string;
    contactName?: string;
    contactEmail?: string;
    logoColor?: string;
    contacts?: { name: string; email: string; title?: string; isPrimary?: boolean }[];
  }>(req);

  if (!body) return jsonError("Invalid JSON body");
  if (!body.name?.trim()) return jsonError("Client name is required");
  if (!body.contactName?.trim()) return jsonError("Contact name is required");
  if (!body.contactEmail?.trim()) return jsonError("Contact email is required");

  const [created] = await db
    .insert(clients)
    .values({
      ownerId: user.id,
      orgId: orgCtx?.org.id ?? null,
      name: body.name.trim(),
      website: body.website?.trim() || null,
      industry: body.industry?.trim() || null,
      contactName: body.contactName.trim(),
      contactEmail: body.contactEmail.trim().toLowerCase(),
      logoColor: body.logoColor?.trim() || "#6366f1",
    })
    .returning();

  // Create primary contact by default
  await db.insert(clientContacts).values({
    clientId: created.id,
    name: body.contactName.trim(),
    email: body.contactEmail.trim().toLowerCase(),
    title: "Primary Contact",
    isPrimary: true,
  });

  if (Array.isArray(body.contacts)) {
    for (const c of body.contacts) {
      if (c.name?.trim() && c.email?.trim()) {
        await db.insert(clientContacts).values({
          clientId: created.id,
          name: c.name.trim(),
          email: c.email.trim().toLowerCase(),
          title: c.title?.trim() || null,
          isPrimary: Boolean(c.isPrimary),
        });
      }
    }
  }

  if (orgCtx) {
    logAudit({
      orgId: orgCtx.org.id,
      actorId: user.id,
      actorName: user.name,
      actorEmail: user.email,
      targetType: "client",
      targetId: created.id,
      targetTitle: created.name,
      action: "create",
      metadata: {
        industry: created.industry,
        contactEmail: created.contactEmail,
      },
    });
  }

  return Response.json({ client: created }, { status: 201 });
}
