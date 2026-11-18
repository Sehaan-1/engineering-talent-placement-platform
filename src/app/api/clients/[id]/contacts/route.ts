import { db } from "@/db";
import { clients, clientContacts } from "@/db/schema";
import { ensurePhase2Tables } from "@/lib/seed";
import { requireAuthJson, getJsonBody, jsonError } from "@/lib/types";
import { and, desc, eq, or } from "drizzle-orm";
import { getOrgContext } from "@/lib/org";
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

  await ensurePhase2Tables();
  const orgCtx = await getOrgContext().catch(() => null);

  const { id } = await params;
  const clientId = Number(id);
  if (!Number.isFinite(clientId)) return jsonError("Invalid client ID");

  const client = await getAccessibleClient(clientId, user.id, orgCtx?.org.id);
  if (!client) return jsonError("Client not found", 404);

  const contacts = await db
    .select()
    .from(clientContacts)
    .where(eq(clientContacts.clientId, clientId))
    .orderBy(desc(clientContacts.isPrimary), desc(clientContacts.createdAt));

  return Response.json({ contacts });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuthJson();
  if (error) return error;

  await ensurePhase2Tables();
  const orgCtx = await getOrgContext().catch(() => null);

  const { id } = await params;
  const clientId = Number(id);
  if (!Number.isFinite(clientId)) return jsonError("Invalid client ID");

  const client = await getAccessibleClient(clientId, user.id, orgCtx?.org.id);
  if (!client) return jsonError("Client not found", 404);

  const body = await getJsonBody<{
    name?: string;
    email?: string;
    title?: string;
    isPrimary?: boolean;
  }>(req);

  if (!body) return jsonError("Invalid JSON body");
  if (!body.name?.trim()) return jsonError("Contact name is required");
  if (!body.email?.trim()) return jsonError("Contact email is required");

  if (body.isPrimary) {
    // Demote any current primary contact
    await db
      .update(clientContacts)
      .set({ isPrimary: false })
      .where(eq(clientContacts.clientId, clientId));
  }

  const [contact] = await db
    .insert(clientContacts)
    .values({
      clientId,
      name: body.name.trim(),
      email: body.email.trim().toLowerCase(),
      title: body.title?.trim() || null,
      isPrimary: Boolean(body.isPrimary),
    })
    .returning();

  return Response.json({ contact }, { status: 201 });
}
