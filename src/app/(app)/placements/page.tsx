import PlacementsView from "./PlacementsView";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { candidates, placements, interviews } from "@/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

const ALLOWED = new Set([
  "sourced",
  "screening",
  "submitted",
  "interviewing",
  "offer",
  "placed",
  "archived",
]);

type SearchParams = Promise<{ status?: string }>;

export default async function PlacementsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const sp = await searchParams;
  const status = sp.status?.trim() ?? "";
  const where =
    status && ALLOWED.has(status)
      ? and(
          eq(candidates.ownerId, user.id),
          eq(placements.status, status as "sourced")
        )
      : eq(candidates.ownerId, user.id);

  const rows = await db
    .select({
      placement: placements,
      candidate: candidates,
    })
    .from(placements)
    .innerJoin(candidates, eq(candidates.id, placements.candidateId))
    .where(where)
    .orderBy(desc(placements.updatedAt));

  const counts = await db
    .select({
      status: placements.status,
      c: sql<number>`count(*)::int`,
      v: sql<number>`coalesce(sum(${placements.valueUsd}), 0)::int`,
    })
    .from(placements)
    .innerJoin(candidates, eq(candidates.id, placements.candidateId))
    .where(eq(candidates.ownerId, user.id))
    .groupBy(placements.status);

  const interviewCounts = await db
    .select({
      placementId: interviews.placementId,
      c: sql<number>`count(*)::int`,
    })
    .from(interviews)
    .innerJoin(candidates, eq(candidates.id, interviews.candidateId))
    .where(eq(candidates.ownerId, user.id))
    .groupBy(interviews.placementId);

  const interviewCountMap = new Map<number, number>();
  for (const r of interviewCounts) {
    if (r.placementId != null) interviewCountMap.set(r.placementId, Number(r.c));
  }

  return (
    <PlacementsView
      placements={rows.map((r) => ({
        ...r.placement,
        createdAt: r.placement.createdAt.toISOString(),
        updatedAt: r.placement.updatedAt.toISOString(),
        startDate: r.placement.startDate
          ? r.placement.startDate.toISOString()
          : null,
        candidate: {
          id: r.candidate.id,
          fullName: r.candidate.fullName,
          avatarColor: r.candidate.avatarColor,
          seniority: r.candidate.seniority,
        },
        interviews: interviewCountMap.get(r.placement.id) ?? 0,
      }))}
      statusCounts={Object.fromEntries(
        counts.map((c) => [c.status, { count: Number(c.c), value: Number(c.v) }])
      )}
      statusFilter={status}
    />
  );
}
