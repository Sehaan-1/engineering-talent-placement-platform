import { requireOrgContext, wouldOrphanOrg } from "@/lib/org";
import { db } from "@/db";
import { orgMembers, users } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getJsonBody, jsonError } from "@/lib/types";
import { logAudit, computeDiff } from "@/lib/audit";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { ctx, error } = await requireOrgContext("admin");
  if (error) return error;

  const { id } = await params;
  const memberId = Number(id);
  if (!Number.isFinite(memberId)) return jsonError("Invalid member ID");

  const body = await getJsonBody<{ role?: "owner" | "admin" | "member" }>(req);
  if (!body || !body.role) return jsonError("Role is required");

  const newRole = body.role;
  if (!["owner", "admin", "member"].includes(newRole)) {
    return jsonError("Invalid role");
  }

  // Fetch target member
  const [targetMember] = await db
    .select({
      id: orgMembers.id,
      userId: orgMembers.userId,
      role: orgMembers.role,
      user: {
        name: users.name,
        email: users.email,
      },
    })
    .from(orgMembers)
    .innerJoin(users, eq(users.id, orgMembers.userId))
    .where(and(eq(orgMembers.id, memberId), eq(orgMembers.orgId, ctx.org.id)))
    .limit(1);

  if (!targetMember) {
    return jsonError("Member not found", 404);
  }

  // Role permissions check:
  // Only an owner can assign or demote the owner role
  if ((targetMember.role === "owner" || newRole === "owner") && ctx.membership.role !== "owner") {
    return Response.json(
      { error: "Only workspace owners can assign or modify the Owner role" },
      { status: 403 }
    );
  }

  // If demoting an owner, safeguard against orphaning
  if (targetMember.role === "owner" && newRole !== "owner") {
    const isOrphan = await wouldOrphanOrg(ctx.org.id, targetMember.userId);
    if (isOrphan) {
      return Response.json(
        { error: "Cannot demote the only workspace owner. Assign another owner first." },
        { status: 409 }
      );
    }
  }

  const [updated] = await db
    .update(orgMembers)
    .set({ role: newRole, updatedAt: new Date() })
    .where(eq(orgMembers.id, memberId))
    .returning();

  logAudit({
    orgId: ctx.org.id,
    actorId: ctx.user.id,
    actorName: ctx.user.name,
    actorEmail: ctx.user.email,
    targetType: "member",
    targetId: targetMember.userId,
    targetTitle: targetMember.user.name,
    action: "role_change",
    diff: computeDiff(
      { role: targetMember.role },
      { role: updated.role }
    ),
    metadata: {
      memberEmail: targetMember.user.email,
      oldRole: targetMember.role,
      newRole: updated.role,
    },
  });

  return Response.json({ member: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { ctx, error } = await requireOrgContext("admin");
  if (error) return error;

  const { id } = await params;
  const memberId = Number(id);
  if (!Number.isFinite(memberId)) return jsonError("Invalid member ID");

  const [targetMember] = await db
    .select({
      id: orgMembers.id,
      userId: orgMembers.userId,
      role: orgMembers.role,
      user: {
        name: users.name,
        email: users.email,
      },
    })
    .from(orgMembers)
    .innerJoin(users, eq(users.id, orgMembers.userId))
    .where(and(eq(orgMembers.id, memberId), eq(orgMembers.orgId, ctx.org.id)))
    .limit(1);

  if (!targetMember) {
    return jsonError("Member not found", 404);
  }

  // Admins cannot remove Owners
  if (targetMember.role === "owner" && ctx.membership.role !== "owner") {
    return Response.json(
      { error: "Only owners can remove an owner from the workspace" },
      { status: 403 }
    );
  }

  // Check if removing this member would orphan the org
  const isOrphan = await wouldOrphanOrg(ctx.org.id, targetMember.userId);
  if (isOrphan) {
    return Response.json(
      { error: "Cannot remove the only workspace owner. Transfer ownership or assign another owner first." },
      { status: 409 }
    );
  }

  await db.delete(orgMembers).where(eq(orgMembers.id, memberId));

  logAudit({
    orgId: ctx.org.id,
    actorId: ctx.user.id,
    actorName: ctx.user.name,
    actorEmail: ctx.user.email,
    targetType: "member",
    targetId: targetMember.userId,
    targetTitle: targetMember.user.name,
    action: "remove_member",
    metadata: {
      removedEmail: targetMember.user.email,
      removedRole: targetMember.role,
    },
  });

  return Response.json({ success: true, removedId: memberId });
}
