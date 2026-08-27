import { redirect } from "next/navigation";
import { getOrgContext } from "@/lib/org";
import { db } from "@/db";
import { orgInvites, orgMembers, users } from "@/db/schema";
import { and, desc, eq, gt } from "drizzle-orm";
import { APP_URL } from "@/lib/email";
import TeamView from "./TeamView";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  let ctx;
  try {
    ctx = await getOrgContext();
  } catch {
    redirect("/login");
  }

  const now = new Date();

  const [members, invites] = await Promise.all([
    db
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
      .orderBy(desc(orgMembers.createdAt)),

    db
      .select({
        id: orgInvites.id,
        email: orgInvites.email,
        role: orgInvites.role,
        token: orgInvites.token,
        expiresAt: orgInvites.expiresAt,
        createdAt: orgInvites.createdAt,
        inviter: {
          id: users.id,
          name: users.name,
        },
      })
      .from(orgInvites)
      .innerJoin(users, eq(users.id, orgInvites.invitedBy))
      .where(and(eq(orgInvites.orgId, ctx.org.id), gt(orgInvites.expiresAt, now)))
      .orderBy(desc(orgInvites.createdAt)),
  ]);

  const formattedInvites = invites.map((inv) => ({
    id: inv.id,
    email: inv.email,
    role: inv.role,
    expiresAt: inv.expiresAt.toISOString(),
    createdAt: inv.createdAt.toISOString(),
    inviterName: inv.inviter.name,
    inviteLink: `${APP_URL}/invite/team/${inv.token}`,
  }));

  const formattedMembers = members.map((m) => ({
    id: m.id,
    userId: m.userId,
    role: m.role,
    createdAt: m.createdAt.toISOString(),
    user: m.user,
  }));

  return (
    <TeamView
      org={{
        id: ctx.org.id,
        name: ctx.org.name,
        plan: ctx.org.plan,
        logoColor: ctx.org.logoColor,
      }}
      currentUserId={ctx.user.id}
      currentUserRole={ctx.membership.role}
      initialMembers={formattedMembers}
      initialInvites={formattedInvites}
    />
  );
}
