import { db } from "@/db";
import { candidates, skillMatrices, skillDefinitions } from "@/db/schema";
import { requireAuthJson } from "@/lib/types";
import { getOrgContext } from "@/lib/org";
import { logAudit } from "@/lib/audit";
import { eq, inArray } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function escapeCsvField(field: any): string {
  if (field === null || field === undefined) return "";
  const stringVal = String(field);
  if (stringVal.includes(",") || stringVal.includes('"') || stringVal.includes("\n")) {
    return `"${stringVal.replace(/"/g, '""')}"`;
  }
  return stringVal;
}

export async function GET(_req: NextRequest) {
  const { user, error } = await requireAuthJson();
  if (error) return error;
  const orgCtx = await getOrgContext().catch(() => null);

  try {
    // 1. Fetch workspace's candidates
    const rows = await db
      .select()
      .from(candidates)
      .where(
        orgCtx
          ? eq(candidates.orgId, orgCtx.org.id)
          : eq(candidates.ownerId, user.id)
      );

    if (orgCtx) {
      logAudit({
        orgId: orgCtx.org.id,
        actorId: user.id,
        actorName: user.name,
        actorEmail: user.email,
        targetType: "candidate",
        targetId: orgCtx.org.id,
        targetTitle: "Candidate Network Export",
        action: "export",
        metadata: { rowCount: rows.length },
      });
    }

    const candidateIds = rows.map((c) => c.id);

    // 2. Fetch skills
    const skillsMap = new Map<number, string[]>();
    if (candidateIds.length > 0) {
      const skills = await db
        .select({
          candidateId: skillMatrices.candidateId,
          skillName: skillDefinitions.name,
          proficiency: skillMatrices.proficiency,
          years: skillMatrices.yearsUsed,
        })
        .from(skillMatrices)
        .innerJoin(
          skillDefinitions,
          eq(skillDefinitions.id, skillMatrices.skillId)
        )
        .where(inArray(skillMatrices.candidateId, candidateIds));

      for (const s of skills) {
        const list = skillsMap.get(s.candidateId) || [];
        list.push(`${s.skillName} (${s.proficiency}, ${s.years}y)`);
        skillsMap.set(s.candidateId, list);
      }
    }

    // 3. Build CSV string
    const headers = [
      "ID",
      "Full Name",
      "Headline",
      "Email",
      "Phone",
      "Location",
      "Region",
      "Timezone",
      "Timezone Overlap",
      "Seniority",
      "Years Experience",
      "Hourly Rate (USD)",
      "Verification Status",
      "Skills",
      "Portfolio URL",
      "GitHub URL",
      "LinkedIn URL",
      "Created At",
    ];

    const csvLines: string[] = [headers.join(",")];

    for (const c of rows) {
      const candidateSkills = (skillsMap.get(c.id) || []).join("; ");
      const row = [
        c.id,
        escapeCsvField(c.fullName),
        escapeCsvField(c.headline),
        escapeCsvField(c.email),
        escapeCsvField(c.phone || ""),
        escapeCsvField(c.location),
        escapeCsvField(c.region.toUpperCase()),
        escapeCsvField(c.timezone),
        escapeCsvField(c.timezoneOverlap),
        escapeCsvField(c.seniority),
        c.yearsExperience,
        c.hourlyRateUsd,
        escapeCsvField(c.verification),
        escapeCsvField(candidateSkills),
        escapeCsvField(c.portfolioUrl || ""),
        escapeCsvField(c.githubUrl || ""),
        escapeCsvField(c.linkedinUrl || ""),
        escapeCsvField(c.createdAt.toISOString()),
      ];
      csvLines.push(row.join(","));
    }

    const csvContent = csvLines.join("\r\n");
    const filename = `candidates_export_${new Date().toISOString().split("T")[0]}.csv`;

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err: any) {
    console.error("Candidates CSV export error:", err);
    return NextResponse.json({ error: "Failed to export candidates" }, { status: 500 });
  }
}
