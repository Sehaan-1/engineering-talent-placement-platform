import AvailabilityView from "./AvailabilityView";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { candidates, availabilities } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function AvailabilityPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const rows = await db
    .select({
      availability: availabilities,
      candidate: candidates,
    })
    .from(availabilities)
    .innerJoin(candidates, eq(candidates.id, availabilities.candidateId))
    .where(eq(candidates.ownerId, user.id))
    .orderBy(desc(availabilities.weekStart));

  const allCandidates = await db
    .select({
      id: candidates.id,
      fullName: candidates.fullName,
      avatarColor: candidates.avatarColor,
    })
    .from(candidates)
    .where(eq(candidates.ownerId, user.id))
    .orderBy(desc(candidates.createdAt));

  return (
    <AvailabilityView
      entries={rows.map((r) => ({
        ...r.availability,
        weekStart: r.availability.weekStart.toISOString(),
        candidate: {
          id: r.candidate.id,
          fullName: r.candidate.fullName,
          avatarColor: r.candidate.avatarColor,
          region: r.candidate.region,
        },
      }))}
      candidates={allCandidates}
    />
  );
}
