import { db } from "@/db";
import {
  candidates,
  skillMatrices,
  skillDefinitions,
  availabilities,
  placements,
  interviews,
  clients,
} from "@/db/schema";
import { requireCandidate } from "@/lib/auth";
import { eq, desc } from "drizzle-orm";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const ALLOWED_PROFS = new Set(["learning", "working", "strong", "expert"]);
const ALLOWED_AVAIL_STATUS = new Set(["available", "limited", "booked", "on-leave"]);

export async function GET() {
  try {
    const { user, candidate } = await requireCandidate();

    const [skills, availabilityRows, placementRows, interviewRows] =
      await Promise.all([
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
        db
          .select()
          .from(availabilities)
          .where(eq(availabilities.candidateId, candidate.id))
          .orderBy(desc(availabilities.weekStart))
          .limit(10),
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
      ]);

    return Response.json({
      candidate,
      skills: skills.map((s) => ({
        id: s.matrix.id,
        skillId: s.matrix.skillId,
        name: s.definition.name,
        slug: s.definition.slug,
        proficiency: s.matrix.proficiency,
        yearsUsed: s.matrix.yearsUsed,
        notes: s.matrix.notes,
        lastUsedAt: s.matrix.lastUsedAt,
      })),
      availability: availabilityRows,
      placements: placementRows.map((p) => ({
        ...p.placement,
        client: p.client,
      })),
      interviews: interviewRows,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unauthorized";
    return Response.json(
      { error: msg },
      { status: msg === "FORBIDDEN" ? 403 : msg === "UNAUTHORIZED" ? 401 : 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { candidate } = await requireCandidate();
    const body = await req.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const updates: Partial<typeof candidates.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (typeof body.headline === "string") updates.headline = body.headline.trim();
    if (typeof body.bio === "string") updates.bio = body.bio.trim();
    if (typeof body.location === "string") updates.location = body.location.trim();
    if (typeof body.timezone === "string") updates.timezone = body.timezone.trim();
    if (typeof body.timezoneOverlap === "string") updates.timezoneOverlap = body.timezoneOverlap.trim();
    if (typeof body.portfolioUrl === "string") updates.portfolioUrl = body.portfolioUrl.trim() || null;
    if (typeof body.githubUrl === "string") updates.githubUrl = body.githubUrl.trim() || null;
    if (typeof body.linkedinUrl === "string") updates.linkedinUrl = body.linkedinUrl.trim() || null;
    if (typeof body.phone === "string") updates.phone = body.phone.trim() || null;
    if (typeof body.hourlyRateUsd === "number" && body.hourlyRateUsd > 0) {
      updates.hourlyRateUsd = Math.round(body.hourlyRateUsd);
    }
    if (Array.isArray(body.tags)) {
      updates.tags = body.tags.filter((t: unknown) => typeof t === "string");
    }

    const [updatedCandidate] = await db
      .update(candidates)
      .set(updates)
      .where(eq(candidates.id, candidate.id))
      .returning();

    // Update Skills if provided
    if (Array.isArray(body.skills)) {
      await db
        .delete(skillMatrices)
        .where(eq(skillMatrices.candidateId, candidate.id));

      for (const sk of body.skills) {
        const skillId = Number(sk.skillId);
        if (Number.isFinite(skillId) && ALLOWED_PROFS.has(sk.proficiency)) {
          await db.insert(skillMatrices).values({
            candidateId: candidate.id,
            skillId,
            proficiency: sk.proficiency,
            yearsUsed: Math.max(1, Math.floor(Number(sk.yearsUsed) || 1)),
            notes: typeof sk.notes === "string" ? sk.notes.trim() : "",
          });
        }
      }
    }

    // Update Availability if provided
    if (body.availability && typeof body.availability === "object") {
      const avail = body.availability;
      const status = ALLOWED_AVAIL_STATUS.has(avail.status)
        ? avail.status
        : "available";

      const existingAvail = await db
        .select()
        .from(availabilities)
        .where(eq(availabilities.candidateId, candidate.id))
        .orderBy(desc(availabilities.weekStart))
        .limit(1);

      if (existingAvail.length > 0) {
        await db
          .update(availabilities)
          .set({
            status,
            notes: typeof avail.notes === "string" ? avail.notes.trim() : existingAvail[0].notes,
          })
          .where(eq(availabilities.id, existingAvail[0].id));
      } else {
        const weekStart = new Date();
        weekStart.setUTCHours(0, 0, 0, 0);
        await db.insert(availabilities).values({
          candidateId: candidate.id,
          weekStart,
          hoursPerWeek: 40,
          status,
          preferredStart: "2 weeks",
          notes: typeof avail.notes === "string" ? avail.notes.trim() : "",
        });
      }
    }

    return Response.json({
      ok: true,
      candidate: updatedCandidate,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal Server Error";
    return Response.json(
      { error: msg },
      { status: msg === "FORBIDDEN" ? 403 : msg === "UNAUTHORIZED" ? 401 : 500 }
    );
  }
}
