import { requireOrgContext } from "@/lib/org";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

function escapeCsv(str: string | null | undefined): string {
  if (str === null || str === undefined) return '""';
  const text = String(str).replace(/"/g, '""');
  return `"${text}"`;
}

export async function GET() {
  const { ctx, error } = await requireOrgContext("admin");
  if (error) return error;

  const rows = await db
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.orgId, ctx.org.id))
    .orderBy(desc(auditLogs.createdAt))
    .limit(5000);

  logAudit({
    orgId: ctx.org.id,
    actorId: ctx.user.id,
    actorName: ctx.user.name,
    actorEmail: ctx.user.email,
    targetType: "organization",
    targetId: ctx.org.id,
    targetTitle: ctx.org.name,
    action: "export",
    metadata: {
      exportedRows: rows.length,
    },
  });

  const headers = [
    "Timestamp",
    "Actor Name",
    "Actor Email",
    "Target Type",
    "Target ID",
    "Target Title",
    "Action",
    "Changed Fields",
    "Diff Before",
    "Diff After",
    "Metadata",
  ];

  const csvLines = [headers.join(",")];

  for (const r of rows) {
    const changedFields = r.diff?.changedKeys ? r.diff.changedKeys.join("; ") : "";
    const diffBefore = r.diff?.before ? JSON.stringify(r.diff.before) : "";
    const diffAfter = r.diff?.after ? JSON.stringify(r.diff.after) : "";
    const metadataStr = r.metadata ? JSON.stringify(r.metadata) : "";

    const line = [
      escapeCsv(r.createdAt.toISOString()),
      escapeCsv(r.actorName),
      escapeCsv(r.actorEmail),
      escapeCsv(r.targetType),
      escapeCsv(String(r.targetId)),
      escapeCsv(r.targetTitle),
      escapeCsv(r.action),
      escapeCsv(changedFields),
      escapeCsv(diffBefore),
      escapeCsv(diffAfter),
      escapeCsv(metadataStr),
    ].join(",");

    csvLines.push(line);
  }

  const csvContent = csvLines.join("\n");
  const dateStr = new Date().toISOString().split("T")[0];

  return new Response(csvContent, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="audit-log-${ctx.org.slug}-${dateStr}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
