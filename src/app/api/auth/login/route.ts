import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyPassword, createSessionForUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const MAX_FAILED_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return req.headers.get("x-real-ip") || "unknown";
}

function recordFailedAttempt(ip: string) {
  const now = Date.now();
  const current = loginAttempts.get(ip);
  if (!current || current.resetAt <= now) {
    loginAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
  } else {
    loginAttempts.set(ip, { count: current.count + 1, resetAt: current.resetAt });
  }
}

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const now = Date.now();
  const attempt = loginAttempts.get(ip);

  if (attempt && attempt.resetAt > now && attempt.count >= MAX_FAILED_ATTEMPTS) {
    const retryAfter = Math.max(1, Math.ceil((attempt.resetAt - now) / 1000));
    return new Response(
      JSON.stringify({ error: "Too many failed login attempts. Please try again later." }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": retryAfter.toString(),
        },
      }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body.email !== "string" || typeof body.password !== "string") {
    recordFailedAttempt(ip);
    return Response.json({ error: "Email and password are required." }, { status: 400 });
  }

  const rows = await db
    .select()
    .from(users)
    .where(eq(users.email, body.email.trim().toLowerCase()))
    .limit(1);

  if (rows.length === 0) {
    recordFailedAttempt(ip);
    return Response.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const user = rows[0];
  const ok = verifyPassword(body.password, user.passwordHash);
  if (!ok) {
    recordFailedAttempt(ip);
    return Response.json({ error: "Invalid email or password." }, { status: 401 });
  }

  loginAttempts.delete(ip);
  await createSessionForUser(user.id);
  return Response.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  });
}

