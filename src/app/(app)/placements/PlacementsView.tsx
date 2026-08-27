"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Avatar from "@/components/Avatar";
import StatusBadge from "@/components/StatusBadge";
import Modal from "@/components/Modal";
import EmptyState from "@/components/EmptyState";
import {
  formatDate,
  formatUsd,
  formatUsdExact,
  MILESTONE_LABEL,
  MILESTONE_COLOR,
  MILESTONE_ORDER,
} from "@/lib/format";
import { pushToast } from "@/components/ToastHost";
import {
  IconArrowLeft,
  IconArrowRight,
  IconBriefcase,
  IconCalendar,
  IconCheck,
  IconPlus,
  IconTrash,
  IconDownload,
} from "@/components/Icon";

type Placement = {
  id: number;
  candidateId: number;
  clientName: string;
  roleTitle: string;
  status: string;
  valueUsd: number;
  startDate: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
  candidate: {
    id: number;
    fullName: string;
    avatarColor: string;
    seniority: string;
  };
  interviews: number;
};

const STATUSES = [
  "sourced",
  "screening",
  "submitted",
  "interviewing",
  "offer",
  "placed",
  "archived",
] as const;

export default function PlacementsView({
  placements: initial,
  statusCounts,
  statusFilter,
}: {
  placements: Placement[];
  statusCounts: Record<string, { count: number; value: number }>;
  statusFilter: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [placements, setPlacements] = useState(initial);
  const [createOpen, setCreateOpen] = useState(false);
  const [candidates, setCandidates] = useState<
    { id: number; fullName: string; avatarColor: string; seniority: string }[]
  >([]);
  const [form, setForm] = useState({
    candidateId: 0,
    clientName: "",
    roleTitle: "",
    status: "sourced",
    valueUsd: 0,
    startDate: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPlacements(initial);
  }, [initial]);

  useEffect(() => {
    if (!createOpen) return;
    fetch("/api/candidates", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        const list = (data.candidates ?? []) as {
          id: number;
          fullName: string;
          avatarColor: string;
          seniority: string;
        }[];
        setCandidates(list);
        if (list[0] && !form.candidateId) {
          setForm((f) => ({ ...f, candidateId: list[0].id }));
        }
      })
      .catch(() => setCandidates([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createOpen]);

  function pushStatus(value: string) {
    const next = new URLSearchParams(params?.toString() ?? "");
    if (value) next.set("status", value);
    else next.delete("status");
    router.push(`/placements${next.toString() ? `?${next.toString()}` : ""}`);
  }

  async function createPlacement(e: React.FormEvent) {
    e.preventDefault();
    if (!form.candidateId) {
      pushToast("Pick a candidate.", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/placements", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          candidateId: form.candidateId,
          clientName: form.clientName,
          roleTitle: form.roleTitle,
          status: form.status,
          valueUsd: Number(form.valueUsd) || 0,
          startDate: form.startDate || null,
          notes: form.notes,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error ?? "Failed");
      }
      const data = (await res.json()) as { placement: Placement };
      const fallbackCandidate: Placement["candidate"] = {
        id: data.placement.candidateId,
        fullName: "Candidate",
        avatarColor: "#6366f1",
        seniority: "mid",
      };
      const candidate =
        candidates.find((c) => c.id === data.placement.candidateId) ??
        fallbackCandidate;
      setPlacements((prev) => [
        {
          ...data.placement,
          createdAt: data.placement.createdAt as unknown as string,
          updatedAt: data.placement.updatedAt as unknown as string,
          interviews: 0,
          candidate: {
            id: candidate.id,
            fullName: candidate.fullName,
            avatarColor: candidate.avatarColor,
            seniority: candidate.seniority ?? "mid",
          },
        },
        ...prev,
      ]);
      setCreateOpen(false);
      setForm({
        candidateId: 0,
        clientName: "",
        roleTitle: "",
        status: "sourced",
        valueUsd: 0,
        startDate: "",
        notes: "",
      });
      pushToast("Placement created.", "success");
      router.refresh();
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Failed", "error");
    } finally {
      setSaving(false);
    }
  }

  async function advance(p: Placement, direction: 1 | -1) {
    const idx = MILESTONE_ORDER.indexOf(p.status as (typeof MILESTONE_ORDER)[number]);
    const next = MILESTONE_ORDER[idx + direction];
    if (!next) return;
    const previous = placements;
    setPlacements((prev) =>
      prev.map((x) => (x.id === p.id ? { ...x, status: next } : x))
    );
    try {
      const res = await fetch(`/api/placements/${p.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error("Failed");
      pushToast(`Moved to ${MILESTONE_LABEL[next]}.`, "success");
    } catch (err) {
      setPlacements(previous);
      pushToast(err instanceof Error ? err.message : "Failed", "error");
    }
  }

  async function remove(p: Placement) {
    if (!confirm(`Delete placement for ${p.clientName}?`)) return;
    const previous = placements;
    setPlacements((prev) => prev.filter((x) => x.id !== p.id));
    try {
      const res = await fetch(`/api/placements/${p.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed");
      pushToast("Placement removed.", "success");
    } catch (err) {
      setPlacements(previous);
      pushToast(err instanceof Error ? err.message : "Failed", "error");
    }
  }

  const totalValue = Object.values(statusCounts).reduce(
    (s, x) => s + x.value,
    0
  );

  return (
    <main className="content">
      <header className="page-header">
        <div className="meta">
          <h1>Placements</h1>
          <p>
            {placements.length} active{" "}
            {placements.length === 1 ? "milestone" : "milestones"} ·{" "}
            <strong style={{ color: "var(--ink)" }}>
              {formatUsdExact(totalValue)}
            </strong>{" "}
            tracked across the network.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <a
            href="/api/placements/export"
            download
            className="btn"
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            title="Download pipeline report as CSV"
          >
            <IconDownload size={13} /> Export CSV
          </a>
          <button className="btn primary" onClick={() => setCreateOpen(true)}>
            <IconPlus size={13} /> New placement
          </button>
        </div>
      </header>

      <div className="toolbar">
        <button
          className={`btn ${!statusFilter ? "primary" : ""}`}
          onClick={() => pushStatus("")}
        >
          All
          <span className="count" style={{ marginLeft: 6, opacity: 0.7 }}>
            {placements.length}
          </span>
        </button>
        {STATUSES.map((s) => (
          <button
            key={s}
            className={`btn ${statusFilter === s ? "primary" : ""}`}
            onClick={() => pushStatus(s)}
          >
            {MILESTONE_LABEL[s]}{" "}
            <span style={{ opacity: 0.7, marginLeft: 4 }}>
              {statusCounts[s]?.count ?? 0}
            </span>
          </button>
        ))}
      </div>

      {placements.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<IconBriefcase size={26} />}
            title={
              statusFilter
                ? "No placements in this stage"
                : "No placements yet"
            }
            description={
              statusFilter
                ? "Try a different stage, or create a new milestone."
                : "Track every candidate you submit, interview, and place from one place."
            }
            action={
              <button
                className="btn primary"
                onClick={() => setCreateOpen(true)}
              >
                <IconPlus size={13} /> New placement
              </button>
            }
          />
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Client / Role</th>
                <th>Stage</th>
                <th>Value</th>
                <th>Start</th>
                <th>Interviews</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {placements.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link
                      href={`/candidates/${p.candidate.id}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        color: "inherit",
                        textDecoration: "none",
                      }}
                    >
                      <Avatar
                        name={p.candidate.fullName}
                        color={p.candidate.avatarColor}
                        size="sm"
                      />
                      <div>
                        <div style={{ fontWeight: 600 }}>
                          {p.candidate.fullName}
                        </div>
                        <div className="text-muted text-sm">
                          {p.candidate.seniority}
                        </div>
                      </div>
                    </Link>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{p.clientName}</div>
                    <div className="text-muted text-sm">{p.roleTitle}</div>
                  </td>
                  <td>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <button
                        className="btn ghost sm"
                        onClick={() => advance(p, -1)}
                        disabled={
                          MILESTONE_ORDER.indexOf(
                            p.status as (typeof MILESTONE_ORDER)[number]
                          ) === 0
                        }
                        title="Move back"
                      >
                        <IconArrowLeft size={12} />
                      </button>
                      <StatusBadge kind="milestone" value={p.status} />
                      <button
                        className="btn ghost sm"
                        onClick={() => advance(p, 1)}
                        disabled={
                          MILESTONE_ORDER.indexOf(
                            p.status as (typeof MILESTONE_ORDER)[number]
                          ) ===
                          MILESTONE_ORDER.length - 1
                        }
                        title="Advance"
                      >
                        <IconArrowRight size={12} />
                      </button>
                    </div>
                  </td>
                  <td className="font-semibold">{formatUsd(p.valueUsd)}</td>
                  <td>{p.startDate ? formatDate(p.startDate) : "—"}</td>
                  <td>
                    <span className="badge outline">
                      {p.interviews}{" "}
                      {p.interviews === 1 ? "loop" : "loops"}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <Link
                        href={`/candidates/${p.candidate.id}`}
                        className="btn ghost sm"
                      >
                        Open
                      </Link>
                      <button
                        className="btn ghost sm"
                        onClick={() => remove(p)}
                        title="Delete"
                      >
                        <IconTrash size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New placement"
        footer={
          <>
            <button className="btn" onClick={() => setCreateOpen(false)}>
              Cancel
            </button>
            <button
              type="submit"
              form="new-placement-form"
              className="btn primary"
              disabled={saving}
            >
              {saving ? "Creating…" : "Create placement"}
            </button>
          </>
        }
      >
        <form id="new-placement-form" onSubmit={createPlacement}>
          <div className="field">
            <label>Candidate</label>
            <select
              required
              value={form.candidateId}
              onChange={(e) =>
                setForm({ ...form, candidateId: Number(e.target.value) })
              }
            >
              <option value={0} disabled>
                Pick a candidate…
              </option>
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName}
                </option>
              ))}
            </select>
          </div>
          <div className="grid cols-2">
            <div className="field">
              <label>Client</label>
              <input
                required
                value={form.clientName}
                onChange={(e) =>
                  setForm({ ...form, clientName: e.target.value })
                }
              />
            </div>
            <div className="field">
              <label>Role</label>
              <input
                required
                value={form.roleTitle}
                onChange={(e) => setForm({ ...form, roleTitle: e.target.value })}
              />
            </div>
          </div>
          <div className="grid cols-3">
            <div className="field">
              <label>Stage</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {MILESTONE_LABEL[s]}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Value (USD)</label>
              <input
                type="number"
                min={0}
                value={form.valueUsd}
                onChange={(e) =>
                  setForm({ ...form, valueUsd: Number(e.target.value) })
                }
              />
            </div>
            <div className="field">
              <label>Start date</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) =>
                  setForm({ ...form, startDate: e.target.value })
                }
              />
            </div>
          </div>
          <div className="field">
            <label>Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </form>
      </Modal>
    </main>
  );
}
