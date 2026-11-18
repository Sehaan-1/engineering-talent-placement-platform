"use client";

import Link from "next/link";
import { useState } from "react";
import Avatar from "@/components/Avatar";
import StatusBadge from "@/components/StatusBadge";
import Modal from "@/components/Modal";
import EmptyState from "@/components/EmptyState";
import {
  formatDateTime,
  formatRelative,
  INTERVIEW_TYPE_LABEL,
  INTERVIEW_OUTCOME_LABEL,
  relTier,
} from "@/lib/format";
import { pushToast } from "@/components/ToastHost";
import {
  IconCalendar,
  IconPlus,
  IconTrash,
} from "@/components/Icon";

type Interview = {
  id: number;
  candidateId: number;
  placementId: number | null;
  type: string;
  scheduledAt: string;
  durationMinutes: number;
  outcome: string;
  interviewer: string;
  score: number | null;
  feedback: string;
  candidate: { id: number; fullName: string; avatarColor: string };
  placement: { id: number; clientName: string; roleTitle: string } | null;
};

const TYPES = ["screen", "technical", "system-design", "behavioral", "final"] as const;
const OUTCOMES = ["scheduled", "passed", "failed", "no-show", "rescheduled"] as const;

export default function InterviewsView({
  interviews: initial,
  candidates,
  placements,
  now,
}: {
  interviews: Interview[];
  candidates: { id: number; fullName: string; avatarColor: string }[];
  placements: {
    id: number;
    candidateId: number;
    clientName: string;
    roleTitle: string;
  }[];
  now: string;
}) {
  const [interviews, setInterviews] = useState(initial);
  const [filter, setFilter] = useState<"upcoming" | "past" | "all">("upcoming");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    candidateId: 0,
    placementId: null as number | null,
    type: "technical",
    scheduledAt: new Date(new Date(now).getTime() + 1000 * 60 * 60 * 24)
      .toISOString()
      .slice(0, 16),
    durationMinutes: 60,
    outcome: "scheduled",
    interviewer: "",
    score: null as number | null,
    feedback: "",
  });
  const [saving, setSaving] = useState(false);

  const nowMs = new Date(now).getTime();
  const upcoming = interviews.filter(
    (i) => new Date(i.scheduledAt).getTime() >= nowMs
  );
  const past = interviews.filter(
    (i) => new Date(i.scheduledAt).getTime() < nowMs
  );
  const visible =
    filter === "upcoming"
      ? upcoming
      : filter === "past"
        ? past
        : interviews;

  const candidatePlacements = placements.filter(
    (p) => p.candidateId === form.candidateId
  );

  async function createInterview(e: React.FormEvent) {
    e.preventDefault();
    if (!form.candidateId) {
      pushToast("Pick a candidate.", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/interviews", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          candidateId: form.candidateId,
          placementId: form.placementId,
          type: form.type,
          scheduledAt: new Date(form.scheduledAt).toISOString(),
          durationMinutes: Number(form.durationMinutes),
          outcome: form.outcome,
          interviewer: form.interviewer,
          score: form.score,
          feedback: form.feedback,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error ?? "Failed");
      }
      const data = (await res.json()) as { interview: Interview };
      const c = candidates.find((x) => x.id === form.candidateId);
      const p = placements.find((x) => x.id === form.placementId) ?? null;
      setInterviews((prev) => [
        {
          ...data.interview,
          scheduledAt: data.interview.scheduledAt as unknown as string,
          candidate: {
            id: c?.id ?? data.interview.candidateId,
            fullName: c?.fullName ?? "Candidate",
            avatarColor: c?.avatarColor ?? "#6366f1",
          },
          placement: p
            ? { id: p.id, clientName: p.clientName, roleTitle: p.roleTitle }
            : null,
        },
        ...prev,
      ]);
      setCreateOpen(false);
      setForm({
        candidateId: 0,
        placementId: null,
        type: "technical",
        scheduledAt: new Date(new Date(now).getTime() + 1000 * 60 * 60 * 24)
          .toISOString()
          .slice(0, 16),
        durationMinutes: 60,
        outcome: "scheduled",
        interviewer: "",
        score: null,
        feedback: "",
      });
      pushToast("Interview scheduled.", "success");
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Failed", "error");
    } finally {
      setSaving(false);
    }
  }

  async function setOutcome(i: Interview, outcome: string) {
    const previous = interviews;
    setInterviews((prev) =>
      prev.map((x) => (x.id === i.id ? { ...x, outcome } : x))
    );
    try {
      const res = await fetch(`/api/interviews/${i.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ outcome }),
      });
      if (!res.ok) throw new Error("Failed");
      pushToast(
        `Marked as ${INTERVIEW_OUTCOME_LABEL[outcome] ?? outcome}.`,
        "success"
      );
    } catch (err) {
      setInterviews(previous);
      pushToast(err instanceof Error ? err.message : "Failed", "error");
    }
  }

  async function remove(i: Interview) {
    if (!confirm("Delete this interview?")) return;
    const previous = interviews;
    setInterviews((prev) => prev.filter((x) => x.id !== i.id));
    try {
      const res = await fetch(`/api/interviews/${i.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed");
      pushToast("Interview removed.", "success");
    } catch (err) {
      setInterviews(previous);
      pushToast(err instanceof Error ? err.message : "Failed", "error");
    }
  }

  return (
    <main className="content">
      <header className="page-header">
        <div className="meta">
          <h1>Interviews</h1>
          <p>
            <strong style={{ color: "var(--ink)" }}>{upcoming.length}</strong>{" "}
            upcoming · <strong style={{ color: "var(--ink)" }}>{past.length}</strong>{" "}
            completed · debrief every loop to improve your coaching.
          </p>
        </div>
        <button className="btn primary" onClick={() => setCreateOpen(true)}>
          <IconPlus size={13} /> Schedule interview
        </button>
      </header>

      <div className="toolbar">
        <button
          className={`btn ${filter === "upcoming" ? "primary" : ""}`}
          onClick={() => setFilter("upcoming")}
        >
          Upcoming
          <span className="count" style={{ marginLeft: 6, opacity: 0.7 }}>
            {upcoming.length}
          </span>
        </button>
        <button
          className={`btn ${filter === "past" ? "primary" : ""}`}
          onClick={() => setFilter("past")}
        >
          Past
          <span className="count" style={{ marginLeft: 6, opacity: 0.7 }}>
            {past.length}
          </span>
        </button>
        <button
          className={`btn ${filter === "all" ? "primary" : ""}`}
          onClick={() => setFilter("all")}
        >
          All
          <span className="count" style={{ marginLeft: 6, opacity: 0.7 }}>
            {interviews.length}
          </span>
        </button>
      </div>

      {visible.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<IconCalendar size={26} />}
            title={
              filter === "upcoming"
                ? "Nothing on the calendar"
                : filter === "past"
                  ? "No completed interviews yet"
                  : "No interviews logged"
            }
            description="Schedule recruiter screens, technical rounds, and debrief every loop to build a coaching playbook."
            action={
              <button
                className="btn primary"
                onClick={() => setCreateOpen(true)}
              >
                <IconPlus size={13} /> Schedule interview
              </button>
            }
          />
        </div>
      ) : (
        <div className="grid" style={{ gap: 10 }}>
          {visible.map((i) => {
            const at = new Date(i.scheduledAt).getTime();
            const diff = at - nowMs;
            const minutes = Math.round(diff / 60000);
            const rel =
              minutes < 0
                ? `${Math.abs(minutes)}m ago`
                : minutes < 60
                  ? `in ${minutes}m`
                  : minutes < 60 * 24
                    ? `in ${Math.round(minutes / 60)}h`
                    : `in ${Math.round(minutes / (60 * 24))}d`;
            return (
              <div key={i.id} className="card card-pad">
                <div
                  style={{
                    display: "flex",
                    gap: 14,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <Avatar
                    name={i.candidate.fullName}
                    color={i.candidate.avatarColor}
                    size="md"
                  />
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        alignItems: "center",
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ fontWeight: 700 }}>
                        <Link
                          href={`/candidates/${i.candidate.id}`}
                          style={{ color: "inherit", textDecoration: "none" }}
                        >
                          {i.candidate.fullName}
                        </Link>
                      </div>
                      <span className="badge info">
                        {INTERVIEW_TYPE_LABEL[i.type] ?? i.type}
                      </span>
                      <StatusBadge kind="interview" value={i.outcome} />
                    </div>
                    <div
                      className="text-muted text-sm"
                      style={{ marginTop: 2 }}
                    >
                      {i.placement
                        ? `${i.placement.clientName} — ${i.placement.roleTitle}`
                        : "No placement linked"}
                      {" · "}
                      {formatDateTime(i.scheduledAt)} · {i.durationMinutes} min
                      {i.interviewer ? ` · ${i.interviewer}` : ""}
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <span
                      className={`rel-pill ${
                        relTier(i.scheduledAt) === "urgent"
                          ? "urgent"
                          : relTier(i.scheduledAt) === "soon"
                            ? "soon"
                            : relTier(i.scheduledAt) === "past"
                              ? ""
                              : "jade"
                      }`}
                    >
                      {rel}
                    </span>
                    {i.score != null ? (
                      <span className="badge success">{i.score}/10</span>
                    ) : null}
                    <select
                      className="input"
                      style={{
                        minWidth: 130,
                        padding: "5px 8px",
                        fontSize: 12,
                      }}
                      value={i.outcome}
                      onChange={(e) => setOutcome(i, e.target.value)}
                    >
                      {OUTCOMES.map((o) => (
                        <option key={o} value={o}>
                          {INTERVIEW_OUTCOME_LABEL[o]}
                        </option>
                      ))}
                    </select>
                    <Link
                      href={`/candidates/${i.candidate.id}`}
                      className="btn ghost sm"
                    >
                      Open
                    </Link>
                    <button
                      className="btn ghost sm"
                      onClick={() => remove(i)}
                      title="Delete"
                    >
                      <IconTrash size={12} />
                    </button>
                  </div>
                </div>
                {i.feedback ? (
                  <div
                    style={{
                      marginTop: 10,
                      padding: "10px 12px",
                      background: "var(--bg-soft)",
                      borderRadius: 8,
                      fontSize: 13,
                      color: "var(--text-soft)",
                    }}
                  >
                    {i.feedback}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Schedule interview"
        footer={
          <>
            <button className="btn" onClick={() => setCreateOpen(false)}>
              Cancel
            </button>
            <button
              type="submit"
              form="new-interview-form"
              className="btn primary"
              disabled={saving}
            >
              {saving ? "Saving…" : "Schedule"}
            </button>
          </>
        }
      >
        <form id="new-interview-form" onSubmit={createInterview}>
          <div className="field">
            <label>Candidate</label>
            <select
              required
              value={form.candidateId}
              onChange={(e) =>
                setForm({
                  ...form,
                  candidateId: Number(e.target.value),
                  placementId: null,
                })
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
              <label>Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {INTERVIEW_TYPE_LABEL[t]}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Linked placement</label>
              <select
                value={form.placementId ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    placementId: e.target.value
                      ? Number(e.target.value)
                      : null,
                  })
                }
                disabled={!form.candidateId}
              >
                <option value="">None</option>
                {candidatePlacements.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.clientName} — {p.roleTitle}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid cols-2">
            <div className="field">
              <label>Scheduled at</label>
              <input
                type="datetime-local"
                value={form.scheduledAt}
                onChange={(e) =>
                  setForm({ ...form, scheduledAt: e.target.value })
                }
              />
            </div>
            <div className="field">
              <label>Duration (min)</label>
              <input
                type="number"
                min={15}
                value={form.durationMinutes}
                onChange={(e) =>
                  setForm({
                    ...form,
                    durationMinutes: Number(e.target.value),
                  })
                }
              />
            </div>
          </div>
          <div className="grid cols-3">
            <div className="field">
              <label>Outcome</label>
              <select
                value={form.outcome}
                onChange={(e) => setForm({ ...form, outcome: e.target.value })}
              >
                {OUTCOMES.map((o) => (
                  <option key={o} value={o}>
                    {INTERVIEW_OUTCOME_LABEL[o]}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Interviewer</label>
              <input
                value={form.interviewer}
                onChange={(e) =>
                  setForm({ ...form, interviewer: e.target.value })
                }
              />
            </div>
            <div className="field">
              <label>Score /10</label>
              <input
                type="number"
                min={0}
                max={10}
                value={form.score ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    score: e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              />
            </div>
          </div>
          <div className="field">
            <label>Feedback</label>
            <textarea
              value={form.feedback}
              onChange={(e) => setForm({ ...form, feedback: e.target.value })}
            />
          </div>
        </form>
      </Modal>
    </main>
  );
}
