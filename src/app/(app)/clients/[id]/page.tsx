import { requireUser } from "@/lib/auth";
import { db } from "@/db";
import {
  clients,
  clientContacts,
  placements,
  candidates,
  shortlists,
} from "@/db/schema";
import { ensurePhase2Tables } from "@/lib/seed";
import { and, desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import ClientDetailView from "./ClientDetailView";

export const dynamic = "force-dynamic";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  await ensurePhase2Tables();

  const { id } = await params;
  const clientId = Number(id);
  if (!Number.isFinite(clientId)) notFound();

  const [clientRows, contactsList, placementRows, shortlistRows, allUserPlacements] =
    await Promise.all([
      db
        .select()
        .from(clients)
        .where(and(eq(clients.id, clientId), eq(clients.ownerId, user.id)))
        .limit(1),
      db
        .select()
        .from(clientContacts)
        .where(eq(clientContacts.clientId, clientId))
        .orderBy(desc(clientContacts.isPrimary), desc(clientContacts.createdAt)),
      db
        .select({
          placement: placements,
          candidate: candidates,
        })
        .from(placements)
        .innerJoin(candidates, eq(candidates.id, placements.candidateId))
        .where(eq(placements.clientId, clientId))
        .orderBy(desc(placements.updatedAt)),
      db
        .select({
          shortlist: shortlists,
          placement: placements,
          candidate: candidates,
        })
        .from(shortlists)
        .innerJoin(placements, eq(placements.id, shortlists.placementId))
        .innerJoin(candidates, eq(candidates.id, placements.candidateId))
        .where(eq(shortlists.clientId, clientId))
        .orderBy(desc(shortlists.sharedAt)),
      db
        .select({
          id: placements.id,
          roleTitle: placements.roleTitle,
          clientName: placements.clientName,
          clientId: placements.clientId,
          candidateName: candidates.fullName,
        })
        .from(placements)
        .innerJoin(candidates, eq(candidates.id, placements.candidateId))
        .where(eq(candidates.ownerId, user.id)),
    ]);

  if (clientRows.length === 0) {
    notFound();
  }

  const client = {
    ...clientRows[0],
    createdAt: clientRows[0].createdAt.toISOString(),
    updatedAt: clientRows[0].updatedAt.toISOString(),
  };

  const contacts = contactsList.map((c) => ({
    ...c,
    createdAt: c.createdAt.toISOString(),
  }));

  const clientPlacements = placementRows.map((r) => ({
    ...r.placement,
    startDate: r.placement.startDate ? r.placement.startDate.toISOString() : null,
    createdAt: r.placement.createdAt.toISOString(),
    updatedAt: r.placement.updatedAt.toISOString(),
    candidate: {
      id: r.candidate.id,
      fullName: r.candidate.fullName,
      headline: r.candidate.headline,
      avatarColor: r.candidate.avatarColor,
      seniority: r.candidate.seniority,
      hourlyRateUsd: r.candidate.hourlyRateUsd,
    },
  }));

  const clientShortlists = shortlistRows.map((r) => ({
    id: r.shortlist.id,
    placementId: r.shortlist.placementId,
    accessToken: r.shortlist.accessToken,
    sharedAt: r.shortlist.sharedAt.toISOString(),
    expiresAt: r.shortlist.expiresAt.toISOString(),
    placement: {
      id: r.placement.id,
      roleTitle: r.placement.roleTitle,
      status: r.placement.status,
    },
    candidate: {
      id: r.candidate.id,
      fullName: r.candidate.fullName,
      avatarColor: r.candidate.avatarColor,
    },
  }));

  const linkablePlacements = allUserPlacements
    .filter((p) => p.clientId !== clientId)
    .map((p) => ({
      id: p.id,
      roleTitle: p.roleTitle,
      clientName: p.clientName,
      candidateName: p.candidateName,
    }));

  return (
    <div className="content">
      <ClientDetailView
        client={client}
        contacts={contacts}
        placements={clientPlacements}
        shortlists={clientShortlists}
        linkablePlacements={linkablePlacements}
      />
    </div>
  );
}
