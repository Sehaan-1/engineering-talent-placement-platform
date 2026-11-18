"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import Avatar from "@/components/Avatar";
import StatusBadge from "@/components/StatusBadge";
import Modal from "@/components/Modal";
import EmptyState from "@/components/EmptyState";
import FilterPanel, { FilterValues, SkillDefinitionOption } from "@/components/FilterPanel";
import FrameworkChip from "@/components/FrameworkChip";
import {
  formatUsd,
  REGION_FLAG,
  REGION_LABEL,
  SENIORITY_LABEL,
} from "@/lib/format";
import { pushToast } from "@/components/ToastHost";
import {
  IconArrowRight,
  IconPlus,
  IconTrash,
  IconUsers,
  IconSparkle,
  IconDownload,
  IconCheck,
} from "@/components/Icon";

export type CandidateSkill = {
  id?: number;
  skillId?: number;
  name?: string;
  slug?: string;
  framework?: string;
  proficiency: string;
  categoryName?: string;
  categorySlug?: string;
  categoryColor?: string;
};

export type Candidate = {
  id: number;
  fullName: string;
  headline: string;
  email: string;
  location: string;
  region: string;
  timezone: string;
  timezoneOverlap: string;
  seniority: string;
  yearsExperience: number;
  hourlyRateUsd: number;
  verification: string;
  avatarColor: string;
  tags: string[];
  skills: CandidateSkill[];
};

const REGIONS = ["us", "ca", "uk", "eu", "other"] as const;
const SENIORITIES = ["junior", "mid", "senior", "staff", "principal"] as const;
const VERIFICATIONS = [
  "unverified",
  "pending",
  "verified",
  "rejected",
] as const;

const EMPTY_FORM = {
  fullName: "",
  headline: "",
  email: "",
  phone: "",
  location: "",
  region: "us",
  timezone: "",
  timezoneOverlap: "",
  seniority: "mid",
  yearsExperience: 3,
  hourlyRateUsd: 80,
  verification: "pending",
  bio: "",
  portfolioUrl: "",
  githubUrl: "",
  linkedinUrl: "",
  tagsInput: "",
};

