import { db } from "@/db";
import { users, candidates } from "@/db/schema";
import { generateMagicToken } from "@/lib/auth";
import { sendCandidateLoginEmail, APP_URL } from "@/lib/email";
import { seedDatabase } from "@/lib/seed";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const email = body?.email ? String(body.email).trim().toLowerCase() : "";

    if (!email || !email.includes("@")) {
      return Response.json(
        { error: "A valid email address is required." },
        { status: 400 }
      );
    }

    // Auto-seed database if running on a fresh instance
    await seedDatabase().catch(() => {});

    const candidateRows = await db
      .select()
      .from(candidates)
      .where(eq(candidates.email, email))
      .limit(1);

    let candidate = candidateRows[0];

    if (!candidate) {
      // In demo mode, auto-provision a candidate profile for any new email
      const recruiterRows = await db
        .select()
        .from(users)
        .where(eq(users.role, "recruiter"))
        .limit(1);
      const ownerId = recruiterRows[0]?.id ?? 1;
      const username = email.split("@")[0].replace(/[._-]/g, " ");
      const formattedName = username
        .split(" ")
        .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");

      const [created] = await db
        .insert(candidates)
        .values({
          ownerId,
          fullName: formattedName || "Candidate",
          headline: "Software Engineer • Full-Stack",
          email,
          location: "Remote",
          timezone: "UTC",
          timezoneOverlap: "UTC ±4h",
          region: "other",
          seniority: "junior",
          yearsExperience: 1,
          hourlyRateUsd: 65,
          verification: "verified",
          bio: "Software developer with production experience building modern web applications with Next.js, React, and TypeScript.",
          avatarColor: "#479c73",
        })
        .returning();
      candidate = created;
    }

    const magicLinkToken = generateMagicToken();
    const magicLinkExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await db
      .update(candidates)
      .set({
        magicLinkToken,
        magicLinkExpiresAt,
      })
      .where(eq(candidates.id, candidate.id));

    const magicLink = `${APP_URL}/magic-link/${magicLinkToken}`;

    const emailResult = await sendCandidateLoginEmail({
      to: candidate.email,
      candidateName: candidate.fullName,
      magicLink,
    });

    return Response.json({
      ok: true,
      delivered: emailResult.delivered,
      magicLink, // Provided for easy dev testing if SMTP not configured
      message:
        "A secure sign-in link has been generated. Use the link below to enter your candidate portal.",
    });
  } catch (err: unknown) {
    console.error("Magic link generation error:", err);
    return Response.json(
      { error: "Failed to generate sign-in link. Please try again." },
      { status: 500 }
    );
  }
}
