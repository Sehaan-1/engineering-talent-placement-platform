import { db } from "@/db";
import { auditLogs } from "@/db/schema";

const SENSITIVE_KEYS = new Set([
  "passwordHash",
  "password_hash",
  "inviteToken",
  "invite_token",
  "magicLinkToken",
  "magic_link_token",
  "accessToken",
  "access_token",
  "token",
]);

/** Strips sensitive fields and normalizes dates / undefined values. */
function sanitize(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!obj || typeof obj !== "object") return out;
  for (const [k, v] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(k)) continue;
    if (v === null || v === undefined) continue;
    if (v instanceof Date) {
      out[k] = v.toISOString();
      continue;
    }
    out[k] = v;
  }
  return out;
}

/**
 * Computes an attribute-level diff between two plain objects.
 * Only primitive leaf values are compared; nested objects are serialized.
 * Returns null if no changes are detected.
 */
export function computeDiff(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): {
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  changedKeys: string[];
} | null {
  const cleanBefore = sanitize(before);
  const cleanAfter = sanitize(after);
  const changedKeys: string[] = [];

  const allKeys = new Set([
    ...Object.keys(cleanBefore),
    ...Object.keys(cleanAfter),
  ]);
  const beforeDiff: Record<string, unknown> = {};
  const afterDiff: Record<string, unknown> = {};

  for (const k of allKeys) {
    const bv = cleanBefore[k];
    const av = cleanAfter[k];
    if (JSON.stringify(bv) !== JSON.stringify(av)) {
      changedKeys.push(k);
      beforeDiff[k] = bv;
      afterDiff[k] = av;
    }
  }

  if (changedKeys.length === 0) return null;
  return { before: beforeDiff, after: afterDiff, changedKeys };
}

export type LogAuditArgs = {
  orgId: number;
  actorId: number;
  actorName: string;
  actorEmail: string;
  targetType: string;
  targetId: number;
  targetTitle?: string;
  action: string;
  diff?: ReturnType<typeof computeDiff>;
  metadata?: Record<string, unknown>;
};

/**
 * Non-blocking audit trail logger.
 * NEVER throws — a logging failure must not break the primary operation.
 */
export function logAudit(args: LogAuditArgs): void {
  // Fire-and-forget async insert
  db.insert(auditLogs)
    .values({
      orgId: args.orgId,
      actorId: args.actorId,
      actorName: args.actorName,
      actorEmail: args.actorEmail,
      targetType: args.targetType,
      targetId: args.targetId,
      targetTitle: args.targetTitle ?? null,
      action: args.action,
      diff: args.diff ?? null,
      metadata: args.metadata ?? null,
    })
    .catch((err) => {
      console.error("[audit] Failed to write audit log:", err);
    });
}
