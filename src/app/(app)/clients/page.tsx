import { requireUser } from "@/lib/auth";
import { db } from "@/db";
import { clients, placements, shortlists, candidates } from "@/db/schema";
import { ensurePhase2Tables } from "@/lib/seed";
import { eq, desc, sql } from "drizzle-orm";
import ClientsView from "./ClientsView";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const user = await requireUser();
  await ensurePhase2Tables();

  const [clientRows, unlinkedPlacementRows, allShortlistRows] =
    await Promise.all([
      db
        .select({
          id: clients.id,
          name: clients.name,
          website: clients.website,
          industry: clients.industry,
          contactName: clients.contactName,
          contactEmail: clients.contactEmail,
          logoColor: clients.logoColor,
          createdAt: clients.createdAt,
          updatedAt: clients.updatedAt,
          placementCount: sql<number>`count(distinct ${placements.id})::int`,
          activePlacementCount: sql<number>`count(distinct case when ${placements.status} in ('sourced', 'screening', 'submitted', 'interviewing', 'offer') then ${placements.id} end)::int`,
        })
        .from(clients)
        .leftJoin(placements, eq(placements.clientId, clients.id))
        .where(eq(clients.ownerId, user.id))
        .groupBy(clients.id)
        .orderBy(desc(clients.updatedAt)),
      db
        .select({
          id: placements.id,
          roleTitle: placements.roleTitle,
          clientName: placements.clientName,
          candidateName: candidates.fullName,
        })
        .from(placements)
        .innerJoin(candidates, eq(candidates.id, placements.candidateId))
        .where(eq(candidates.ownerId, user.id)),
      db
        .select({
          id: shortlists.id,
          accessToken: shortlists.accessToken,
          expiresAt: shortlists.expiresAt,
          clientId: shortlists.clientId,
        })
        .from(shortlists)
        .innerJoin(clients, eq(clients.id, shortlists.clientId))
        .where(eq(clients.ownerId, user.id)),
    ]);

  const initialClients = clientRows.map((c) => ({
    ...c,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }));

  const allPlacements = unlinkedPlacementRows.map((p) => ({
    id: p.id,
    roleTitle: p.roleTitle,
    clientName: p.clientName,
    candidateName: p.candidateName,
  }));

  const activeShortlistsCount = allShortlistRows.filter(
    (s) => new Date(s.expiresAt) > new Date()
  ).length;

  return (
    <div className="content">
      <ClientsView
        initialClients={initialClients}
        allPlacements={allPlacements}
        activeShortlistsCount={activeShortlistsCount}
      />
    </div>
  );
}
