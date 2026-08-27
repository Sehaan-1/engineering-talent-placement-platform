"use client";

import { useState } from "react";
import Avatar from "@/components/Avatar";
import StatusBadge from "@/components/StatusBadge";
import Modal from "@/components/Modal";
import EmptyState from "@/components/EmptyState";
import {
  formatDate,
  AVAILABILITY_LABEL,
  AVAILABILITY_COLOR,
  REGION_FLAG,
  REGION_LABEL,
} from "@/lib/format";
import { pushToast } from "@/components/ToastHost";
import { IconClock, IconPlus, IconTrash } from "@/components/Icon";

type Entry = {
  id: number;
  candidateId: number;
  weekStart: string;
  hoursPerWeek: number;
  status: string;
  preferredStart: string;
  notes: string;
  candidate: {
    id: number;
    fullName: string;
    avatarColor: string;
    region: string;
  };
};

const STATUSES = ["available", "limited", "booked", "on-leave"] as const;

export default function AvailabilityView({
  entries: initial,
  candidates,
}: {
  entries: Entry[];
  candidates: { id: number; fullName: string; avatarColor: string }[];
}) {
  const [entries, setEntries] = useState(initial);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    candidateId: 0,
    weekStart: new Date().toISOString().slice(0, 10),
    hoursPerWeek: 40,
    status: "available",
    preferredStart: "2 weeks",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  async function createEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!form.candidateId) {
      pushToast("Pick a candidate.", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/availability", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          candidateId: form.candidateId,
          weekStart: form.weekStart,
          hoursPerWeek: Number(form.hoursPerWeek),
          status: form.status,
          preferredStart: form.preferredStart,
          notes: form.notes,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error ?? "Failed");
      }
      const data = (await res.json()) as { availability: Entry };
      const c = candidates.find((x) => x.id === form.candidateId);
      setEntries((prev) => [
        {
          ...data.availability,
          weekStart: data.availability.weekStart as unknown as string,
          candidate: {
            id: c?.id ?? data.availability.candidateId,
            fullName: c?.fullName ?? "Candidate",
            avatarColor: c?.avatarColor ?? "#6366f1",
            region: "us",
          },
        },
        ...prev,
      ]);
      setCreateOpen(false);
      setForm({
        candidateId: 0,
        weekStart: new Date().toISOString().slice(0, 10),
        hoursPerWeek: 40,
        status: "available",
        preferredStart: "2 weeks",
        notes: "",
      });
      pushToast("Availability saved.", "success");
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Failed", "error");
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(entry: Entry, status: string) {
    const previous = entries;
    setEntries((prev) =>
      prev.map((x) => (x.id === entry.id ? { ...x, status } : x))
    );
    try {
      const res = await fetch(`/api/availability/${entry.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed");
      pushToast(`Status set to ${AVAILABILITY_LABEL[status]}.`, "success");
    } catch (err) {
      setEntries(previous);
      pushToast(err instanceof Error ? err.message : "Failed", "error");
    }
  }

  async function remove(entry: Entry) {
    if (!confirm("Delete this availability snapshot?")) return;
    const previous = entries;
    setEntries((prev) => prev.filter((x) => x.id !== entry.id));
    try {
      const res = await fetch(`/api/availability/${entry.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed");
      pushToast("Removed.", "success");
    } catch (err) {
      setEntries(previous);
      pushToast(err instanceof Error ? err.message : "Failed", "error");
    }
  }

  const summary = {
    available: entries.filter((e) => e.status === "available").length,
    limited: entries.filter((e) => e.status === "limited").length,
    booked: entries.filter((e) => e.status === "booked").length,
    leave: entries.filter((e) => e.status === "on-leave").length,
  };

  return (
    <main className="content">
      <header className="page-header">
        <div className="meta">
          <h1>Availability</h1>
          <p>
            Weekly capacity and start-date windows for everyone in your network.
          </p>
        </div>
        <button className="btn primary" onClick={() => setCreateOpen(true)}>
          <IconPlus size={13} /> Log snapshot
        </button>
      </header>

      <section className="grid cols-4">
        <SummaryStat
          label="Available"
          count={summary.available}
          color={AVAILABILITY_COLOR.available}
        />
        <SummaryStat
          label="Limited"
          count={summary.limited}
          color={AVAILABILITY_COLOR.limited}
        />
        <SummaryStat
          label="Booked"
          count={summary.booked}
          color={AVAILABILITY_COLOR.booked}
        />
        <SummaryStat
          label="On leave"
          count={summary.leave}
          color={AVAILABILITY_COLOR["on-leave"]}
        />
      </section>

      {entries.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<IconClock size={26} />}
            title="No availability tracked"
            description="Log weekly snapshots to know who can start when — and when their bandwidth opens up."
            action={
              <button
                className="btn primary"
                onClick={() => setCreateOpen(true)}
              >
                <IconPlus size={13} /> Log first snapshot
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
                <th>Region</th>
                <th>Week of</th>
                <th>Hours</th>
                <th>Status</th>
                <th>Start</th>
                <th>Notes</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id}>
                  <td>
                    <div
                      style={{
                        display: "flex",
                        gap: 10,
                        alignItems: "center",
                      }}
                    >
                      <Avatar
                        name={e.candidate.fullName}
                        color={e.candidate.avatarColor}
                        size="sm"
                      />
                      <div style={{ fontWeight: 600 }}>
                        {e.candidate.fullName}
                      </div>
                    </div>
                  </td>
                  <td>
                    {REGION_FLAG[e.candidate.region] ?? ""}{" "}
                    {REGION_LABEL[e.candidate.region] ?? "—"}
                  </td>
                  <td>{formatDate(e.weekStart)}</td>
                  <td className="font-semibold">{e.hoursPerWeek} hrs</td>
                  <td>
                    <select
                      value={e.status}
                      onChange={(ev) => updateStatus(e, ev.target.value)}
                      className="input"
                      style={{ minWidth: 130, padding: "5px 8px", fontSize: 12 }}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {AVAILABILITY_LABEL[s]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>{e.preferredStart}</td>
                  <td className="text-muted text-sm" style={{ maxWidth: 220 }}>
                    {e.notes || "—"}
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        className="btn ghost sm"
                        onClick={() => remove(e)}
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
        title="Log availability"
        footer={
          <>
            <button className="btn" onClick={() => setCreateOpen(false)}>
              Cancel
            </button>
            <button
              type="submit"
              form="new-avail-form"
              className="btn primary"
              disabled={saving}
            >
              {saving ? "Saving…" : "Save snapshot"}
            </button>
          </>
        }
      >
        <form id="new-avail-form" onSubmit={createEntry}>
          <div className="field">
            <label>Candidate</label>
            <select
              required
              value={form.candidateId}
              onChange={(ev) =>
                setForm({ ...form, candidateId: Number(ev.target.value) })
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
          <div className="grid cols-3">
            <div className="field">
              <label>Week of</label>
              <input
                type="date"
                value={form.weekStart}
                onChange={(e) => setForm({ ...form, weekStart: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Hours / week</label>
              <input
                type="number"
                min={0}
                value={form.hoursPerWeek}
                onChange={(e) =>
                  setForm({ ...form, hoursPerWeek: Number(e.target.value) })
                }
              />
            </div>
            <div className="field">
              <label>Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {AVAILABILITY_LABEL[s]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="field">
            <label>Can start</label>
            <input
              value={form.preferredStart}
              onChange={(e) =>
                setForm({ ...form, preferredStart: e.target.value })
              }
              placeholder="e.g. 2 weeks, immediately"
            />
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

function SummaryStat({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: string;
}) {
  return (
    <div className="card card-pad stat">
      <div className="label">{label}</div>
      <div className="value">{count}</div>
      <div
        className="delta"
        style={{ color }}
      >
        <span
          className="dot"
          style={{ background: color, marginRight: 4 }}
        />
        {label.toLowerCase()}
      </div>
    </div>
  );
}
