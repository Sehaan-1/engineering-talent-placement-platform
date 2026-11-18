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
import { getJsonBody, jsonError } from "@/lib/types";
import { eq, and, gt, desc } from "drizzle-orm";
import { createNotification } from "@/lib/notify";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  await ensurePhase2Tables();

  const { token } = await params;
  if (!token) return jsonError("Token is required", 400);

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
    return jsonError("Shortlist link not found", 404);
  }

  const data = rows[0];
  const isExpired = new Date(data.shortlist.expiresAt) < new Date();

  if (isExpired) {
    return Response.json(
      {
        error: "This shortlist link has expired.",
        expired: true,
        expiresAt: data.shortlist.expiresAt,
        client: {
          name: data.client.name,
          logoColor: data.client.logoColor,
        },
      },
      { status: 410 }
    );
  }

  const [skillsData, availRows] = await Promise.all([
    db
      .select({
        matrix: skillMatrices,
        definition: skillDefinitions,
        category: skillCategories,
      })
      .from(skillMatrices)
      .innerJoin(skillDefinitions, eq(skillDefinitions.id, skillMatrices.skillId))
      .innerJoin(skillCategories, eq(skillCategories.id, skillDefinitions.categoryId))
      .where(eq(skillMatrices.candidateId, data.candidate.id)),
    db
      .select({ status: availabilities.status })
      .from(availabilities)
      .where(eq(availabilities.candidateId, data.candidate.id))
      .orderBy(desc(availabilities.weekStart))
      .limit(1),
  ]);

  return Response.json({
    shortlist: {
      id: data.shortlist.id,
      sharedAt: data.shortlist.sharedAt,
      expiresAt: data.shortlist.expiresAt,
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
      startDate: data.placement.startDate,
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
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  await ensurePhase2Tables();

  const { token } = await params;
  if (!token) return jsonError("Token is required", 400);

  const rows = await db
    .select({
      shortlist: shortlists,
      placement: placements,
      candidate: candidates,
      client: clients,
    })
    .from(shortlists)
    .innerJoin(placements, eq(placements.id, shortlists.placementId))
    .innerJoin(candidates, eq(candidates.id, placements.candidateId))
    .innerJoin(clients, eq(clients.id, shortlists.clientId))
    .where(and(eq(shortlists.accessToken, token), gt(shortlists.expiresAt, new Date())))
    .limit(1);

  if (rows.length === 0) {
    return jsonError("Shortlist not found or expired", 404);
  }

  const { placement, candidate, client } = rows[0];
  const body = await getJsonBody<{
    action?: "approve" | "reject" | "request_interview";
    feedback?: string;
  }>(req);

  if (!body || !body.action) {
    return jsonError("Action is required ('approve' | 'reject' | 'request_interview')");
  }

  let newStatus: typeof placement.status = placement.status;
  let actionNote = "";

  if (body.action === "approve") {
    newStatus = "offer";
    actionNote = `[Client Approved via Shortlist] ${body.feedback ?? "Client approved candidate for placement."}`;
  } else if (body.action === "reject") {
    newStatus = "archived";
    actionNote = `[Client Declined via Shortlist] ${body.feedback ?? "Client passed on candidate."}`;
  } else if (body.action === "request_interview") {
    newStatus = "interviewing";
    actionNote = `[Client Interview Request] ${body.feedback ?? "Client requested interview."}`;
  } else {
    return jsonError("Invalid action");
  }

  const combinedNotes = placement.notes
    ? `${placement.notes}\n\n${actionNote}`
    : actionNote;

  const [updated] = await db
    .update(placements)
    .set({
      status: newStatus,
      notes: combinedNotes,
      updatedAt: new Date(),
    })
    .where(eq(placements.id, placement.id))
    .returning();

  await createNotification(
    candidate.ownerId,
    "status_changed",
    `Shortlist: ${body.action === "approve" ? "Candidate Approved" : body.action === "request_interview" ? "Interview Requested" : "Candidate Declined"}`,
    `${client.name} responded to shortlist for ${candidate.fullName} (${placement.roleTitle})`,
    `/placements`
  );

  return Response.json({
    ok: true,
    action: body.action,
    placement: {
      id: updated.id,
      status: updated.status,
      notes: updated.notes,
    },
  });
}
