import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  orgInvites,
  orgMembers,
  organizations,
  users,
} from "@/db/schema";
import { and, eq, gt } from "drizzle-orm";
import {
  createSessionRecord,
  hashPassword,
  SESSION_COOKIE,
  SESSION_TTL_MS,
} from "@/lib/auth";
import { ORG_COOKIE } from "@/lib/org";
import { pickColor } from "@/lib/auth-utils";
import { logAudit } from "@/lib/audit";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const now = new Date();

  // Find valid invite
  const [invite] = await db
    .select()
    .from(orgInvites)
    .where(and(eq(orgInvites.token, token), gt(orgInvites.expiresAt, now)))
    .limit(1);

  if (!invite) {
    const errorUrl = new URL("/login", request.url);
    errorUrl.searchParams.set(
      "error",
      "Your team invitation link is invalid or has expired. Please contact your workspace admin for a new link."
    );
    return NextResponse.redirect(errorUrl);
  }

  // Find target organization
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, invite.orgId))
    .limit(1);

  if (!org) {
    const errorUrl = new URL("/login", request.url);
    errorUrl.searchParams.set("error", "Workspace not found");
    return NextResponse.redirect(errorUrl);
  }

  // Find or create user
  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, invite.email))
    .limit(1);

  let userId: number;
  let userName: string;

  if (existingUser) {
    userId = existingUser.id;
    userName = existingUser.name;

    // Check if already a member
    const [existingMembership] = await db
      .select()
      .from(orgMembers)
      .where(and(eq(orgMembers.orgId, invite.orgId), eq(orgMembers.userId, userId)))
      .limit(1);

    if (!existingMembership) {
      await db.insert(orgMembers).values({
        orgId: invite.orgId,
        userId,
        role: invite.role,
      });
    }
  } else {
    // Generate derived name from email
    const emailPrefix = invite.email.split("@")[0] || "Team Member";
    const name = emailPrefix
      .replace(/[._-]/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());

    const [newUser] = await db
      .insert(users)
      .values({
        email: invite.email,
        name,
        passwordHash: hashPassword(randomBytes(16).toString("hex")),
        role: "recruiter",
        avatarColor: pickColor(invite.email),
      })
      .returning();

    userId = newUser.id;
    userName = newUser.name;

    await db.insert(orgMembers).values({
      orgId: invite.orgId,
      userId,
      role: invite.role,
    });
  }

  // Delete the used one-time invite
  await db.delete(orgInvites).where(eq(orgInvites.id, invite.id));

  // Log acceptance audit
  logAudit({
    orgId: invite.orgId,
    actorId: userId,
    actorName: userName,
    actorEmail: invite.email,
    targetType: "member",
    targetId: userId,
    targetTitle: userName,
    action: "invite_member",
    metadata: {
      acceptedRole: invite.role,
      token,
    },
  });

  // Create session for user
  const sessionToken = await createSessionRecord(userId);

  const destination = new URL("/dashboard", request.url);
  const response = NextResponse.redirect(destination);

  // Set session cookie and active org cookie
  response.cookies.set(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });

  response.cookies.set(ORG_COOKIE, String(invite.orgId), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}
