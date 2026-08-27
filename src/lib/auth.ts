import { cookies } from "next/headers";
import { db } from "@/db";
import { sessions, users, candidates, type User } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "etn_session";
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, derived] = stored.split(":");
  if (!salt || !derived) return false;
  const expected = Buffer.from(derived, "hex");
  const actual = scryptSync(password, salt, 64);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

export function newSessionId(): string {
  return randomBytes(24).toString("hex");
}

export function tokenFingerprint(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSessionRecord(userId: number): Promise<string> {
  const token = newSessionId();
  await db.insert(sessions).values({
    id: tokenFingerprint(token),
    userId,
    expiresAt: new Date(Date.now() + SESSION_TTL_MS),
  });
  return token;
}

export async function createSessionForUser(userId: number): Promise<string> {
  const token = await createSessionRecord(userId);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
  return token;
}

export async function destroyCurrentSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await db
      .delete(sessions)
      .where(eq(sessions.id, tokenFingerprint(token)));
  }
  jar.delete(SESSION_COOKIE);
}

export async function getCurrentUser(): Promise<User | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const fp = tokenFingerprint(token);
  const rows = await db
    .select({
      user: users,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, fp), gt(sessions.expiresAt, new Date())))
    .limit(1);
  if (rows.length === 0) return null;
  return rows[0].user;
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}

export function generateMagicToken(): string {
  return randomBytes(32).toString("hex");
}

export async function getLinkedCandidate(userId: number) {
  const rows = await db
    .select()
    .from(candidates)
    .where(eq(candidates.userId, userId))
    .limit(1);
  return rows.length > 0 ? rows[0] : null;
}

export async function requireCandidate() {
  const user = await requireUser();
  if (user.role !== "candidate") {
    throw new Error("FORBIDDEN");
  }
  const candidate = await getLinkedCandidate(user.id);
  if (!candidate) {
    throw new Error("CANDIDATE_NOT_FOUND");
  }
  return { user, candidate };
}

export async function verifyCandidateToken(token: string): Promise<
  | {
      success: true;
      user: User;
      candidate: typeof candidates.$inferSelect;
      sessionToken: string;
    }
  | { success: false; error: string }
> {
  if (!token || token.length < 16) {
    return { success: false, error: "Invalid token" };
  }

  const now = new Date();

  // Find candidate by inviteToken OR magicLinkToken
  const inviteCandidates = await db
    .select()
    .from(candidates)
    .where(
      and(
        eq(candidates.inviteToken, token),
        gt(candidates.inviteExpiresAt, now)
      )
    )
    .limit(1);

  const magicCandidates =
    inviteCandidates.length > 0
      ? []
      : await db
          .select()
          .from(candidates)
          .where(
            and(
              eq(candidates.magicLinkToken, token),
              gt(candidates.magicLinkExpiresAt, now)
            )
          )
          .limit(1);

  const matched =
    inviteCandidates.length > 0 ? inviteCandidates[0] : magicCandidates[0];

  if (!matched) {
    return {
      success: false,
      error: "This magic link is invalid or has expired. Please request a new one.",
    };
  }

  const isInvite = inviteCandidates.length > 0;

  // Resolve or create user
  let user: User;
  if (matched.userId) {
    const userRows = await db
      .select()
      .from(users)
      .where(eq(users.id, matched.userId))
      .limit(1);
    if (userRows.length === 0) {
      // User record missing, recreate
      const [newUser] = await db
        .insert(users)
        .values({
          email: matched.email.toLowerCase().trim(),
          name: matched.fullName,
          role: "candidate",
          passwordHash: "magic-only:" + randomBytes(32).toString("hex"),
          avatarColor: matched.avatarColor,
        })
        .returning();
      user = newUser;
      await db
        .update(candidates)
        .set({ userId: user.id })
        .where(eq(candidates.id, matched.id));
    } else {
      user = userRows[0];
    }
  } else {
    // Check if a user with this email already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, matched.email.toLowerCase().trim()))
      .limit(1);

    if (existingUser.length > 0) {
      user = existingUser[0];
      await db
        .update(candidates)
        .set({ userId: user.id })
        .where(eq(candidates.id, matched.id));
    } else {
      const [newUser] = await db
        .insert(users)
        .values({
          email: matched.email.toLowerCase().trim(),
          name: matched.fullName,
          role: "candidate",
          passwordHash: "magic-only:" + randomBytes(32).toString("hex"),
          avatarColor: matched.avatarColor,
        })
        .returning();
      user = newUser;
      await db
        .update(candidates)
        .set({ userId: user.id })
        .where(eq(candidates.id, matched.id));
    }
  }

  // Clear used token to ensure one-time use
  if (isInvite) {
    await db
      .update(candidates)
      .set({
        inviteToken: null,
        inviteExpiresAt: null,
      })
      .where(eq(candidates.id, matched.id));
  } else {
    await db
      .update(candidates)
      .set({
        magicLinkToken: null,
        magicLinkExpiresAt: null,
      })
      .where(eq(candidates.id, matched.id));
  }

  // Create session record
  const sessionToken = await createSessionRecord(user.id);

  return { success: true, user, candidate: matched, sessionToken };
}

