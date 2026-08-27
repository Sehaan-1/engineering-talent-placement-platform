import { getCurrentUser } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/db";
import {
  candidates,
  skillMatrices,
  availabilities,
  placements,
  interviews,
} from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import CandidateDetailView from "./CandidateDetailView";

export const dynamic = "force-dynamic";

export default async function CandidateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { id } = await params;
  const candidateId = Number(id);
  if (!Number.isFinite(candidateId)) notFound();

  const candidateRow = await db
    .select()
    .from(candidates)
    .where(
      and(eq(candidates.id, candidateId), eq(candidates.ownerId, user.id))
    )
    .limit(1);
  if (candidateRow.length === 0) notFound();
  const candidate = candidateRow[0];

  const [skills, availability, candidatePlacements, interviewRows] =
    await Promise.all([
      db
        .select()
        .from(skillMatrices)
        .where(eq(skillMatrices.candidateId, candidateId))
        .orderBy(desc(skillMatrices.lastUsedAt)),
      db
        .select()
        .from(availabilities)
        .where(eq(availabilities.candidateId, candidateId))
        .orderBy(desc(availabilities.weekStart)),
      db
        .select()
        .from(placements)
        .where(eq(placements.candidateId, candidateId))
        .orderBy(desc(placements.updatedAt)),
      db
        .select()
        .from(interviews)
        .where(eq(interviews.candidateId, candidateId))
        .orderBy(desc(interviews.scheduledAt)),
    ]);

  return (
    <CandidateDetailView
      candidate={{
        ...candidate,
        inviteExpiresAt: candidate.inviteExpiresAt
          ? candidate.inviteExpiresAt.toISOString()
          : null,
        magicLinkExpiresAt: candidate.magicLinkExpiresAt
          ? candidate.magicLinkExpiresAt.toISOString()
          : null,
        createdAt: candidate.createdAt.toISOString(),
        updatedAt: candidate.updatedAt.toISOString(),
      }}
      skills={skills.map((s) => ({
        ...s,
        lastUsedAt: s.lastUsedAt.toISOString(),
      }))}
      availability={availability.map((a) => ({
        ...a,
        weekStart: a.weekStart.toISOString(),
      }))}
      placements={candidatePlacements.map((p) => ({
        ...p,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
        startDate: p.startDate ? p.startDate.toISOString() : null,
      }))}
      interviews={interviewRows.map((i) => ({
        ...i,
        scheduledAt: i.scheduledAt.toISOString(),
      }))}
    />
  );
}
