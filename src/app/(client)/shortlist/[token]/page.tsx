import { db } from "@/db";
import {
  shortlists,
  placements,
  clients,
  candidates,
  skillMatrices,
  skillDefinitions,
  skillCategories,
  availabilities,
} from "@/db/schema";
import { ensurePhase2Tables } from "@/lib/seed";
import { eq, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import ShortlistView from "./ShortlistView";
import Link from "next/link";
import { IconHourglass, IconShield } from "@/components/Icon";

export const dynamic = "force-dynamic";

export default async function ShortlistPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  await ensurePhase2Tables();

  const { token } = await params;
  if (!token) notFound();

  const rows = await db
    .select({
      shortlist: shortlists,
      placement: placements,
      client: clients,
      candidate: candidates,
    })
    .from(shortlists)
    .innerJoin(placements, eq(placements.id, shortlists.placementId))
    .innerJoin(clients, eq(clients.id, shortlists.clientId))
    .innerJoin(candidates, eq(candidates.id, placements.candidateId))
    .where(eq(shortlists.accessToken, token))
    .limit(1);

  if (rows.length === 0) {
    return (
      <div
        className="card card-pad"
        style={{
          maxWidth: 600,
          margin: "40px auto",
          textAlign: "center",
          background: "#fff",
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            background: "var(--pebble-soft)",
            color: "var(--ink-muted)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
          }}
        >
          <IconHourglass size={24} />
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 8px" }}>
          Shortlist Not Found
        </h2>
        <p style={{ fontSize: 14, color: "var(--ink-muted)", margin: "0 0 20px" }}>
          This shortlist link is invalid or may have been revoked. Please check
          with your recruiting partner for an updated link.
        </p>
      </div>
    );
  }

  const data = rows[0];
  const isExpired = new Date(data.shortlist.expiresAt) < new Date();

  if (isExpired) {
    return (
      <div
        className="card card-pad"
        style={{
          maxWidth: 600,
          margin: "40px auto",
          textAlign: "center",
          background: "#fff",
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            background: "var(--ruby-soft)",
            color: "var(--ruby)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
          }}
        >
          <IconHourglass size={24} />
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 8px" }}>
          Shortlist Link Expired
        </h2>
        <p style={{ fontSize: 14, color: "var(--ink-muted)", margin: "0 0 20px" }}>
          The candidate review link for <strong>{data.client.name}</strong> (
          {data.placement.roleTitle}) expired on{" "}
          {new Date(data.shortlist.expiresAt).toLocaleDateString()}. Please
          request a fresh link from your talent partner.
        </p>
      </div>
    );
  }

  // Fetch candidate skills
  const skillsData = await db
    .select({
      matrix: skillMatrices,
      definition: skillDefinitions,
      category: skillCategories,
    })
    .from(skillMatrices)
    .innerJoin(skillDefinitions, eq(skillDefinitions.id, skillMatrices.skillId))
    .innerJoin(skillCategories, eq(skillCategories.id, skillDefinitions.categoryId))
    .where(eq(skillMatrices.candidateId, data.candidate.id));

  const availRows = await db
    .select({ status: availabilities.status })
    .from(availabilities)
    .where(eq(availabilities.candidateId, data.candidate.id))
    .orderBy(desc(availabilities.weekStart))
    .limit(1);

  const initialData = {
    shortlist: {
      id: data.shortlist.id,
      sharedAt: data.shortlist.sharedAt.toISOString(),
      expiresAt: data.shortlist.expiresAt.toISOString(),
    },
    client: {
      id: data.client.id,
      name: data.client.name,
      website: data.client.website,
      industry: data.client.industry,
      contactName: data.client.contactName,
      logoColor: data.client.logoColor,
    },
    placement: {
      id: data.placement.id,
      roleTitle: data.placement.roleTitle,
      status: data.placement.status,
      startDate: data.placement.startDate ? data.placement.startDate.toISOString() : null,
      notes: data.placement.notes,
    },
    candidate: {
      id: data.candidate.id,
      fullName: data.candidate.fullName,
      headline: data.candidate.headline,
      location: data.candidate.location,
      region: data.candidate.region,
      timezone: data.candidate.timezone,
      timezoneOverlap: data.candidate.timezoneOverlap,
      seniority: data.candidate.seniority,
      yearsExperience: data.candidate.yearsExperience,
      hourlyRateUsd: data.candidate.hourlyRateUsd,
      verification: data.candidate.verification,
      bio: data.candidate.bio,
      portfolioUrl: data.candidate.portfolioUrl,
      githubUrl: data.candidate.githubUrl,
      linkedinUrl: data.candidate.linkedinUrl,
      tags: data.candidate.tags,
      avatarColor: data.candidate.avatarColor,
      availabilityStatus: availRows[0]?.status ?? "available",
      skills: skillsData.map((s) => ({
        id: s.definition.id,
        name: s.definition.name,
        slug: s.definition.slug,
        category: s.category.name,
        categoryColor: s.category.color,
        proficiency: s.matrix.proficiency,
        yearsUsed: s.matrix.yearsUsed,
      })),
    },
  };

  return <ShortlistView token={token} initialData={initialData} />;
}
