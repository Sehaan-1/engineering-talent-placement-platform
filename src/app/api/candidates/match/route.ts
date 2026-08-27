import { db } from "@/db";
import { candidates, skillMatrices, skillDefinitions } from "@/db/schema";
import { requireAuthJson, getJsonBody, jsonError } from "@/lib/types";
import { rankCandidates, CandidateForMatching } from "@/lib/matching";
import { getOrgContext } from "@/lib/org";
import { eq, inArray } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// In-memory rate limiter: max 20 requests per hour per user
const rateLimitMap = new Map<number, { count: number; resetTime: number }>();

function checkRateLimit(userId: number): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1 hour
  const record = rateLimitMap.get(userId);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + windowMs });
    return { allowed: true };
  }

  if (record.count >= 20) {
    const retryAfter = Math.ceil((record.resetTime - now) / 1000);
    return { allowed: false, retryAfter };
  }

  record.count += 1;
  return { allowed: true };
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuthJson();
  if (error) return error;
  const orgCtx = await getOrgContext().catch(() => null);

  const rateCheck = checkRateLimit(user.id);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: `Rate limit exceeded. Try again in ${Math.ceil(rateCheck.retryAfter! / 60)} minutes.` },
      { status: 429, headers: { "Retry-After": String(rateCheck.retryAfter) } }
    );
  }

  const body = await getJsonBody<{ jobDescription?: string }>(req);
  if (!body || !body.jobDescription || body.jobDescription.trim().length === 0) {
    return jsonError("Job description text is required for AI matching", 400);
  }

  try {
    // 1. Fetch workspace's candidates
    const candidateRows = await db
      .select()
      .from(candidates)
      .where(
        orgCtx
          ? eq(candidates.orgId, orgCtx.org.id)
          : eq(candidates.ownerId, user.id)
      );

    if (candidateRows.length === 0) {
      return NextResponse.json({ results: [], totalCandidates: 0 });
    }

    const candidateIds = candidateRows.map((c) => c.id);

    // 2. Fetch skills for these candidates
    const rawSkills = await db
      .select({
        candidateId: skillMatrices.candidateId,
        proficiency: skillMatrices.proficiency,
        yearsUsed: skillMatrices.yearsUsed,
        skillName: skillDefinitions.name,
        skillSlug: skillDefinitions.slug,
      })
      .from(skillMatrices)
      .innerJoin(
        skillDefinitions,
        eq(skillDefinitions.id, skillMatrices.skillId)
      )
      .where(inArray(skillMatrices.candidateId, candidateIds));

    // Map skills by candidate ID
    const skillsByCandidateId = new Map<number, Array<{
      name: string;
      slug: string;
      proficiency: string;
      yearsUsed: number;
    }>>();

    for (const row of rawSkills) {
      const list = skillsByCandidateId.get(row.candidateId) || [];
      list.push({
        name: row.skillName,
        slug: row.skillSlug,
        proficiency: row.proficiency,
        yearsUsed: row.yearsUsed,
      });
      skillsByCandidateId.set(row.candidateId, list);
    }

    // 3. Format candidates for matching
    const candidatesForMatching: CandidateForMatching[] = candidateRows.map((c) => ({
      id: c.id,
      fullName: c.fullName,
      headline: c.headline,
      seniority: c.seniority,
      yearsExperience: c.yearsExperience,
      hourlyRateUsd: c.hourlyRateUsd,
      location: c.location,
      region: c.region,
      bio: c.bio,
      tags: c.tags,
      skills: skillsByCandidateId.get(c.id) || [],
    }));

    // 4. Rank with AI
    const rankedResults = await rankCandidates(candidatesForMatching, body.jobDescription);

    return NextResponse.json({
      success: true,
      totalCandidates: candidateRows.length,
      results: rankedResults,
    });
  } catch (err: any) {
    console.error("AI Match error:", err);
    return jsonError(err.message || "AI matching failed", 500);
  }
}
