"use client";

import { useState } from "react";
import Avatar from "@/components/Avatar";
import { pushToast } from "@/components/ToastHost";
import {
  IconShield,
  IconDownload,
  IconSearch,
  IconClock,
  IconArrowRight,
  IconArrowLeft,
  IconCheck,
  IconPipeline,
  IconUsers,
  IconBriefcase,
  IconBuilding,
} from "@/components/Icon";

export type AuditLogItem = {
  id: number;
  orgId: number;
  actorId: number | null;
  actorName: string;
  actorEmail: string;
  targetType: string;
  targetId: number;
  targetTitle: string | null;
  action: string;
  diff: {
    before: Record<string, unknown>;
    after: Record<string, unknown>;
    changedKeys: string[];
  } | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

export type AuditStats = {
  totalActions: number;
  topActor: { name: string; count: number } | null;
  actionBreakdown: Record<string, number>;
};

const ACTION_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  create: { bg: "#f0fdf4", text: "#16a34a", border: "#bbf7d0" },
  update: { bg: "#eff6ff", text: "#2563eb", border: "#bfdbfe" },
  status_change: { bg: "#faf5ff", text: "#7c3aed", border: "#ddd6fe" },
  delete: { bg: "#fef2f2", text: "#dc2626", border: "#fecaca" },
  remove_member: { bg: "#fef2f2", text: "#dc2626", border: "#fecaca" },
  invite_member: { bg: "#fffbeb", text: "#d97706", border: "#fde68a" },
  role_change: { bg: "#fff7ed", text: "#ea580c", border: "#fed7aa" },
  verify: { bg: "#ecfdf5", text: "#059669", border: "#a7f3d0" },
  export: { bg: "#f8fafc", text: "#475569", border: "#cbd5e1" },
};

