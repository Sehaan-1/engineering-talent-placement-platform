import { db } from "@/db";
import { candidates } from "@/db/schema";
import { generateMagicToken } from "@/lib/auth";
import { sendCandidateLoginEmail, APP_URL } from "@/lib/email";
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

    const candidateRows = await db
      .select()
      .from(candidates)
      .where(eq(candidates.email, email))
      .limit(1);

    if (candidateRows.length === 0) {
      // Don't leak whether email exists
      return Response.json({
        ok: true,
        message:
          "If your email is registered in our talent network, you will receive a secure sign-in link shortly.",
      });
    }

    const candidate = candidateRows[0];
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
        "A secure sign-in link has been sent to your email. Click it to access your portal.",
    });
  } catch (err: unknown) {
    console.error("Magic link generation error:", err);
    return Response.json(
      { error: "Failed to generate sign-in link. Please try again." },
      { status: 500 }
    );
  }
}