export default function CandidatesView({
  candidates: initial,
  availableSkills = [],
  filters,
  openNew,
}: {
  candidates: Candidate[];
  availableSkills?: SkillDefinitionOption[];
  filters: {
    q: string;
    skills: string;
    framework: string;
    seniority: string;
    region: string;
    rateMin: string;
    rateMax: string;
    availability: string;
    verification: string;
  };
  openNew: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [candidates, setCandidates] = useState(initial);
  const [showForm, setShowForm] = useState(openNew);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [pending, startTransition] = useTransition();

  // AI Matching state
  const [aiMatchActive, setAiMatchActive] = useState(false);
  const [jobDescription, setJobDescription] = useState("");
  const [matchingLoading, setMatchingLoading] = useState(false);
  const [matchResultsMap, setMatchResultsMap] = useState<Map<number, {
    score: number;
    rationale: string;
    matchedSkills: string[];
    missingSkills: string[];
  }> | null>(null);

  async function handleRunAiMatch(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!jobDescription.trim()) {
      pushToast("Please enter a job description or requirements to match.", "error");
      return;
    }

    setMatchingLoading(true);
    try {
      const res = await fetch("/api/candidates/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "AI matching failed");
      }

      const map = new Map<number, any>();
      for (const item of (data.results || [])) {
        map.set(item.candidate.id, item.match);
      }
      setMatchResultsMap(map);

      // Re-sort candidates based on AI score
      const sorted = [...candidates].sort((a, b) => {
        const scoreA = map.get(a.id)?.score ?? 0;
        const scoreB = map.get(b.id)?.score ?? 0;
        return scoreB - scoreA;
      });
      setCandidates(sorted);

      pushToast(`✦ AI matched & ranked ${data.results?.length || 0} candidates!`, "success");
    } catch (err: any) {
      pushToast(err.message || "Failed to run AI matching", "error");
    } finally {
      setMatchingLoading(false);
    }
  }

  function handleClearAiMatch() {
    setMatchResultsMap(null);
    setJobDescription("");
    setAiMatchActive(false);
    setCandidates(initial);
  }

  // Local filter values for fast typing / debouncing
  const [filterValues, setFilterValues] = useState<FilterValues>({
    q: filters.q || "",
    skills: (filters.skills || filters.framework)
      ? (filters.skills || filters.framework).split(",").map((s) => s.trim()).filter(Boolean)
      : [],
    seniority: filters.seniority ? filters.seniority.split(",").map((s) => s.trim()).filter(Boolean) : [],
    region: filters.region ? filters.region.split(",").map((r) => r.trim()).filter(Boolean) : [],
    rateMin: filters.rateMin ? Number(filters.rateMin) : "",
    rateMax: filters.rateMax ? Number(filters.rateMax) : "",
    availability: filters.availability || "",
    verification: filters.verification || "",
  });

  const [prevInitial, setPrevInitial] = useState(initial);
  if (prevInitial !== initial) {
    setPrevInitial(initial);
    setCandidates(initial);
  }

  const [prevOpenNew, setPrevOpenNew] = useState(openNew);
  if (prevOpenNew !== openNew) {
    setPrevOpenNew(openNew);
    if (openNew) setShowForm(true);
  }

  // Sync state if URL changes externally
  const [prevFilters, setPrevFilters] = useState(filters);
  if (prevFilters !== filters) {
    setPrevFilters(filters);
    setFilterValues({
      q: filters.q || "",
      skills: (filters.skills || filters.framework)
        ? (filters.skills || filters.framework).split(",").map((s) => s.trim()).filter(Boolean)
        : [],
      seniority: filters.seniority ? filters.seniority.split(",").map((s) => s.trim()).filter(Boolean) : [],
      region: filters.region ? filters.region.split(",").map((r) => r.trim()).filter(Boolean) : [],
      rateMin: filters.rateMin ? Number(filters.rateMin) : "",
      rateMax: filters.rateMax ? Number(filters.rateMax) : "",
      availability: filters.availability || "",
      verification: filters.verification || "",
    });
  }

  // Debounced URL updates when filterValues change
  useEffect(() => {
    const timer = setTimeout(() => {
      const sp = new URLSearchParams();
      if (filterValues.q.trim()) sp.set("q", filterValues.q.trim());
      if (filterValues.skills.length > 0) sp.set("skills", filterValues.skills.join(","));
      if (filterValues.seniority.length > 0) sp.set("seniority", filterValues.seniority.join(","));
      if (filterValues.region.length > 0) sp.set("region", filterValues.region.join(","));
      if (filterValues.rateMin !== "") sp.set("rateMin", String(filterValues.rateMin));
      if (filterValues.rateMax !== "") sp.set("rateMax", String(filterValues.rateMax));
      if (filterValues.availability) sp.set("availability", filterValues.availability);
      if (filterValues.verification) sp.set("verification", filterValues.verification);

      const qs = sp.toString();
      const currentQs = searchParams?.toString() ?? "";
      if (qs !== currentQs) {
        startTransition(() => {
          router.replace(qs ? `/candidates?${qs}` : "/candidates");
        });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [filterValues, router, searchParams]);

  function handleResetFilters() {
    setFilterValues({
      q: "",
      skills: [],
      seniority: [],
      region: [],
      rateMin: "",
      rateMax: "",
      availability: "",
      verification: "",
    });
    router.replace("/candidates");
  }

  const tagsArray = useMemo(
    () =>
      form.tagsInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    [form.tagsInput]
  );

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.fullName.trim() || !form.email.trim() || !form.headline.trim()) {
      pushToast("Name, headline and email are required.", "error");
      return;
    }
    setSaving(true);
    const payload = {
      fullName: form.fullName.trim(),
      headline: form.headline.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      location: form.location.trim(),
      region: form.region,
      timezone: form.timezone.trim() || "UTC",
      timezoneOverlap: form.timezoneOverlap.trim() || "UTC ±0h",
      seniority: form.seniority,
      yearsExperience: Number(form.yearsExperience) || 0,
      hourlyRateUsd: Number(form.hourlyRateUsd) || 0,
      verification: form.verification,
      bio: form.bio,
      portfolioUrl: form.portfolioUrl.trim(),
      githubUrl: form.githubUrl.trim(),
      linkedinUrl: form.linkedinUrl.trim(),
      tags: tagsArray,
    };
    try {
      const res = await fetch("/api/candidates", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error ?? "Could not create candidate");
      }
      const data = (await res.json()) as { candidate: Candidate };
      setCandidates((prev) => [
        { ...data.candidate, skills: [] } as Candidate,
        ...prev,
      ]);
      setShowForm(false);
      setForm(EMPTY_FORM);
      pushToast(`${data.candidate.fullName} added to network.`, "success");
      startTransition(() => router.refresh());
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Failed", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number, name: string) {
    if (
      !confirm(
        `Remove ${name}? This will delete their placements and interviews too.`
      )
    )
      return;
    const previous = candidates;
    setCandidates((prev) => prev.filter((c) => c.id !== id));
    try {
      const res = await fetch(`/api/candidates/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Could not delete");
      pushToast(`${name} removed.`, "success");
    } catch (err) {
      setCandidates(previous);
      pushToast(err instanceof Error ? err.message : "Failed", "error");
    }
  }

  const hasFilters =
    !!filterValues.q ||
    filterValues.skills.length > 0 ||
    filterValues.seniority.length > 0 ||
    filterValues.region.length > 0 ||
    filterValues.rateMin !== "" ||
    filterValues.rateMax !== "" ||
    !!filterValues.availability ||
    !!filterValues.verification;

  return (
    <main className="content fade-in">
      <header className="page-header">
        <div className="meta">
          <h1>Candidates</h1>
          <p>
            {candidates.length}{" "}
            {candidates.length === 1 ? "profile" : "profiles"} in your network
            {hasFilters ? " · filtered" : ""}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <a
            href="/api/candidates/export"
            download
            className="btn"
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            title="Download full candidate network as CSV"
          >
            <IconDownload size={14} />
            Export CSV
          </a>
          <button
            className={`btn ${aiMatchActive ? "primary" : ""}`}
            style={{
              background: aiMatchActive ? "linear-gradient(135deg, #7e22ce 0%, #4338ca 100%)" : undefined,
              borderColor: aiMatchActive ? "#7e22ce" : undefined,
              color: aiMatchActive ? "#ffffff" : undefined,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
            onClick={() => setAiMatchActive(!aiMatchActive)}
          >
            <IconSparkle size={14} />
            {aiMatchActive ? "Close AI Match" : "✦ AI Talent Match"}
          </button>
          <button className="btn primary" onClick={() => setShowForm(true)}>
            <IconPlus size={14} />
            Add candidate
          </button>
        </div>
      </header>

      {/* AI Job Description Match Drawer */}
      {aiMatchActive && (
        <div
          style={{
            background: "linear-gradient(135deg, #fbf7ff 0%, #f4f4ff 100%)",
            border: "1px solid #d8b4fe",
            borderRadius: 12,
            padding: 20,
            marginBottom: 20,
            boxShadow: "0 4px 16px rgba(126, 34, 206, 0.06)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: "#7e22ce",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <IconSparkle size={16} />
              </div>
              <div>
                <strong style={{ fontSize: 15, color: "#581c87" }}>
                  AI Talent Matching & Scoring
                </strong>
                <p style={{ fontSize: 12, color: "#7e22ce", margin: 0 }}>
                  Paste a Job Description or role requirements. AI will analyze competencies, rate, and experience to rank the best fits.
                </p>
              </div>
            </div>

            {matchResultsMap && (
              <button
                type="button"
                className="btn"
                onClick={handleClearAiMatch}
                style={{ fontSize: 12, padding: "4px 10px" }}
              >
                Reset Match Ranking
              </button>
            )}
          </div>

          <form onSubmit={handleRunAiMatch}>
            <div style={{ marginBottom: 12 }}>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="e.g. Seeking a Senior Frontend Engineer with 5+ years React, TypeScript, Tailwind CSS, Next.js App Router experience. Budget: $120-150/hr. US/CA timezone overlap required."
                rows={3}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid #c084fc",
                  fontSize: 13,
                  fontFamily: "inherit",
                  background: "#ffffff",
                }}
              />
            </div>

            {/* Example Presets */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
              <span style={{ fontSize: 11, color: "#7e22ce", fontWeight: 600 }}>Quick Presets:</span>
              {[
                { label: "Senior React / TS Specialist", text: "Senior React Engineer with 5+ years experience in TypeScript, Next.js, Design Systems, and frontend state management. Target rate: $110-140/hr." },
                { label: "Full-Stack Node + React", text: "Full-Stack Software Engineer with Node.js, Express, React, PostgreSQL, and AWS deployment experience." },
                { label: "Staff Distributed Systems / Go", text: "Staff Engineer experienced with Go, Docker, Kubernetes, microservices architecture, and cloud infrastructure." },
              ].map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setJobDescription(p.text)}
                  style={{
                    fontSize: 11,
                    padding: "3px 8px",
                    borderRadius: 6,
                    border: "1px solid #d8b4fe",
                    background: "#ffffff",
                    color: "#6b21a8",
                    cursor: "pointer",
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                type="submit"
                disabled={matchingLoading || !jobDescription.trim()}
                className="btn primary"
                style={{
                  background: "linear-gradient(135deg, #7e22ce 0%, #4338ca 100%)",
                  borderColor: "#7e22ce",
                  padding: "8px 16px",
                }}
              >
                {matchingLoading ? (
                  <>
                    <span
                      style={{
                        width: 14,
                        height: 14,
                        border: "2px solid #ffffff",
                        borderTopColor: "transparent",
                        borderRadius: "50%",
                        animation: "spin 1s linear infinite",
                        display: "inline-block",
                        marginRight: 6,
                      }}
                    />
                    Scoring Candidates with AI…
                  </>
                ) : (
                  <>
                    <IconSparkle size={15} />
                    Run AI Talent Match
                  </>
                )}
              </button>

              {matchResultsMap && (
                <span style={{ fontSize: 13, color: "#15803d", fontWeight: 600 }}>
                  ✓ Ranked {matchResultsMap.size} candidates by fit
                </span>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Advanced Multi-criteria Filter & Search Panel */}
      <FilterPanel
        availableSkills={availableSkills}
        values={filterValues}
        onChange={setFilterValues}
        onReset={handleResetFilters}
      />

      {pending && candidates.length === 0 ? (
        <div className="card card-pad" style={{ display: "grid", gap: 10 }}>
          <div className="skeleton" style={{ height: 20, width: "40%" }} />
          <div className="skeleton" style={{ height: 14 }} />
          <div className="skeleton" style={{ height: 14, width: "80%" }} />
        </div>
      ) : candidates.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<IconUsers size={28} />}
            title={
              hasFilters
                ? "No candidates match those filters"
                : "Build your network"
            }
            description={
              hasFilters
                ? "Try searching for different skills, rates, or clear all filters to see all candidates."
                : "Add your first developer to start tracking skills, availability, and placements."
            }
            action={
              hasFilters ? (
                <button type="button" className="btn" onClick={handleResetFilters}>
                  Clear filters
                </button>
              ) : (
                <button
                  className="btn primary"
                  onClick={() => setShowForm(true)}
                >
                  <IconPlus size={14} />
                  Add candidate
                </button>
              )
            }
          />
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Region & Timezone</th>
                <th>Skills & Stack</th>
                <th>Seniority</th>
                <th>Rate</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((c) => {
                return (
                  <tr key={c.id}>
                    <td>
                      <Link
                        href={`/candidates/${c.id}`}
                        style={{
                          display: "flex",
                          gap: 12,
                          alignItems: "center",
                          color: "inherit",
                          textDecoration: "none",
                        }}
                      >
                        <Avatar
                          name={c.fullName}
                          color={c.avatarColor}
                          size="sm"
                        />
                        <div>
                          <div style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                            <span>{c.fullName}</span>
                            {matchResultsMap?.get(c.id) && (
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  padding: "2px 6px",
                                  borderRadius: 4,
                                  background:
                                    matchResultsMap.get(c.id)!.score >= 80
                                      ? "#dcfce7"
                                      : matchResultsMap.get(c.id)!.score >= 60
                                      ? "#fef3c7"
                                      : "#fee2e2",
                                  color:
                                    matchResultsMap.get(c.id)!.score >= 80
                                      ? "#15803d"
                                      : matchResultsMap.get(c.id)!.score >= 60
                                      ? "#b45309"
                                      : "#b91c1c",
                                }}
                                title={matchResultsMap.get(c.id)!.rationale}
                              >
                                {matchResultsMap.get(c.id)!.score}% Match
                              </span>
                            )}
                          </div>
                          <div
                            style={{
                              fontSize: 12,
                              color: "var(--ink-muted)",
                            }}
                          >
                            {c.headline}
                          </div>
                          {matchResultsMap?.get(c.id) && (
                            <div
                              style={{
                                fontSize: 11,
                                color: "#6b21a8",
                                marginTop: 2,
                                maxWidth: 260,
                                lineHeight: 1.3,
                              }}
                            >
                              {matchResultsMap.get(c.id)!.rationale}
                            </div>
                          )}
                        </div>
                      </Link>
                    </td>
                    <td>
                      <div style={{ fontSize: 13 }}>
                        <div style={{ fontWeight: 600 }}>{c.location}</div>
                        <div
                          style={{
                            color: "var(--ink-muted)",
                            fontSize: 11,
                          }}
                        >
                          {REGION_FLAG[c.region as "us"] ?? ""} {REGION_LABEL[c.region as "us"] ?? c.region} · {c.timezoneOverlap}
                        </div>
                      </div>
                    </td>
                    <td>
                      {c.skills.length > 0 ? (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, maxWidth: 300 }}>
                          {c.skills.slice(0, 3).map((s, idx) => (
                            <FrameworkChip
                              key={s.id ?? idx}
                              name={s.name ?? s.framework}
                              framework={s.slug ?? s.framework}
                              color={s.categoryColor}
                              proficiency={s.proficiency}
                              size="sm"
                            />
                          ))}
                          {c.skills.length > 3 ? (
                            <span
                              style={{
                                fontSize: 11,
                                color: "var(--ink-muted)",
                                alignSelf: "center",
                              }}
                            >
                              +{c.skills.length - 3} more
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-muted text-sm">—</span>
                      )}
                    </td>
                    <td>
                      <StatusBadge kind="seniority" value={c.seniority} />
                    </td>
                    <td>
                      <span
                        style={{
                          fontWeight: 700,
                          color: "var(--ink)",
                        }}
                      >
                        {formatUsd(c.hourlyRateUsd)}
                      </span>
                      <span
                        style={{
                          color: "var(--ink-muted)",
                          fontSize: 11,
                        }}
                      >
                        /hr
                      </span>
                    </td>
                    <td>
                      <StatusBadge kind="verification" value={c.verification} />
                    </td>
                    <td>
                      <div className="row-actions">
                        <Link
                          href={`/candidates/${c.id}`}
                          className="btn ghost sm"
                        >
                          Open
                          <IconArrowRight size={11} />
                        </Link>
                        <button
                          className="btn ghost sm"
                          onClick={() => handleDelete(c.id, c.fullName)}
                          title="Delete"
                        >
                          <IconTrash size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title="Add candidate"
        footer={
          <>
            <button
              type="button"
              className="btn"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="candidate-form"
              className="btn primary"
              disabled={saving}
            >
              {saving ? "Adding…" : "Add candidate"}
            </button>
          </>
        }
      >
        <form id="candidate-form" onSubmit={handleCreate}>
          <div className="grid cols-2">
            <div className="field">
              <label>Full name</label>
              <input
                required
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Email</label>
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
          </div>
          <div className="field">
            <label>Headline</label>
            <input
              required
              placeholder="e.g. Senior Full-Stack Engineer · React & Node"
              value={form.headline}
              onChange={(e) => setForm({ ...form, headline: e.target.value })}
            />
          </div>
          <div className="grid cols-2">
            <div className="field">
              <label>Location</label>
              <input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="City, ST"
              />
            </div>
            <div className="field">
              <label>Region</label>
              <select
                value={form.region}
                onChange={(e) => setForm({ ...form, region: e.target.value })}
              >
                {REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {REGION_FLAG[r]} {REGION_LABEL[r]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid cols-2">
            <div className="field">
              <label>Timezone</label>
              <input
                placeholder="America/Los_Angeles (PST)"
                value={form.timezone}
                onChange={(e) => setForm({ ...form, timezone: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Overlap window</label>
              <input
                placeholder="PST ±3h"
                value={form.timezoneOverlap}
                onChange={(e) =>
                  setForm({ ...form, timezoneOverlap: e.target.value })
                }
              />
            </div>
          </div>
          <div className="grid cols-3">
            <div className="field">
              <label>Seniority</label>
              <select
                value={form.seniority}
                onChange={(e) =>
                  setForm({ ...form, seniority: e.target.value })
                }
              >
                {SENIORITIES.map((s) => (
                  <option key={s} value={s}>
                    {SENIORITY_LABEL[s]}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Years</label>
              <input
                type="number"
                min={0}
                value={form.yearsExperience}
                onChange={(e) =>
                  setForm({
                    ...form,
                    yearsExperience: Number(e.target.value),
                  })
                }
              />
            </div>
            <div className="field">
              <label>Rate (USD/hr)</label>
              <input
                type="number"
                min={0}
                value={form.hourlyRateUsd}
                onChange={(e) =>
                  setForm({ ...form, hourlyRateUsd: Number(e.target.value) })
                }
              />
            </div>
          </div>
          <div className="grid cols-2">
            <div className="field">
              <label>Verification</label>
              <select
                value={form.verification}
                onChange={(e) =>
                  setForm({ ...form, verification: e.target.value })
                }
              >
                {VERIFICATIONS.map((v) => (
                  <option key={v} value={v}>
                    {v === "unverified"
                      ? "Unverified"
                      : v === "pending"
                        ? "In review"
                        : v.charAt(0).toUpperCase() + v.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Phone</label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
          </div>
          <div className="field">
            <label>Tags (comma separated)</label>
            <input
              placeholder="react, typescript, graphql, nodejs"
              value={form.tagsInput}
              onChange={(e) =>
                setForm({ ...form, tagsInput: e.target.value })
              }
            />
          </div>
          <div className="field">
            <label>Bio</label>
            <textarea
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              placeholder="One or two sentences about what they specialize in."
            />
          </div>
          <div className="grid cols-3">
            <div className="field">
              <label>Portfolio URL</label>
              <input
                value={form.portfolioUrl}
                onChange={(e) =>
                  setForm({ ...form, portfolioUrl: e.target.value })
                }
              />
            </div>
            <div className="field">
              <label>GitHub</label>
              <input
                value={form.githubUrl}
                onChange={(e) =>
                  setForm({ ...form, githubUrl: e.target.value })
                }
              />
            </div>
            <div className="field">
              <label>LinkedIn</label>
              <input
                value={form.linkedinUrl}
                onChange={(e) =>
                  setForm({ ...form, linkedinUrl: e.target.value })
                }
              />
            </div>
          </div>
        </form>
      </Modal>
    </main>
  );
}