export default function AuditLogView({
  org,
  initialLogs,
  initialTotal,
  initialStats,
}: {
  org: { id: number; name: string; slug: string };
  initialLogs: AuditLogItem[];
  initialTotal: number;
  initialStats: AuditStats;
}) {
  const [logs, setLogs] = useState<AuditLogItem[]>(initialLogs);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [stats, setStats] = useState<AuditStats>(initialStats);
  const [loading, setLoading] = useState(false);

  // Filters
  const [targetType, setTargetType] = useState("");
  const [action, setAction] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);

  const limit = 50;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  async function fetchLogs(newPage = 1, filters = { targetType, action, q: searchQuery }) {
    setLoading(true);
    try {
      const sp = new URLSearchParams();
      sp.set("page", String(newPage));
      sp.set("limit", String(limit));
      if (filters.targetType) sp.set("targetType", filters.targetType);
      if (filters.action) sp.set("action", filters.action);
      if (filters.q.trim()) sp.set("q", filters.q.trim());

      const res = await fetch(`/api/audit-logs?${sp.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch audit logs");

      const data = await res.json();
      setLogs(data.logs || []);
      setTotal(data.total || 0);
      setPage(data.page || 1);
      if (data.stats) setStats(data.stats);
    } catch (err: unknown) {
      pushToast(err instanceof Error ? err.message : "Fetch failed", "error");
    } finally {
      setLoading(false);
    }
  }

  function handleFilterSubmit(e: React.FormEvent) {
    e.preventDefault();
    fetchLogs(1, { targetType, action, q: searchQuery });
  }

  function handleResetFilters() {
    setTargetType("");
    setAction("");
    setSearchQuery("");
    fetchLogs(1, { targetType: "", action: "", q: "" });
  }

  function toggleExpand(id: number) {
    setExpandedLogId(expandedLogId === id ? null : id);
  }

  return (
    <main className="content fade-in">
      <header className="page-header">
        <div className="meta">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1>Audit Log &amp; Compliance</h1>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: 6,
                background: "#ecfdf5",
                color: "#059669",
                border: "1px solid #a7f3d0",
              }}
            >
              Enterprise Grade
            </span>
          </div>
          <p>
            Immutable chronological record of modifications, team actions, and placement changes in <strong>{org.name}</strong>.
          </p>
        </div>

        <a
          href="/api/audit-logs/export"
          download
          className="btn primary"
          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          title="Download complete audit log as compliance CSV"
        >
          <IconDownload size={14} />
          Export Audit CSV
        </a>
      </header>

      {/* Metrics Row */}
      <section className="grid cols-3" style={{ gap: 16, marginBottom: 24 }}>
        <div className="card card-pad" style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 10,
              background: "rgba(122, 18, 41, 0.12)",
              color: "var(--sangria)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <IconShield size={22} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: "var(--ink-muted)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}>
              Total Audit Records
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "var(--ink)" }}>
              {stats.totalActions}
            </div>
          </div>
        </div>

        <div className="card card-pad" style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 10,
              background: "rgba(59, 130, 246, 0.12)",
              color: "#2563eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <IconUsers size={22} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, color: "var(--ink-muted)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}>
              Most Active Recruiter
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {stats.topActor ? `${stats.topActor.name} (${stats.topActor.count})` : "—"}
            </div>
          </div>
        </div>

        <div className="card card-pad" style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 10,
              background: "rgba(16, 185, 129, 0.12)",
              color: "#059669",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <IconPipeline size={22} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: "var(--ink-muted)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}>
              Key Operations Tracked
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--ink)" }}>
              {Object.keys(stats.actionBreakdown).length} event types
            </div>
          </div>
        </div>
      </section>

      {/* Filter Bar */}
      <form onSubmit={handleFilterSubmit} className="card card-pad" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 200px" }}>
            <input
              placeholder="Search by actor or entity name…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: 6,
                border: "1px solid var(--border)",
                fontSize: 13,
              }}
            />
          </div>

          <div>
            <select
              value={targetType}
              onChange={(e) => setTargetType(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: 6,
                border: "1px solid var(--border)",
                fontSize: 13,
                background: "var(--surface)",
              }}
            >
              <option value="">All Entity Types</option>
              <option value="candidate">Candidates</option>
              <option value="placement">Placements</option>
              <option value="client">Clients</option>
              <option value="interview">Interviews</option>
              <option value="member">Team &amp; Members</option>
              <option value="organization">Workspace / Org</option>
            </select>
          </div>

          <div>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: 6,
                border: "1px solid var(--border)",
                fontSize: 13,
                background: "var(--surface)",
              }}
            >
              <option value="">All Actions</option>
              <option value="create">Created</option>
              <option value="update">Updated</option>
              <option value="status_change">Status Changed</option>
              <option value="verify">Verification Changed</option>
              <option value="delete">Deleted</option>
              <option value="invite_member">Invited Member</option>
              <option value="remove_member">Removed Member</option>
              <option value="role_change">Role Changed</option>
              <option value="export">Exported Data</option>
            </select>
          </div>

          <button type="submit" className="btn primary" disabled={loading}>
            <IconSearch size={14} />
            Filter
          </button>

          {(targetType || action || searchQuery) && (
            <button
              type="button"
              className="btn"
              onClick={handleResetFilters}
              disabled={loading}
            >
              Clear
            </button>
          )}
        </div>
      </form>

      {/* Audit Log Table */}
      {loading ? (
        <div className="card card-pad" style={{ display: "grid", gap: 10 }}>
          <div className="skeleton" style={{ height: 20, width: "30%" }} />
          <div className="skeleton" style={{ height: 14 }} />
          <div className="skeleton" style={{ height: 14, width: "80%" }} />
        </div>
      ) : logs.length === 0 ? (
        <div className="card card-pad" style={{ textAlign: "center", padding: "48px 16px" }}>
          <IconShield size={36} style={{ color: "var(--ink-muted)", marginBottom: 12 }} />
          <h3 style={{ margin: "0 0 6px 0" }}>No audit records found</h3>
          <p style={{ color: "var(--ink-muted)", fontSize: 13, margin: 0 }}>
            {targetType || action || searchQuery
              ? "Try clearing filters to see more events."
              : "Actions taken across candidates, placements, and team settings will appear here automatically."}
          </p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Target Entity</th>
                <th>Changed Attributes</th>
                <th style={{ textAlign: "right" }}>Diff</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const colorConfig = ACTION_COLORS[log.action] || {
                  bg: "#f3f4f6",
                  text: "#374151",
                  border: "#e5e7eb",
                };
                const isExpanded = expandedLogId === log.id;
                const hasDiff = Boolean(log.diff && log.diff.changedKeys?.length);
                const hasMetadata = Boolean(log.metadata && Object.keys(log.metadata).length);

                return (
                  <>
                    <tr key={log.id} style={{ background: isExpanded ? "var(--pebble-soft, #f7f9f8)" : undefined }}>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>
                          {new Date(log.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--ink-muted)" }}>
                          {new Date(log.createdAt).toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </div>
                      </td>

                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>
                          {log.actorName}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--ink-muted)" }}>
                          {log.actorEmail}
                        </div>
                      </td>

                      <td>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            padding: "2px 8px",
                            borderRadius: 4,
                            background: colorConfig.bg,
                            color: colorConfig.text,
                            border: `1px solid ${colorConfig.border}`,
                          }}
                        >
                          {log.action.replace("_", " ")}
                        </span>
                      </td>

                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              textTransform: "uppercase",
                              padding: "1px 5px",
                              borderRadius: 4,
                              background: "#f1f5f9",
                              color: "#475569",
                            }}
                          >
                            {log.targetType}
                          </span>
                          <span style={{ fontSize: 13, fontWeight: 600 }}>
                            {log.targetTitle || `#${log.targetId}`}
                          </span>
                        </div>
                      </td>

                      <td>
                        {hasDiff ? (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                            {log.diff!.changedKeys.map((key) => (
                              <span
                                key={key}
                                style={{
                                  fontSize: 11,
                                  fontFamily: "monospace",
                                  padding: "1px 6px",
                                  borderRadius: 4,
                                  background: "#f3f4f6",
                                  color: "#1f2937",
                                }}
                              >
                                {key}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span style={{ fontSize: 12, color: "var(--ink-muted)" }}>—</span>
                        )}
                      </td>

                      <td style={{ textAlign: "right" }}>
                        {(hasDiff || hasMetadata) && (
                          <button
                            className="btn ghost sm"
                            onClick={() => toggleExpand(log.id)}
                            style={{ fontSize: 11, padding: "3px 8px" }}
                          >
                            {isExpanded ? "Hide" : "Details"}
                          </button>
                        )}
                      </td>
                    </tr>

                    {/* Expandable JSON Diff Row */}
                    {isExpanded && (
                      <tr key={`expand-${log.id}`} style={{ background: "var(--pebble-soft, #f7f9f8)" }}>
                        <td colSpan={6} style={{ padding: "12px 20px" }}>
                          <div
                            style={{
                              background: "#ffffff",
                              borderRadius: 8,
                              border: "1px solid var(--border)",
                              padding: 14,
                              fontSize: 12,
                              fontFamily: "monospace",
                            }}
                          >
                            {hasDiff && (
                              <div className="grid cols-2" style={{ gap: 16 }}>
                                <div>
                                  <div style={{ fontWeight: 700, color: "#dc2626", marginBottom: 6 }}>
                                    Before:
                                  </div>
                                  <pre style={{ margin: 0, whiteSpace: "pre-wrap", color: "#991b1b" }}>
                                    {JSON.stringify(log.diff!.before, null, 2)}
                                  </pre>
                                </div>
                                <div>
                                  <div style={{ fontWeight: 700, color: "#16a34a", marginBottom: 6 }}>
                                    After:
                                  </div>
                                  <pre style={{ margin: 0, whiteSpace: "pre-wrap", color: "#166534" }}>
                                    {JSON.stringify(log.diff!.after, null, 2)}
                                  </pre>
                                </div>
                              </div>
                            )}

                            {hasMetadata && (
                              <div style={{ marginTop: hasDiff ? 12 : 0 }}>
                                <div style={{ fontWeight: 700, color: "var(--ink)", marginBottom: 4 }}>
                                  Metadata:
                                </div>
                                <pre style={{ margin: 0, whiteSpace: "pre-wrap", color: "var(--ink-muted)" }}>
                                  {JSON.stringify(log.metadata, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 20,
          }}
        >
          <div style={{ fontSize: 12, color: "var(--ink-muted)" }}>
            Showing {logs.length} of {total} events (Page {page} of {totalPages})
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="btn"
              disabled={page <= 1 || loading}
              onClick={() => fetchLogs(page - 1)}
            >
              <IconArrowLeft size={12} />
              Previous
            </button>
            <button
              className="btn"
              disabled={page >= totalPages || loading}
              onClick={() => fetchLogs(page + 1)}
            >
              Next
              <IconArrowRight size={12} />
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
