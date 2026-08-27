import { db } from "@/db";
import { candidates } from "@/db/schema";
import { requireUser, generateMagicToken } from "@/lib/auth";
import { sendCandidateInviteEmail, APP_URL } from "@/lib/email";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    if (user.role === "candidate") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const candidateId = Number(id);
    if (!Number.isFinite(candidateId)) {
      return Response.json({ error: "Invalid candidate ID" }, { status: 400 });
    }

    const candidateRows = await db
      .select()
      .from(candidates)
      .where(
        and(eq(candidates.id, candidateId), eq(candidates.ownerId, user.id))
      )
      .limit(1);

    if (candidateRows.length === 0) {
      return Response.json({ error: "Candidate not found" }, { status: 404 });
    }

    const candidate = candidateRows[0];
    const inviteToken = generateMagicToken();
    const inviteExpiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours

    await db
      .update(candidates)
      .set({
        inviteToken,
        inviteExpiresAt,
      })
      .where(eq(candidates.id, candidate.id));

    const inviteLink = `${APP_URL}/invite/${inviteToken}`;

    const emailResult = await sendCandidateInviteEmail({
      to: candidate.email,
      candidateName: candidate.fullName,
      inviteLink,
    });

    import("@/lib/notify").then(({ createNotification }) => {
      createNotification(
        user.id,
        "candidate_invited",
        "Portal Invitation Sent",
        `Invited ${candidate.fullName} (${candidate.email}) to candidate portal`,
        `/candidates/${candidate.id}`
      );
    });

    return Response.json({
      ok: true,
      inviteLink,
      delivered: emailResult.delivered,
      candidate: {
        id: candidate.id,
        fullName: candidate.fullName,
        email: candidate.email,
        userId: candidate.userId,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    const status = message === "UNAUTHORIZED" ? 401 : 500;
    return Response.json({ error: message }, { status });
  }
}
