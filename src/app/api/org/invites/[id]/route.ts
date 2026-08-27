import { requireOrgContext } from "@/lib/org";
import { db } from "@/db";
import { orgInvites } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { jsonError } from "@/lib/types";
import { logAudit } from "@/lib/audit";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { ctx, error } = await requireOrgContext("admin");
  if (error) return error;

  const { id } = await params;
  const inviteId = Number(id);
  if (!Number.isFinite(inviteId)) return jsonError("Invalid invite ID");

  const [targetInvite] = await db
    .select()
    .from(orgInvites)
    .where(and(eq(orgInvites.id, inviteId), eq(orgInvites.orgId, ctx.org.id)))
    .limit(1);

  if (!targetInvite) {
    return jsonError("Invite not found", 404);
  }

  await db.delete(orgInvites).where(eq(orgInvites.id, inviteId));

  logAudit({
    orgId: ctx.org.id,
    actorId: ctx.user.id,
    actorName: ctx.user.name,
    actorEmail: ctx.user.email,
    targetType: "member",
    targetId: inviteId,
    targetTitle: targetInvite.email,
    action: "delete",
    metadata: {
      revokedInviteEmail: targetInvite.email,
    },
  });

  return Response.json({ success: true, revokedId: inviteId });
}
