import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getOrgContext } from "@/lib/org";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import ToastHost from "@/components/ToastHost";
import { db } from "@/db";
import { candidates, clients, interviews, placements } from "@/db/schema";
import { ensurePhase5Tables } from "@/lib/seed";
import { eq, and, gte } from "drizzle-orm";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  await ensurePhase5Tables();

  let ctx;
  try {
    ctx = await getOrgContext();
  } catch {
    redirect("/login");
  }

  const { org, membership, allOrgs } = ctx;

  const [cand, upcomingIvs, pl, cl] = await Promise.all([
    db
      .select({ id: candidates.id })
      .from(candidates)
      .where(eq(candidates.orgId, org.id)),
    db
      .select({ id: interviews.id })
      .from(interviews)
      .innerJoin(candidates, eq(candidates.id, interviews.candidateId))
      .where(
        and(
          eq(candidates.orgId, org.id),
          eq(interviews.outcome, "scheduled"),
          gte(interviews.scheduledAt, new Date())
        )
      ),
    db
      .select({ id: placements.id })
      .from(placements)
      .innerJoin(candidates, eq(candidates.id, placements.candidateId))
      .where(eq(candidates.orgId, org.id)),
    db
      .select({ id: clients.id })
      .from(clients)
      .where(eq(clients.orgId, org.id)),
  ]);

  return (
    <div className="app-shell">
      <Sidebar
        user={{
          id: user.id,
          name: user.name,
          email: user.email,
          avatarColor: user.avatarColor,
        }}
        org={{
          id: org.id,
          name: org.name,
          plan: org.plan,
          logoColor: org.logoColor,
        }}
        memberRole={membership.role}
        allOrgs={allOrgs}
        counts={{
          candidates: cand.length,
          interviews: upcomingIvs.length,
          placements: pl.length,
          clients: cl.length,
        }}
      />
      <div className="main">
        <Topbar orgName={org.name} />
        {children}
        <ToastHost />
      </div>
    </div>
  );
}
