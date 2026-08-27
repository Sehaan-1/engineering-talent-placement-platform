import { requireOrgContext } from "@/lib/org";
import { db } from "@/db";
import { orgInvites, users } from "@/db/schema";
import { and, desc, eq, gt, lt } from "drizzle-orm";
import { APP_URL } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function GET() {
  const { ctx, error } = await requireOrgContext("admin");
  if (error) return error;

  const now = new Date();

  // Auto-clean expired invites for this org
  await db
    .delete(orgInvites)
    .where(and(eq(orgInvites.orgId, ctx.org.id), lt(orgInvites.expiresAt, now)))
    .catch(() => {});

  const rows = await db
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
    .orderBy(desc(orgInvites.createdAt));

  const invites = rows.map((r) => ({
    id: r.id,
    email: r.email,
    role: r.role,
    expiresAt: r.expiresAt,
    createdAt: r.createdAt,
    inviterName: r.inviter.name,
    inviteLink: `${APP_URL}/invite/team/${r.token}`,
  }));

  return Response.json({ invites });
}
