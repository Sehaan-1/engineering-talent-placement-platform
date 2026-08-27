import { requireCandidate } from "@/lib/auth";
import { db } from "@/db";
import {
  placements,
  clients,
  interviews,
  availabilities,
  skillMatrices,
  skillDefinitions,
} from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import CandidateDashboardView from "./CandidateDashboardView";

export const dynamic = "force-dynamic";

export default async function CandidateDashboardPage() {
  const { user, candidate } = await requireCandidate();

  const [placementRows, interviewRows, availabilityRows, skillRows] =
    await Promise.all([
      db
        .select({
          placement: placements,
          client: clients,
        })
        .from(placements)
        .leftJoin(clients, eq(clients.id, placements.clientId))
        .where(eq(placements.candidateId, candidate.id))
        .orderBy(desc(placements.updatedAt)),
      db
        .select()
        .from(interviews)
        .where(eq(interviews.candidateId, candidate.id))
        .orderBy(desc(interviews.scheduledAt)),
      db
        .select()
        .from(availabilities)
        .where(eq(availabilities.candidateId, candidate.id))
        .orderBy(desc(availabilities.weekStart))
        .limit(1),
      db
        .select({
          matrix: skillMatrices,
          definition: skillDefinitions,
        })
        .from(skillMatrices)
        .innerJoin(
          skillDefinitions,
          eq(skillDefinitions.id, skillMatrices.skillId)
        )
        .where(eq(skillMatrices.candidateId, candidate.id))
        .orderBy(desc(skillMatrices.lastUsedAt)),
    ]);

  const latestAvailability = availabilityRows[0] ?? null;

  return (
    <CandidateDashboardView
      candidate={{
        ...candidate,
        createdAt: candidate.createdAt.toISOString(),
        updatedAt: candidate.updatedAt.toISOString(),
      }}
      placements={placementRows.map((p) => ({
        ...p.placement,
        client: p.client,
        createdAt: p.placement.createdAt.toISOString(),
        updatedAt: p.placement.updatedAt.toISOString(),
        startDate: p.placement.startDate
          ? p.placement.startDate.toISOString()
          : null,
      }))}
      interviews={interviewRows.map((i) => ({
        ...i,
        scheduledAt: i.scheduledAt.toISOString(),
      }))}
      availability={
        latestAvailability
          ? {
              ...latestAvailability,
              weekStart: latestAvailability.weekStart.toISOString(),
            }
          : null
      }
      skills={skillRows.map((s) => ({
        id: s.matrix.id,
        skillId: s.matrix.skillId,
        name: s.definition.name,
        slug: s.definition.slug,
        proficiency: s.matrix.proficiency,
        yearsUsed: s.matrix.yearsUsed,
        notes: s.matrix.notes,
        lastUsedAt: s.matrix.lastUsedAt.toISOString(),
      }))}
    />
  );
}
