import { requireOrgContext } from "@/lib/org";
import { db } from "@/db";
import { orgInvites, orgMembers, users } from "@/db/schema";
import { and, desc, eq, gt } from "drizzle-orm";
import { getJsonBody, jsonError } from "@/lib/types";
import { randomBytes } from "crypto";
import { sendTeamInviteEmail, APP_URL } from "@/lib/email";
import { logAudit } from "@/lib/audit";
import { createNotification } from "@/lib/notify";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const { ctx, error } = await requireOrgContext();
  if (error) return error;

  const rows = await db
    .select({
      id: orgMembers.id,
      orgId: orgMembers.orgId,
      userId: orgMembers.userId,
      role: orgMembers.role,
      createdAt: orgMembers.createdAt,
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
        avatarColor: users.avatarColor,
      },
    })
    .from(orgMembers)
    .innerJoin(users, eq(users.id, orgMembers.userId))
    .where(eq(orgMembers.orgId, ctx.org.id))
    .orderBy(desc(orgMembers.createdAt));

  return Response.json({ members: rows });
}

export async function POST(req: NextRequest) {
  const { ctx, error } = await requireOrgContext("admin");
  if (error) return error;

  const body = await getJsonBody<{ email?: string; role?: "owner" | "admin" | "member" }>(req);
  if (!body || !body.email?.trim()) return jsonError("Email is required");

  const email = body.email.trim().toLowerCase();
  const role = body.role === "admin" ? "admin" : "member";

  // Check if user is already a member
  const [existingMember] = await db
    .select({ id: orgMembers.id })
    .from(orgMembers)
    .innerJoin(users, eq(users.id, orgMembers.userId))
    .where(and(eq(orgMembers.orgId, ctx.org.id), eq(users.email, email)))
    .limit(1);

  if (existingMember) {
    return Response.json(
      { error: `${email} is already a member of this workspace` },
      { status: 409 }
    );
  }

  // Check if active non-expired invite already exists
  const now = new Date();
  const [existingInvite] = await db
    .select()
    .from(orgInvites)
    .where(and(eq(orgInvites.orgId, ctx.org.id), eq(orgInvites.email, email), gt(orgInvites.expiresAt, now)))
    .limit(1);

  let inviteRecord = existingInvite;

  if (!inviteRecord) {
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const [inserted] = await db
      .insert(orgInvites)
      .values({
        orgId: ctx.org.id,
        email,
        role,
        token,
        invitedBy: ctx.user.id,
        expiresAt,
      })
      .returning();

    inviteRecord = inserted;
  }

  const inviteLink = `${APP_URL}/invite/team/${inviteRecord.token}`;

  await sendTeamInviteEmail({
    to: email,
    inviterName: ctx.user.name,
    orgName: ctx.org.name,
    role: inviteRecord.role,
    inviteLink,
  });

  logAudit({
    orgId: ctx.org.id,
    actorId: ctx.user.id,
    actorName: ctx.user.name,
    actorEmail: ctx.user.email,
    targetType: "member",
    targetId: inviteRecord.id,
    targetTitle: email,
    action: "invite_member",
    metadata: { email, role: inviteRecord.role },
  });

  await createNotification(
    ctx.user.id,
    "candidate_invited",
    "Team Invitation Sent",
    `Invited ${email} as ${inviteRecord.role} to ${ctx.org.name}`,
    `/settings/team`
  );

  return Response.json(
    {
      invite: {
        id: inviteRecord.id,
        email: inviteRecord.email,
        role: inviteRecord.role,
        expiresAt: inviteRecord.expiresAt,
        inviteLink,
      },
    },
    { status: 201 }
  );
}
