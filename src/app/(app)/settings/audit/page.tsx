import { redirect } from "next/navigation";
import { getOrgContext } from "@/lib/org";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import AuditLogView from "./AuditLogView";

export const dynamic = "force-dynamic";

export default async function AuditLogPage() {
  let ctx;
  try {
    ctx = await getOrgContext();
  } catch {
    redirect("/login");
  }

  // Non-admins cannot access audit logs
  if (ctx.membership.role === "member") {
    redirect("/settings");
  }

  const limit = 50;

  const [initialLogs, countResult, actionBreakdownRows, topActorRows] =
    await Promise.all([
      db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.orgId, ctx.org.id))
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(auditLogs)
        .where(eq(auditLogs.orgId, ctx.org.id)),
      db
        .select({
          action: auditLogs.action,
          count: sql<number>`count(*)::int`,
        })
        .from(auditLogs)
        .where(eq(auditLogs.orgId, ctx.org.id))
        .groupBy(auditLogs.action),
      db
        .select({
          name: auditLogs.actorName,
          count: sql<number>`count(*)::int`,
        })
        .from(auditLogs)
        .where(eq(auditLogs.orgId, ctx.org.id))
        .groupBy(auditLogs.actorName)
        .orderBy(desc(sql`count(*)`))
        .limit(1),
    ]);

  const total = countResult[0]?.count ?? 0;
  const actionBreakdown: Record<string, number> = {};
  let totalActions = 0;
  for (const row of actionBreakdownRows) {
    actionBreakdown[row.action] = row.count;
    totalActions += row.count;
  }

  const formattedLogs = initialLogs.map((l) => ({
    ...l,
    createdAt: l.createdAt.toISOString(),
  }));

  return (
    <AuditLogView
      org={{
        id: ctx.org.id,
        name: ctx.org.name,
        slug: ctx.org.slug,
      }}
      initialLogs={formattedLogs}
      initialTotal={total}
      initialStats={{
        totalActions,
        topActor: topActorRows[0] ?? null,
        actionBreakdown,
      }}
    />
  );
}
