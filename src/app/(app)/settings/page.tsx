import SettingsView from "./SettingsView";
import { getOrgContext } from "@/lib/org";
import { redirect } from "next/navigation";
import { db } from "@/db";
import {
  candidates,
  placements,
  interviews,
  availabilities,
  skillMatrices,
  orgMembers,
} from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  let ctx;
  try {
    ctx = await getOrgContext();
  } catch {
    redirect("/login");
  }

  const { user, org, membership } = ctx;

  const [c, p, iv, a, sk, members] = await Promise.all([
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(candidates)
      .where(eq(candidates.orgId, org.id)),
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(placements)
      .innerJoin(candidates, eq(candidates.id, placements.candidateId))
      .where(eq(candidates.orgId, org.id)),
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(interviews)
      .innerJoin(candidates, eq(candidates.id, interviews.candidateId))
      .where(eq(candidates.orgId, org.id)),
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(availabilities)
      .innerJoin(candidates, eq(candidates.id, availabilities.candidateId))
      .where(eq(candidates.orgId, org.id)),
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(skillMatrices)
      .innerJoin(candidates, eq(candidates.id, skillMatrices.candidateId))
      .where(eq(candidates.orgId, org.id)),
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(orgMembers)
      .where(eq(orgMembers.orgId, org.id)),
  ]);

  return (
    <SettingsView
      user={{
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarColor: user.avatarColor,
      }}
      org={{
        id: org.id,
        name: org.name,
        plan: org.plan,
        logoColor: org.logoColor,
      }}
      memberRole={membership.role}
      counts={{
        candidates: Number(c[0]?.c ?? 0),
        placements: Number(p[0]?.c ?? 0),
        interviews: Number(iv[0]?.c ?? 0),
        availability: Number(a[0]?.c ?? 0),
        skills: Number(sk[0]?.c ?? 0),
        members: Number(members[0]?.c ?? 0),
      }}
    />
  );
}
