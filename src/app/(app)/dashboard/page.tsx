import DashboardView from "./DashboardView";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import {
  candidates,
  skillCategories,
  skillDefinitions,
  skillMatrices,
  availabilities,
  placements,
  interviews,
} from "@/db/schema";
import { and, eq, gte, sql, desc } from "drizzle-orm";
import { ensureSkillTables, seedSkillDefinitions } from "@/lib/seed";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  await ensureSkillTables();
  await seedSkillDefinitions();

  const [
    candCountRow,
    availableRow,
    interviewingRow,
    offerRow,
    placedRow,
    upcomingInterviews,
    pipelineValueRow,
    placedValueRow,
    skillRows,
    categorySkillRows,
    placementStatusRows,
    recentCandidates,
    totalInterviewsRow,
    passedInterviewsRow,
    topPerformerRows,
  ] = await Promise.all([
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(candidates)
      .where(eq(candidates.ownerId, user.id)),
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(availabilities)
      .innerJoin(candidates, eq(candidates.id, availabilities.candidateId))
      .where(
        and(
          eq(candidates.ownerId, user.id),
          eq(availabilities.status, "available")
        )
      ),
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(placements)
      .innerJoin(candidates, eq(candidates.id, placements.candidateId))
      .where(
        and(
          eq(candidates.ownerId, user.id),
          eq(placements.status, "interviewing")
        )
      ),
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(placements)
      .innerJoin(candidates, eq(candidates.id, placements.candidateId))
      .where(
        and(eq(candidates.ownerId, user.id), eq(placements.status, "offer"))
      ),
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(placements)
      .innerJoin(candidates, eq(candidates.id, placements.candidateId))
      .where(
        and(eq(candidates.ownerId, user.id), eq(placements.status, "placed"))
      ),
    db
      .select({
        id: interviews.id,
        scheduledAt: interviews.scheduledAt,
        type: interviews.type,
        outcome: interviews.outcome,
        candidate: {
          id: candidates.id,
          fullName: candidates.fullName,
          avatarColor: candidates.avatarColor,
        },
      })
      .from(interviews)
      .innerJoin(candidates, eq(candidates.id, interviews.candidateId))
      .where(
        and(
          eq(candidates.ownerId, user.id),
          eq(interviews.outcome, "scheduled"),
          gte(interviews.scheduledAt, new Date())
        )
      )
      .orderBy(interviews.scheduledAt)
      .limit(5),
    db
      .select({
        v: sql<number>`coalesce(sum(${placements.valueUsd}), 0)::int`,
      })
      .from(placements)
      .innerJoin(candidates, eq(candidates.id, placements.candidateId))
      .where(
        and(
          eq(candidates.ownerId, user.id),
          sql`${placements.status} not in ('placed', 'archived')`
        )
      ),
    db
      .select({
        v: sql<number>`coalesce(sum(${placements.valueUsd}), 0)::int`,
      })
      .from(placements)
      .innerJoin(candidates, eq(candidates.id, placements.candidateId))
      .where(
        and(
          eq(candidates.ownerId, user.id),
          eq(placements.status, "placed")
        )
      ),
    db
      .select({
        name: skillDefinitions.name,
        slug: skillDefinitions.slug,
        categoryName: skillCategories.name,
        categoryColor: skillCategories.color,
        c: sql<number>`count(*)::int`,
      })
      .from(skillMatrices)
      .innerJoin(skillDefinitions, eq(skillDefinitions.id, skillMatrices.skillId))
      .innerJoin(skillCategories, eq(skillCategories.id, skillDefinitions.categoryId))
      .innerJoin(candidates, eq(candidates.id, skillMatrices.candidateId))
      .where(eq(candidates.ownerId, user.id))
      .groupBy(
        skillDefinitions.name,
        skillDefinitions.slug,
        skillCategories.name,
        skillCategories.color
      )
      .orderBy(desc(sql`count(*)`))
      .limit(8),
    db
      .select({
        name: skillCategories.name,
        slug: skillCategories.slug,
        color: skillCategories.color,
        c: sql<number>`count(*)::int`,
      })
      .from(skillMatrices)
      .innerJoin(skillDefinitions, eq(skillDefinitions.id, skillMatrices.skillId))
      .innerJoin(skillCategories, eq(skillCategories.id, skillDefinitions.categoryId))
      .innerJoin(candidates, eq(candidates.id, skillMatrices.candidateId))
      .where(eq(candidates.ownerId, user.id))
      .groupBy(
        skillCategories.name,
        skillCategories.slug,
        skillCategories.color
      )
      .orderBy(desc(sql`count(*)`)),
    db
      .select({
        status: placements.status,
        c: sql<number>`count(*)::int`,
        v: sql<number>`coalesce(sum(${placements.valueUsd}), 0)::int`,
      })
      .from(placements)
      .innerJoin(candidates, eq(candidates.id, placements.candidateId))
      .where(eq(candidates.ownerId, user.id))
      .groupBy(placements.status),
    db
      .select()
      .from(candidates)
      .where(eq(candidates.ownerId, user.id))
      .orderBy(desc(candidates.createdAt))
      .limit(5),
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(interviews)
      .innerJoin(candidates, eq(candidates.id, interviews.candidateId))
      .where(eq(candidates.ownerId, user.id)),
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(interviews)
      .innerJoin(candidates, eq(candidates.id, interviews.candidateId))
      .where(
        and(
          eq(candidates.ownerId, user.id),
          eq(interviews.outcome, "passed")
        )
      ),
    db
      .select({
        candidateId: candidates.id,
        fullName: candidates.fullName,
        avatarColor: candidates.avatarColor,
        placementsCount: sql<number>`count(*)::int`,
      })
      .from(placements)
      .innerJoin(candidates, eq(candidates.id, placements.candidateId))
      .where(
        and(
          eq(candidates.ownerId, user.id),
          eq(placements.status, "placed")
        )
      )
      .groupBy(candidates.id, candidates.fullName, candidates.avatarColor)
      .orderBy(desc(sql`count(*)`))
      .limit(1),
  ]);

  const totalCand = Number(candCountRow[0]?.c ?? 0);
  const totalIv = Number(totalInterviewsRow[0]?.c ?? 0);
  const passedIv = Number(passedInterviewsRow[0]?.c ?? 0);
  const passRate = totalIv === 0 ? 0 : Math.round((passedIv / totalIv) * 100);

  const topPerformerRow = topPerformerRows[0];
  const topPerformer = topPerformerRow
    ? {
        name: topPerformerRow.fullName,
        avatarColor: topPerformerRow.avatarColor,
        placements: Number(topPerformerRow.placementsCount),
      }
    : null;

  const candidatesSpark = makeSpark(totalCand, 8);
  const pipelineSpark = makeSpark(Number(pipelineValueRow[0]?.v ?? 0) / 1000, 8);
  const interviewingSpark = makeSpark(Number(interviewingRow[0]?.c ?? 0), 8);
  const availableSpark = makeSpark(Number(availableRow[0]?.c ?? 0), 8);

  const skillMix = skillRows.map((s) => ({
    name: s.name,
    slug: s.slug,
    categoryName: s.categoryName,
    categoryColor: s.categoryColor,
    count: Number(s.c),
  }));

  const categoryMix = categorySkillRows.map((c) => ({
    name: c.name,
    slug: c.slug,
    color: c.color,
    count: Number(c.c),
  }));

  return (
    <DashboardView
      userName={user.name}
      topPerformer={topPerformer}
      stats={{
        candidates: totalCand,
        available: Number(availableRow[0]?.c ?? 0),
        interviewing: Number(interviewingRow[0]?.c ?? 0),
        offers: Number(offerRow[0]?.c ?? 0),
        placed: Number(placedRow[0]?.c ?? 0),
        pipelineValue: Number(pipelineValueRow[0]?.v ?? 0),
        placedValue: Number(placedValueRow[0]?.v ?? 0),
        passRate,
      }}
      upcomingInterviews={upcomingInterviews.map((i) => ({
        id: i.id,
        scheduledAt: i.scheduledAt.toISOString(),
        type: i.type,
        outcome: i.outcome,
        candidate: i.candidate,
      }))}
      skillsByFramework={Object.fromEntries(
        skillRows.map((s) => [s.slug, Number(s.c)])
      )}
      skillMix={skillMix}
      categoryMix={categoryMix}
      placementsByStatus={Object.fromEntries(
        placementStatusRows.map((p) => [
          p.status,
          { count: Number(p.c), value: Number(p.v) },
        ])
      )}
      recentCandidates={recentCandidates.map((c) => ({
        id: c.id,
        fullName: c.fullName,
        headline: c.headline,
        avatarColor: c.avatarColor,
        seniority: c.seniority,
        region: c.region,
        verification: c.verification,
      }))}
      sparklines={{
        candidates: candidatesSpark,
        pipeline: pipelineSpark,
        interviewing: interviewingSpark,
        available: availableSpark,
      }}
    />
  );
}

function makeSpark(target: number, length: number): number[] {
  if (target <= 0) {
    return Array.from({ length }, () => Math.round(Math.random() * 2));
  }
  const arr: number[] = [];
  let prev = Math.max(0, target - Math.round(target * 0.4));
  for (let i = 0; i < length - 1; i++) {
    const delta = (target - prev) / (length - i);
    const jitter = (Math.random() - 0.5) * Math.max(1, target * 0.12);
    const next = Math.max(0, Math.round(prev + delta + jitter));
    arr.push(next);
    prev = next;
  }
  arr.push(target);
  return arr;
}
