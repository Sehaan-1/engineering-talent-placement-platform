import { requireOrgContext } from "@/lib/org";
import { db } from "@/db";
import { candidates, clients, orgMembers, organizations } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { getJsonBody, jsonError } from "@/lib/types";
import { logAudit, computeDiff } from "@/lib/audit";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const { ctx, error } = await requireOrgContext();
  if (error) return error;

  const [memberCount, candidateCount, clientCount] = await Promise.all([
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(orgMembers)
      .where(eq(orgMembers.orgId, ctx.org.id)),
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(candidates)
      .where(eq(candidates.orgId, ctx.org.id)),
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(clients)
      .where(eq(clients.orgId, ctx.org.id)),
  ]);

  return Response.json({
    org: ctx.org,
    role: ctx.membership.role,
    allOrgs: ctx.allOrgs,
    memberCount: memberCount[0]?.c ?? 0,
    candidateCount: candidateCount[0]?.c ?? 0,
    clientCount: clientCount[0]?.c ?? 0,
  });
}

export async function PATCH(req: NextRequest) {
  const { ctx, error } = await requireOrgContext("admin");
  if (error) return error;

  const body = await getJsonBody<{ name?: string; logoColor?: string }>(req);
  if (!body) return jsonError("Invalid body");

  const before = { name: ctx.org.name, logoColor: ctx.org.logoColor };
  const patch: { name?: string; logoColor?: string; updatedAt: Date } = {
    updatedAt: new Date(),
  };
  if (body.name?.trim()) patch.name = body.name.trim();
  if (body.logoColor?.trim()) patch.logoColor = body.logoColor.trim();

  const [updated] = await db
    .update(organizations)
    .set(patch)
    .where(eq(organizations.id, ctx.org.id))
    .returning();

  logAudit({
    orgId: ctx.org.id,
    actorId: ctx.user.id,
    actorName: ctx.user.name,
    actorEmail: ctx.user.email,
    targetType: "organization",
    targetId: ctx.org.id,
    targetTitle: ctx.org.name,
    action: "update",
    diff: computeDiff(before, {
      name: updated.name,
      logoColor: updated.logoColor,
    }),
  });

  return Response.json({ org: updated });
}
