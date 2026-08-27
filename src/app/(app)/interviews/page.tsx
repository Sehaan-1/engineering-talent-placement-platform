import InterviewsView from "./InterviewsView";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { candidates, interviews, placements } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function InterviewsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const now = new Date();
  const rows = await db
    .select({
      interview: interviews,
      candidate: candidates,
      placement: placements,
    })
    .from(interviews)
    .innerJoin(candidates, eq(candidates.id, interviews.candidateId))
    .leftJoin(placements, eq(placements.id, interviews.placementId))
    .where(eq(candidates.ownerId, user.id))
    .orderBy(desc(interviews.scheduledAt));

  const allCandidates = await db
    .select({
      id: candidates.id,
      fullName: candidates.fullName,
      avatarColor: candidates.avatarColor,
    })
    .from(candidates)
    .where(eq(candidates.ownerId, user.id))
    .orderBy(desc(candidates.createdAt));

  const allPlacements = await db
    .select({
      id: placements.id,
      candidateId: placements.candidateId,
      clientName: placements.clientName,
      roleTitle: placements.roleTitle,
    })
    .from(placements)
    .innerJoin(candidates, eq(candidates.id, placements.candidateId))
    .where(eq(candidates.ownerId, user.id))
    .orderBy(desc(placements.updatedAt));

  return (
    <InterviewsView
      interviews={rows.map((r) => ({
        ...r.interview,
        scheduledAt: r.interview.scheduledAt.toISOString(),
        candidate: {
          id: r.candidate.id,
          fullName: r.candidate.fullName,
          avatarColor: r.candidate.avatarColor,
        },
        placement: r.placement
          ? {
              id: r.placement.id,
              clientName: r.placement.clientName,
              roleTitle: r.placement.roleTitle,
            }
          : null,
      }))}
      candidates={allCandidates}
      placements={allPlacements}
      now={now.toISOString()}
    />
  );
}
