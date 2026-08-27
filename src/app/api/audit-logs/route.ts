import { requireOrgContext } from "@/lib/org";
import { db } from "@/db";
import { auditLogs, users } from "@/db/schema";
import { and, desc, eq, gte, lte, sql, SQL, ilike, or } from "drizzle-orm";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { ctx, error } = await requireOrgContext("admin");
  if (error) return error;

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "50", 10)));
  const offset = (page - 1) * limit;

  const targetType = url.searchParams.get("targetType");
  const action = url.searchParams.get("action");
  const actorIdParam = url.searchParams.get("actorId");
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");
  const q = url.searchParams.get("q")?.trim();

  const conditions: SQL[] = [eq(auditLogs.orgId, ctx.org.id)];

  if (targetType) {
    conditions.push(eq(auditLogs.targetType, targetType));
  }
  if (action) {
    conditions.push(eq(auditLogs.action, action));
  }
  if (actorIdParam && !isNaN(Number(actorIdParam))) {
    conditions.push(eq(auditLogs.actorId, Number(actorIdParam)));
  }
  if (fromParam) {
    const fromDate = new Date(fromParam);
    if (!isNaN(fromDate.getTime())) {
      conditions.push(gte(auditLogs.createdAt, fromDate));
    }
  }
  if (toParam) {
    const toDate = new Date(toParam);
    if (!isNaN(toDate.getTime())) {
      conditions.push(lte(auditLogs.createdAt, toDate));
    }
  }
  if (q) {
    const pattern = `%${q}%`;
    conditions.push(
      or(
        ilike(auditLogs.actorName, pattern),
        ilike(auditLogs.actorEmail, pattern),
        ilike(auditLogs.targetTitle, pattern)
      )!
    );
  }

  const whereClause = and(...conditions);

  // Fetch paginated logs and total count
  const [logs, countResult] = await Promise.all([
    db
      .select()
      .from(auditLogs)
      .where(whereClause)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(auditLogs)
      .where(whereClause),
  ]);

  const total = countResult[0]?.count ?? 0;
  const totalPages = Math.ceil(total / limit);

  // Calculate high-level stats for the org
  const [actionBreakdownRows, topActorRows] = await Promise.all([
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

  const actionBreakdown: Record<string, number> = {};
  let totalActions = 0;
  for (const row of actionBreakdownRows) {
    actionBreakdown[row.action] = row.count;
    totalActions += row.count;
  }

  return Response.json({
    logs,
    total,
    page,
    limit,
    totalPages,
    stats: {
      totalActions,
      topActor: topActorRows[0] ?? null,
      actionBreakdown,
    },
  });
}
