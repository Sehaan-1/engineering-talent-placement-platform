import { db } from "@/db";
import { placements, candidates, clients } from "@/db/schema";
import { requireAuthJson } from "@/lib/types";
import { getOrgContext } from "@/lib/org";
import { logAudit } from "@/lib/audit";
import { eq } from "drizzle-orm";
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
    const rows = await db
      .select({
        id: placements.id,
        candidateName: candidates.fullName,
        candidateEmail: candidates.email,
        clientName: placements.clientName,
        roleTitle: placements.roleTitle,
        status: placements.status,
        valueUsd: placements.valueUsd,
        startDate: placements.startDate,
        notes: placements.notes,
        createdAt: placements.createdAt,
        updatedAt: placements.updatedAt,
      })
      .from(placements)
      .innerJoin(candidates, eq(candidates.id, placements.candidateId))
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
        targetType: "placement",
        targetId: orgCtx.org.id,
        targetTitle: "Pipeline Placement Export",
        action: "export",
        metadata: { rowCount: rows.length },
      });
    }

    const now = Date.now();

    const headers = [
      "Placement ID",
      "Candidate Name",
      "Candidate Email",
      "Client Name",
      "Role Title",
      "Status",
      "Value (USD)",
      "Stage Age (Days)",
      "Start Date",
      "Notes",
      "Created At",
      "Updated At",
    ];

    const csvLines: string[] = [headers.join(",")];

    for (const p of rows) {
      const stageAgeDays = Math.max(
        0,
        Math.floor((now - new Date(p.updatedAt).getTime()) / (1000 * 60 * 60 * 24))
      );

      const row = [
        p.id,
        escapeCsvField(p.candidateName),
        escapeCsvField(p.candidateEmail),
        escapeCsvField(p.clientName),
        escapeCsvField(p.roleTitle),
        escapeCsvField(p.status),
        p.valueUsd,
        stageAgeDays,
        escapeCsvField(p.startDate ? new Date(p.startDate).toISOString().split("T")[0] : ""),
        escapeCsvField(p.notes || ""),
        escapeCsvField(new Date(p.createdAt).toISOString()),
        escapeCsvField(new Date(p.updatedAt).toISOString()),
      ];
      csvLines.push(row.join(","));
    }

    const csvContent = csvLines.join("\r\n");
    const filename = `placements_pipeline_${new Date().toISOString().split("T")[0]}.csv`;

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err: any) {
    console.error("Placements CSV export error:", err);
    return NextResponse.json({ error: "Failed to export placements" }, { status: 500 });
  }
}
