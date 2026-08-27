"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Avatar from "@/components/Avatar";
import FrameworkChip from "@/components/FrameworkChip";
import StatusBadge from "@/components/StatusBadge";
import Modal from "@/components/Modal";
import {
  FRAMEWORKS,
  PROFICIENCY_LABEL,
  SENIORITY_LABEL,
  REGION_LABEL,
  REGION_FLAG,
  AVAILABILITY_LABEL,
  formatDate,
  formatDateTime,
  formatRelative,
  formatUsd,
  formatUsdExact,
  MILESTONE_LABEL,
  INTERVIEW_TYPE_LABEL,
  INTERVIEW_OUTCOME_LABEL,
  relTier,
} from "@/lib/format";
import { pushToast } from "@/components/ToastHost";
import {
  IconArrowLeft,
  IconBolt,
  IconBriefcase,
  IconCalendar,
  IconClock,
  IconEdit,
  IconGlobe,
  IconLink,
  IconMail,
  IconMapPin,
  IconPhone,
  IconPlus,
  IconStar,
  IconTrash,
  IconTrendUp,
  IconUsers,
  IconSparkle,
  IconUpload,
} from "@/components/Icon";

type Candidate = {
  id: number;
  userId?: number | null;
  inviteToken?: string | null;
  inviteExpiresAt?: string | null;
  magicLinkToken?: string | null;
  magicLinkExpiresAt?: string | null;
  fullName: string;
  headline: string;
  email: string;
  phone: string | null;
  location: string;
  region: string;
  timezone: string;
  timezoneOverlap: string;
  seniority: string;
  yearsExperience: number;
  hourlyRateUsd: number;
  verification: string;
  bio: string;
  portfolioUrl: string | null;
  githubUrl: string | null;
  linkedinUrl: string | null;
  tags: string[];
  avatarColor: string;
  createdAt: string;
  updatedAt: string;
};

type Skill = {
  id: number;
  skillId?: number;
  name?: string;
  slug?: string;
  framework?: string;
  proficiency: string;
  yearsUsed: number;
  notes: string;
  lastUsedAt: string;
  categoryName?: string;
  categorySlug?: string;
  categoryColor?: string;
};

type Availability = {
  id: number;
  weekStart: string;
  hoursPerWeek: number;
  status: string;
  preferredStart: string;
  notes: string;
};

type Placement = {
  id: number;
  clientName: string;
  roleTitle: string;
  status: string;
  valueUsd: number;
  startDate: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

type Interview = {
  id: number;
  placementId: number | null;
  type: string;
  scheduledAt: string;
  durationMinutes: number;
  outcome: string;
  interviewer: string;
  score: number | null;
  feedback: string;
};

const VERIFICATIONS = [
  "unverified",
  "pending",
  "verified",
  "rejected",
] as const;
const SENIORITIES = ["junior", "mid", "senior", "staff", "principal"] as const;
const REGIONS = ["us", "ca", "uk", "eu", "other"] as const;
const PROFICIENCIES = ["learning", "working", "strong", "expert"] as const;
const AVAIL_STATUSES = ["available", "limited", "booked", "on-leave"] as const;
const MILESTONES = [
  "sourced",
  "screening",
  "submitted",
  "interviewing",
  "offer",
  "placed",
  "archived",
] as const;
const INTERVIEW_TYPES = [
  "screen",
  "technical",
  "system-design",
  "behavioral",
  "final",
] as const;
const INTERVIEW_OUTCOMES = [
  "scheduled",
  "passed",
  "failed",
  "no-show",
  "rescheduled",
] as const;

export default function CandidateDetailView({
  candidate: initial,
  skills: initialSkills,
  availability: initialAvail,
  placements: initialPlacements,
  interviews: initialInterviews,
}: {
  candidate: Candidate;
  skills: Skill[];
  availability: Availability[];
  placements: Placement[];
  interviews: Interview[];
}) {
  const router = useRouter();
  const [candidate, setCandidate] = useState(initial);
  const [skills, setSkills] = useState<Skill[]>(initialSkills);
  const [availability, setAvailability] = useState<Availability[]>(initialAvail);
  const [placements, setPlacements] = useState<Placement[]>(initialPlacements);
  const [interviews, setInterviews] = useState<Interview[]>(initialInterviews);

  const [tab, setTab] = useState<
    "overview" | "skills" | "availability" | "placements" | "interviews"
  >("overview");

  const [editingCandidate, setEditingCandidate] = useState(false);
  const [candidateForm, setCandidateForm] = useState(initial);

  const [skillDefinitionsList, setSkillDefinitionsList] = useState<
    Array<{
      id: number;
      name: string;
      slug: string;
      categoryName: string;
      categorySlug: string;
      categoryColor: string;
    }>
  >([]);

  useEffect(() => {
    fetch("/api/skills/definitions")
      .then((r) => r.json())
      .then((data) => {
        if (data.definitions) setSkillDefinitionsList(data.definitions);
      })
      .catch(() => {});
  }, []);

  const [skillModal, setSkillModal] = useState<{ open: boolean; id?: number }>({
    open: false,
  });
  const [skillForm, setSkillForm] = useState({
    skillId: 0,
    customName: "",
    categorySlug: "frontend",
    proficiency: "strong",
    yearsUsed: 2,
    notes: "",
  });

  const [availModal, setAvailModal] = useState({ open: false });
  const [availForm, setAvailForm] = useState({
    weekStart: new Date().toISOString().slice(0, 10),
    hoursPerWeek: 40,
    status: "available",
    preferredStart: "2 weeks",
    notes: "",
  });

  const [placementModal, setPlacementModal] = useState<{
    open: boolean;
    id?: number;
  }>({ open: false });
  const [placementForm, setPlacementForm] = useState({
    clientName: "",
    roleTitle: "",
    status: "sourced",
    valueUsd: 0,
    startDate: "",
    notes: "",
  });

  const [interviewModal, setInterviewModal] = useState<{
    open: boolean;
    id?: number;
  }>({ open: false });
  const [interviewForm, setInterviewForm] = useState({
    placementId: null as number | null,
    type: "technical",
    scheduledAt: new Date().toISOString().slice(0, 16),
    durationMinutes: 60,
    outcome: "scheduled",
    interviewer: "",
    score: null as number | null,
    feedback: "",
  });

  const [inviting, setInviting] = useState(false);
  const [lastInviteLink, setLastInviteLink] = useState<string | null>(null);
  const [uploadingResume, setUploadingResume] = useState(false);

  async function handleResumeUpload(file: File) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
      pushToast("Please upload a PDF document.", "error");
      return;
    }
    setUploadingResume(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/candidates/${candidate.id}/resume`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to parse resume");
      pushToast(`✓ Resume parsed: ${data.skillsCount || 0} skills updated!`, "success");
      router.refresh();
    } catch (err: any) {
      pushToast(err.message || "Resume upload failed", "error");
    } finally {
      setUploadingResume(false);
    }
  }

  async function handleSendInvite() {
    setInviting(true);
    try {
      const res = await fetch(`/api/candidates/${candidate.id}/invite`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error ?? "Failed to send invitation");
      }
      const data = (await res.json()) as {
        inviteLink: string;
        delivered: boolean;
      };
      setLastInviteLink(data.inviteLink);
      if (data.delivered) {
        pushToast("Portal invitation dispatched via SMTP.", "success");
      } else {
        pushToast("Magic invite link generated! (Preview below)", "success");
      }
      router.refresh();
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Invite failed", "error");
    } finally {
      setInviting(false);
    }
  }

  function handleCopyInviteLink(link: string) {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(link);
      pushToast("Magic invite link copied to clipboard.", "success");
    }
  }

  async function saveCandidate(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch(`/api/candidates/${candidate.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fullName: candidateForm.fullName,
          headline: candidateForm.headline,
          email: candidateForm.email,
          phone: candidateForm.phone,
          location: candidateForm.location,
          region: candidateForm.region,
          timezone: candidateForm.timezone,
          timezoneOverlap: candidateForm.timezoneOverlap,
          seniority: candidateForm.seniority,
          yearsExperience: Number(candidateForm.yearsExperience),
          hourlyRateUsd: Number(candidateForm.hourlyRateUsd),
          verification: candidateForm.verification,
          bio: candidateForm.bio,
          portfolioUrl: candidateForm.portfolioUrl,
          githubUrl: candidateForm.githubUrl,
          linkedinUrl: candidateForm.linkedinUrl,
          tags: candidateForm.tags,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error ?? "Could not save");
      }
      const data = (await res.json()) as { candidate: Candidate };
      setCandidate((prev) => ({ ...prev, ...data.candidate }));
      setEditingCandidate(false);
      pushToast("Profile updated.", "success");
      router.refresh();
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Failed", "error");
    }
  }

  async function deleteCandidate() {
    if (
      !confirm(
        `Delete ${candidate.fullName}? This will remove their placements and interviews too.`
      )
    )
      return;
    try {
      const res = await fetch(`/api/candidates/${candidate.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed");
      pushToast("Candidate removed.", "success");
      router.push("/candidates");
      router.refresh();
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Failed", "error");
    }
  }

  // Skills
  // Skills
  function openAddSkill() {
    const defaultId = skillDefinitionsList[0]?.id ?? 0;
    setSkillForm({
      skillId: defaultId,
      customName: "",
      categorySlug: "frontend",
      proficiency: "strong",
      yearsUsed: 2,
      notes: "",
    });
    setSkillModal({ open: true });
  }
  function openEditSkill(s: Skill) {
    setSkillForm({
      skillId: s.skillId ?? 0,
      customName: s.name ?? s.framework ?? "",
      categorySlug: s.categorySlug ?? "frontend",
      proficiency: s.proficiency,
      yearsUsed: s.yearsUsed,
      notes: s.notes,
    });
    setSkillModal({ open: true, id: s.id });
  }
  async function saveSkill(e: React.FormEvent) {
    e.preventDefault();
    const isEdit = !!skillModal.id;
    const url = isEdit ? `/api/skills/${skillModal.id}` : "/api/skills";
    const method = isEdit ? "PATCH" : "POST";
    
    const body: Record<string, unknown> = {
      proficiency: skillForm.proficiency,
      yearsUsed: Number(skillForm.yearsUsed),
      notes: skillForm.notes,
    };

    if (isEdit) {
      if (skillForm.skillId > 0) body.skillId = skillForm.skillId;
    } else {
      body.candidateId = candidate.id;
      if (skillForm.skillId > 0) {
        body.skillId = skillForm.skillId;
      } else if (skillForm.customName.trim()) {
        body.skillName = skillForm.customName.trim();
        body.categorySlug = skillForm.categorySlug;
      }
    }

    try {
      const res = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error ?? "Failed");
      }
      const data = (await res.json()) as { skill: Skill };
      if (isEdit) {
        setSkills((prev) =>
          prev.map((s) =>
            s.id === skillModal.id
              ? { ...data.skill, lastUsedAt: data.skill.lastUsedAt }
              : s
          )
        );
      } else {
        setSkills((prev) => [data.skill, ...prev]);
      }
      setSkillModal({ open: false });
      pushToast(isEdit ? "Skill updated." : "Skill added.", "success");
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Failed", "error");
    }
  }
  async function deleteSkill(s: Skill) {
    if (!confirm("Remove this skill from the matrix?")) return;
    const previous = skills;
    setSkills((prev) => prev.filter((x) => x.id !== s.id));
    try {
      const res = await fetch(`/api/skills/${s.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      pushToast("Skill removed.", "success");
    } catch (err) {
      setSkills(previous);
      pushToast(err instanceof Error ? err.message : "Failed", "error");
    }
  }

  // Availability
  function openAddAvail() {
    setAvailForm({
      weekStart: new Date().toISOString().slice(0, 10),
      hoursPerWeek: 40,
      status: "available",
      preferredStart: "2 weeks",
      notes: "",
    });
    setAvailModal({ open: true });
  }
  async function saveAvail(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/availability", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          candidateId: candidate.id,
          weekStart: availForm.weekStart,
          hoursPerWeek: Number(availForm.hoursPerWeek),
          status: availForm.status,
          preferredStart: availForm.preferredStart,
          notes: availForm.notes,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error ?? "Failed");
      }
      const data = (await res.json()) as { availability: Availability };
      setAvailability((prev) => [data.availability, ...prev]);
      setAvailModal({ open: false });
      pushToast("Availability recorded.", "success");
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Failed", "error");
    }
  }
  async function deleteAvail(a: Availability) {
    if (!confirm("Delete this availability snapshot?")) return;
    const previous = availability;
    setAvailability((prev) => prev.filter((x) => x.id !== a.id));
    try {
      const res = await fetch(`/api/availability/${a.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed");
      pushToast("Availability removed.", "success");
    } catch (err) {
      setAvailability(previous);
      pushToast(err instanceof Error ? err.message : "Failed", "error");
    }
  }

  // Placements
  function openAddPlacement() {
    setPlacementForm({
      clientName: "",
      roleTitle: "",
      status: "sourced",
      valueUsd: 0,
      startDate: "",
      notes: "",
    });
    setPlacementModal({ open: true });
  }
  function openEditPlacement(p: Placement) {
    setPlacementForm({
      clientName: p.clientName,
      roleTitle: p.roleTitle,
      status: p.status,
      valueUsd: p.valueUsd,
      startDate: p.startDate ? p.startDate.slice(0, 10) : "",
      notes: p.notes,
    });
    setPlacementModal({ open: true, id: p.id });
  }
  async function savePlacement(e: React.FormEvent) {
    e.preventDefault();
    const isEdit = !!placementModal.id;
    const url = isEdit
      ? `/api/placements/${placementModal.id}`
      : "/api/placements";
    const method = isEdit ? "PATCH" : "POST";
    const body = isEdit
      ? {
          clientName: placementForm.clientName,
          roleTitle: placementForm.roleTitle,
          status: placementForm.status,
          valueUsd: Number(placementForm.valueUsd),
          startDate: placementForm.startDate || null,
          notes: placementForm.notes,
        }
      : {
          candidateId: candidate.id,
          clientName: placementForm.clientName,
          roleTitle: placementForm.roleTitle,
          status: placementForm.status,
          valueUsd: Number(placementForm.valueUsd),
          startDate: placementForm.startDate || null,
          notes: placementForm.notes,
        };
    try {
      const res = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error ?? "Failed");
      }
      const data = (await res.json()) as { placement: Placement };
      if (isEdit) {
        setPlacements((prev) =>
          prev.map((p) => (p.id === placementModal.id ? data.placement : p))
        );
        pushToast("Milestone updated.", "success");
      } else {
        setPlacements((prev) => [data.placement, ...prev]);
        pushToast("Placement added.", "success");
      }
      setPlacementModal({ open: false });
      router.refresh();
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Failed", "error");
    }
  }
  async function deletePlacement(p: Placement) {
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

  // Interviews
  function openAddInterview() {
    setInterviewForm({
      placementId: null,
      type: "technical",
      scheduledAt: new Date(Date.now() + 1000 * 60 * 60 * 24)
        .toISOString()
        .slice(0, 16),
      durationMinutes: 60,
      outcome: "scheduled",
      interviewer: "",
      score: null,
      feedback: "",
    });
    setInterviewModal({ open: true });
  }
  function openEditInterview(i: Interview) {
    setInterviewForm({
      placementId: i.placementId,
      type: i.type,
      scheduledAt: i.scheduledAt.slice(0, 16),
      durationMinutes: i.durationMinutes,
      outcome: i.outcome,
      interviewer: i.interviewer,
      score: i.score,
      feedback: i.feedback,
    });
    setInterviewModal({ open: true, id: i.id });
  }
  async function saveInterview(e: React.FormEvent) {
    e.preventDefault();
    const isEdit = !!interviewModal.id;
    const url = isEdit
      ? `/api/interviews/${interviewModal.id}`
      : "/api/interviews";
    const method = isEdit ? "PATCH" : "POST";
    const body = isEdit
      ? {
          type: interviewForm.type,
          scheduledAt: new Date(interviewForm.scheduledAt).toISOString(),
          durationMinutes: Number(interviewForm.durationMinutes),
          outcome: interviewForm.outcome,
          interviewer: interviewForm.interviewer,
          score:
            interviewForm.score == null
              ? null
              : Number(interviewForm.score),
          feedback: interviewForm.feedback,
        }
      : {
          candidateId: candidate.id,
          placementId: interviewForm.placementId,
          type: interviewForm.type,
          scheduledAt: new Date(interviewForm.scheduledAt).toISOString(),
          durationMinutes: Number(interviewForm.durationMinutes),
          outcome: interviewForm.outcome,
          interviewer: interviewForm.interviewer,
          score: interviewForm.score,
          feedback: interviewForm.feedback,
        };
    try {
      const res = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error ?? "Failed");
      }
      const data = (await res.json()) as { interview: Interview };
      if (isEdit) {
        setInterviews((prev) =>
          prev.map((i) => (i.id === interviewModal.id ? data.interview : i))
        );
        pushToast("Interview updated.", "success");
      } else {
        setInterviews((prev) => [data.interview, ...prev]);
        pushToast("Interview scheduled.", "success");
      }
      setInterviewModal({ open: false });
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Failed", "error");
    }
  }
  async function deleteInterview(i: Interview) {
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
    <main className="content fade-in">
      <div style={{ marginBottom: 6 }}>
        <Link href="/candidates" className="btn ghost sm">
          <IconArrowLeft size={13} />
          All candidates
        </Link>
      </div>

      <header className="detail-hero">
        <Avatar
          name={candidate.fullName}
          color={candidate.avatarColor}
          size="xxl"
        />
        <div className="info">
          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <h1>{candidate.fullName}</h1>
            <StatusBadge kind="seniority" value={candidate.seniority} />
            <StatusBadge kind="verification" value={candidate.verification} />
          </div>
          <div className="headline">{candidate.headline}</div>
          <div className="meta">
            <span className="item">
              <IconMapPin size={13} /> {candidate.location}
            </span>
            <span className="item">
              <IconGlobe size={13} /> {candidate.timezoneOverlap}
            </span>
            <span className="item">
              <IconBolt size={13} /> {candidate.yearsExperience} yrs · {formatUsd(candidate.hourlyRateUsd)}/hr
            </span>
            <span className="item">
              <IconMail size={13} /> {candidate.email}
            </span>
          </div>
          {candidate.tags.length > 0 ? (
            <div className="cluster" style={{ marginTop: 12 }}>
              {candidate.tags.map((t) => (
                <span key={t} className="tag">
                  {t}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <label
            className="btn"
            style={{
              cursor: uploadingResume ? "wait" : "pointer",
              position: "relative",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)",
              borderColor: "#d8b4fe",
              color: "#6b21a8",
            }}
            title="Upload PDF Resume to auto-extract skills with AI"
          >
            <IconSparkle size={13} style={{ color: "#9333ea" }} />
            <span>{uploadingResume ? "Syncing…" : "AI Resume Sync"}</span>
            <input
              type="file"
              accept="application/pdf"
              disabled={uploadingResume}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleResumeUpload(file);
                e.target.value = "";
              }}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                opacity: 0,
                cursor: "pointer",
              }}
            />
          </label>
          <button
            className="btn"
            onClick={() => {
              setCandidateForm(candidate);
              setEditingCandidate(true);
            }}
          >
            <IconEdit size={13} />
            Edit
          </button>
          <button className="btn danger" onClick={deleteCandidate}>
            <IconTrash size={13} />
          </button>
        </div>
      </header>

      <nav className="tabs">
        {(
          [
            ["overview", "Overview"],
            ["skills", `Skills · ${skills.length}`],
            ["availability", `Availability · ${availability.length}`],
            ["placements", `Placements · ${placements.length}`],
            ["interviews", `Interviews · ${interviews.length}`],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            className={`tab ${tab === k ? "active" : ""}`}
            onClick={() => setTab(k)}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === "overview" ? (
        <section
          className="grid"
          style={{ gridTemplateColumns: "minmax(0, 1.7fr) minmax(0, 1fr)" }}
        >
          <div className="card card-pad">
            <h2 style={{ marginTop: 0, fontSize: 15, fontWeight: 700 }}>
              About
            </h2>
            <p
              style={{
                color: "var(--ink-soft)",
                lineHeight: 1.65,
                fontSize: 14,
                margin: "6px 0 0",
              }}
            >
              {candidate.bio || "No bio yet."}
            </p>
            <div className="divider" />
            <div className="grid cols-2">
              <DetailRow
                label="Seniority"
                value={SENIORITY_LABEL[candidate.seniority] ?? candidate.seniority}
              />
              <DetailRow
                label="Region"
                value={`${REGION_FLAG[candidate.region] ?? ""} ${
                  REGION_LABEL[candidate.region] ?? candidate.region
                }`}
              />
              <DetailRow label="Timezone" value={candidate.timezone} />
              <DetailRow label="Overlap" value={candidate.timezoneOverlap} />
              <DetailRow
                label="Experience"
                value={`${candidate.yearsExperience} years`}
              />
              <DetailRow
                label="Rate"
                value={`${formatUsdExact(candidate.hourlyRateUsd)} / hour`}
              />
              <DetailRow label="Added" value={formatRelative(candidate.createdAt)} />
              <DetailRow
                label="Updated"
                value={formatRelative(candidate.updatedAt)}
              />
            </div>
            <div className="divider" />
            <h2
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: "var(--ink-muted)",
                fontWeight: 700,
                margin: "0 0 10px",
              }}
            >
              Links
            </h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {candidate.portfolioUrl ? (
                <a
                  className="btn sm"
                  href={candidate.portfolioUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <IconLink size={12} /> Portfolio
                </a>
              ) : null}
              {candidate.githubUrl ? (
                <a
                  className="btn sm"
                  href={candidate.githubUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <IconLink size={12} /> GitHub
                </a>
              ) : null}
              {candidate.linkedinUrl ? (
                <a
                  className="btn sm"
                  href={candidate.linkedinUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <IconLink size={12} /> LinkedIn
                </a>
              ) : null}
              {candidate.phone ? (
                <span
                  className="btn sm"
                  style={{ pointerEvents: "none" }}
                >
                  <IconPhone size={12} /> {candidate.phone}
                </span>
              ) : null}
              {!candidate.portfolioUrl &&
              !candidate.githubUrl &&
              !candidate.linkedinUrl &&
              !candidate.phone ? (
                <span className="text-muted text-sm">No links added.</span>
              ) : null}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div className="card card-pad">
              <h2 style={{ marginTop: 0, fontSize: 15, fontWeight: 700 }}>
                Top stack
              </h2>
              {skills.length === 0 ? (
                <p className="text-muted text-sm" style={{ margin: 0 }}>
                  No skills tracked yet.
                </p>
              ) : (
                <div className="cluster" style={{ marginTop: 8 }}>
                  {skills.slice(0, 8).map((s) => (
                    <FrameworkChip
                      key={s.id}
                      name={s.name ?? s.framework}
                      framework={s.slug ?? s.framework}
                      color={s.categoryColor}
                      proficiency={s.proficiency}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="card card-pad">
              <h2 style={{ marginTop: 0, fontSize: 15, fontWeight: 700 }}>
                Quick stats
              </h2>
              <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
                <QuickStat
                  count={placements.length}
                  label="placements"
                  icon={<IconBriefcase size={14} />}
                />
                <QuickStat
                  count={placements.filter((p) => p.status === "placed").length}
                  label="placed"
                  icon={<IconTrendUp size={14} />}
                  color="#479c73"
                />
                <QuickStat
                  count={interviews.filter((i) => i.outcome === "passed").length}
                  label="interviews passed"
                  icon={<IconStar size={14} />}
                  color="#c48a3a"
                />
                <QuickStat
                  count={
                    availability.find((a) => a.status === "available") ? 1 : 0
                  }
                  label="available right now"
                  icon={<IconClock size={14} />}
                  color="#5a8db0"
                />
              </div>
            </div>

            {/* Candidate Portal Access Card */}
            <div
              className="card card-pad"
              style={{ borderLeft: "4px solid var(--sangria)" }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <h2
                  style={{
                    margin: 0,
                    fontSize: 15,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  ✦ Candidate Portal
                </h2>
                {candidate.userId ? (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--jade)",
                      background: "rgba(71, 156, 115, 0.12)",
                      padding: "2px 8px",
                      borderRadius: 999,
                    }}
                  >
                    Active Account
                  </span>
                ) : candidate.inviteToken || lastInviteLink ? (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--amber)",
                      background: "rgba(196, 138, 58, 0.12)",
                      padding: "2px 8px",
                      borderRadius: 999,
                    }}
                  >
                    Invite Pending
                  </span>
                ) : (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--ink-muted)",
                      background: "var(--pebble-soft)",
                      padding: "2px 8px",
                      borderRadius: 999,
                    }}
                  >
                    Not Activated
                  </span>
                )}
              </div>

              <p
                style={{
                  fontSize: 13,
                  color: "var(--ink-muted)",
                  margin: "0 0 12px 0",
                  lineHeight: 1.45,
                }}
              >
                {candidate.userId
                  ? "This candidate has claimed their portal account and can manage their profile, skills, and availability in real time."
                  : "Allow candidate to view pipeline stages, scheduled interviews, update availability, and self-assess skills via passwordless magic links."}
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button
                  type="button"
                  onClick={handleSendInvite}
                  disabled={inviting}
                  className="btn btn-primary sm"
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  {inviting
                    ? "Generating & Dispatching…"
                    : candidate.userId
                    ? "Send Fresh Sign-In Link ⚡"
                    : candidate.inviteToken || lastInviteLink
                    ? "Resend Portal Invitation ⚡"
                    : "Send Magic Link Invite ⚡"}
                </button>

                {lastInviteLink || candidate.inviteToken ? (
                  <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopyInviteLink(
                          lastInviteLink ||
                            `${typeof window !== "undefined" ? window.location.origin : ""}/invite/${candidate.inviteToken}`
                        )
                      }
                      className="btn sm"
                      style={{ flex: 1, justifyContent: "center" }}
                    >
                      <IconLink size={12} /> Copy Magic Link
                    </button>
                    <a
                      href={
                        lastInviteLink ||
                        `/invite/${candidate.inviteToken}`
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="btn sm ghost"
                      title="Open preview link"
                    >
                      Preview ↗
                    </a>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {tab === "skills" ? (
        <section className="card">
          <div
            className="card-pad"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>
                Skill matrix
              </h2>
              <div className="text-muted text-sm" style={{ marginTop: 2 }}>
                Proficiency and years used per framework.
              </div>
            </div>
            <button className="btn primary" onClick={openAddSkill}>
              <IconPlus size={13} /> Add skill
            </button>
          </div>
          {skills.length === 0 ? (
            <div className="empty">
              <div className="icon">
                <IconStar size={26} />
              </div>
              <h3>No skills tracked</h3>
              <p>
                Add their first framework to start matching candidates to
                roles.
              </p>
            </div>
          ) : (
            <div className="table-wrap" style={{ border: "none", borderRadius: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th>Framework</th>
                    <th>Proficiency</th>
                    <th>Years</th>
                    <th>Last used</th>
                    <th>Notes</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {skills.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <FrameworkChip
                          name={s.name ?? s.framework}
                          framework={s.slug ?? s.framework}
                          color={s.categoryColor}
                        />
                      </td>
                      <td>
                        <span
                          className={`skill-tag ${s.proficiency}`}
                          style={{ display: "inline-flex" }}
                        >
                          {PROFICIENCY_LABEL[s.proficiency] ?? s.proficiency}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600 }}>{s.yearsUsed}</span>
                      </td>
                      <td className="text-muted text-sm">
                        {formatRelative(s.lastUsedAt)}
                      </td>
                      <td
                        className="text-muted text-sm"
                        style={{ maxWidth: 220 }}
                      >
                        {s.notes || "—"}
                      </td>
                      <td>
                        <div className="row-actions">
                          <button
                            className="btn ghost sm"
                            onClick={() => openEditSkill(s)}
                          >
                            <IconEdit size={12} />
                          </button>
                          <button
                            className="btn ghost sm"
                            onClick={() => deleteSkill(s)}
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
        </section>
      ) : null}

      {tab === "availability" ? (
        <section className="card">
          <div
            className="card-pad"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>
                Availability snapshots
              </h2>
              <div className="text-muted text-sm" style={{ marginTop: 2 }}>
                Track weekly capacity, status, and preferred start date.
              </div>
            </div>
            <button className="btn primary" onClick={openAddAvail}>
              <IconPlus size={13} /> Add snapshot
            </button>
          </div>
          {availability.length === 0 ? (
            <div className="empty">
              <div className="icon">
                <IconClock size={26} />
              </div>
              <h3>No availability tracked</h3>
              <p>Add a weekly snapshot to know when they can start.</p>
            </div>
          ) : (
            <div className="table-wrap" style={{ border: "none", borderRadius: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th>Week of</th>
                    <th>Hours/week</th>
                    <th>Status</th>
                    <th>Can start</th>
                    <th>Notes</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {availability.map((a) => (
                    <tr key={a.id}>
                      <td>{formatDate(a.weekStart)}</td>
                      <td>
                        <span style={{ fontWeight: 600 }}>
                          {a.hoursPerWeek}
                        </span>{" "}
                        <span className="text-muted text-xs">hrs</span>
                      </td>
                      <td>
                        <StatusBadge kind="availability" value={a.status} />
                      </td>
                      <td>{a.preferredStart}</td>
                      <td
                        className="text-muted text-sm"
                        style={{ maxWidth: 260 }}
                      >
                        {a.notes || "—"}
                      </td>
                      <td>
                        <div className="row-actions">
                          <button
                            className="btn ghost sm"
                            onClick={() => deleteAvail(a)}
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
        </section>
      ) : null}

      {tab === "placements" ? (
        <section className="card">
          <div
            className="card-pad"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>
                Placement milestones
              </h2>
              <div className="text-muted text-sm" style={{ marginTop: 2 }}>
                From sourced to placed — every step on the journey.
              </div>
            </div>
            <button className="btn primary" onClick={openAddPlacement}>
              <IconPlus size={13} /> Add placement
            </button>
          </div>
          {placements.length === 0 ? (
            <div className="empty">
              <div className="icon">
                <IconBriefcase size={26} />
              </div>
              <h3>No placements yet</h3>
              <p>Create the first milestone when you submit this candidate.</p>
            </div>
          ) : (
            <div className="table-wrap" style={{ border: "none", borderRadius: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th>Client / Role</th>
                    <th>Status</th>
                    <th>Value</th>
                    <th>Start date</th>
                    <th>Notes</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {placements.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{p.clientName}</div>
                        <div className="text-muted text-sm">
                          {p.roleTitle}
                        </div>
                      </td>
                      <td>
                        <StatusBadge kind="milestone" value={p.status} />
                      </td>
                      <td className="font-semibold">
                        {formatUsd(p.valueUsd)}
                      </td>
                      <td>{p.startDate ? formatDate(p.startDate) : "—"}</td>
                      <td
                        className="text-muted text-sm"
                        style={{ maxWidth: 240 }}
                      >
                        {p.notes || "—"}
                      </td>
                      <td>
                        <div className="row-actions">
                          <button
                            className="btn ghost sm"
                            onClick={() => openEditPlacement(p)}
                          >
                            <IconEdit size={12} />
                          </button>
                          <button
                            className="btn ghost sm"
                            onClick={() => deletePlacement(p)}
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
        </section>
      ) : null}

      {tab === "interviews" ? (
        <section className="card">
          <div
            className="card-pad"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>
                Interview coaching pipeline
              </h2>
              <div className="text-muted text-sm" style={{ marginTop: 2 }}>
                Schedule, score, and debrief every loop.
              </div>
            </div>
            <button className="btn primary" onClick={openAddInterview}>
              <IconPlus size={13} /> Add interview
            </button>
          </div>
          {interviews.length === 0 ? (
            <div className="empty">
              <div className="icon">
                <IconCalendar size={26} />
              </div>
              <h3>No interviews logged</h3>
              <p>
                Schedule a screen or debrief a loop to start tracking coaching
                data.
              </p>
            </div>
          ) : (
            <div className="table-wrap" style={{ border: "none", borderRadius: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>When</th>
                    <th>Interviewer</th>
                    <th>Outcome</th>
                    <th>Score</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {interviews.map((i) => {
                    const placement = placements.find(
                      (p) => p.id === i.placementId
                    );
                    const tier = relTier(i.scheduledAt);
                    return (
                      <tr key={i.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>
                            {INTERVIEW_TYPE_LABEL[i.type] ?? i.type}
                          </div>
                          {placement ? (
                            <div className="text-muted text-sm">
                              {placement.clientName}
                            </div>
                          ) : null}
                        </td>
                        <td>
                          <div style={{ fontWeight: 500 }}>
                            {formatDateTime(i.scheduledAt)}
                          </div>
                          <div
                            className="text-muted text-sm"
                            style={{ display: "flex", alignItems: "center", gap: 6 }}
                          >
                            <span
                              className={`rel-pill ${
                                tier === "urgent"
                                  ? "urgent"
                                  : tier === "soon"
                                    ? "soon"
                                    : tier === "past"
                                      ? ""
                                      : "jade"
                              }`}
                            >
                              {formatRelative(i.scheduledAt)}
                            </span>
                            <span>· {i.durationMinutes}m</span>
                          </div>
                        </td>
                        <td>{i.interviewer || "—"}</td>
                        <td>
                          <StatusBadge kind="interview" value={i.outcome} />
                        </td>
                        <td>
                          {i.score == null ? (
                            <span className="text-muted text-sm">—</span>
                          ) : (
                            <span style={{ fontWeight: 700 }}>
                              {i.score}
                              <span
                                style={{
                                  color: "var(--ink-muted)",
                                  fontSize: 11,
                                }}
                              >
                                /10
                              </span>
                            </span>
                          )}
                        </td>
                        <td>
                          <div className="row-actions">
                            <button
                              className="btn ghost sm"
                              onClick={() => openEditInterview(i)}
                            >
                              <IconEdit size={12} />
                            </button>
                            <button
                              className="btn ghost sm"
                              onClick={() => deleteInterview(i)}
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
          {interviews.some((i) => i.feedback) ? (
            <div style={{ padding: 18 }}>
              <h3
                style={{
                  fontSize: 11,
                  color: "var(--ink-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  fontWeight: 700,
                  margin: "0 0 12px",
                }}
              >
                Recent feedback
              </h3>
              {interviews
                .filter((i) => i.feedback)
                .slice(0, 4)
                .map((i) => (
                  <div className="hr-row" key={i.id}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>
                        {INTERVIEW_TYPE_LABEL[i.type] ?? i.type} ·{" "}
                        <span className="text-muted text-sm">
                          {formatRelative(i.scheduledAt)}
                        </span>
                      </div>
                      <div
                        className="text-soft text-sm"
                        style={{ marginTop: 4 }}
                      >
                        {i.feedback}
                      </div>
                    </div>
                    {i.score != null ? (
                      <span className="badge success">{i.score}/10</span>
                    ) : null}
                  </div>
                ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {/* Modals unchanged in structure, just with new brand styling applied via globals.css */}
      <Modal
        open={editingCandidate}
        onClose={() => setEditingCandidate(false)}
        title="Edit candidate"
        footer={
          <>
            <button
              type="button"
              className="btn"
              onClick={() => setEditingCandidate(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="edit-candidate-form"
              className="btn primary"
            >
              Save changes
            </button>
          </>
        }
      >
        <form id="edit-candidate-form" onSubmit={saveCandidate}>
          <div className="grid cols-2">
            <div className="field">
              <label>Full name</label>
              <input
                value={candidateForm.fullName}
                onChange={(e) =>
                  setCandidateForm({ ...candidateForm, fullName: e.target.value })
                }
              />
            </div>
            <div className="field">
              <label>Email</label>
              <input
                value={candidateForm.email}
                onChange={(e) =>
                  setCandidateForm({ ...candidateForm, email: e.target.value })
                }
              />
            </div>
          </div>
          <div className="field">
            <label>Headline</label>
            <input
              value={candidateForm.headline}
              onChange={(e) =>
                setCandidateForm({ ...candidateForm, headline: e.target.value })
              }
            />
          </div>
          <div className="grid cols-2">
            <div className="field">
              <label>Location</label>
              <input
                value={candidateForm.location}
                onChange={(e) =>
                  setCandidateForm({ ...candidateForm, location: e.target.value })
                }
              />
            </div>
            <div className="field">
              <label>Region</label>
              <select
                value={candidateForm.region}
                onChange={(e) =>
                  setCandidateForm({ ...candidateForm, region: e.target.value })
                }
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
                value={candidateForm.timezone}
                onChange={(e) =>
                  setCandidateForm({ ...candidateForm, timezone: e.target.value })
                }
              />
            </div>
            <div className="field">
              <label>Overlap</label>
              <input
                value={candidateForm.timezoneOverlap}
                onChange={(e) =>
                  setCandidateForm({
                    ...candidateForm,
                    timezoneOverlap: e.target.value,
                  })
                }
              />
            </div>
          </div>
          <div className="grid cols-3">
            <div className="field">
              <label>Seniority</label>
              <select
                value={candidateForm.seniority}
                onChange={(e) =>
                  setCandidateForm({ ...candidateForm, seniority: e.target.value })
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
                value={candidateForm.yearsExperience}
                onChange={(e) =>
                  setCandidateForm({
                    ...candidateForm,
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
                value={candidateForm.hourlyRateUsd}
                onChange={(e) =>
                  setCandidateForm({
                    ...candidateForm,
                    hourlyRateUsd: Number(e.target.value),
                  })
                }
              />
            </div>
          </div>
          <div className="field">
            <label>Verification</label>
            <select
              value={candidateForm.verification}
              onChange={(e) =>
                setCandidateForm({ ...candidateForm, verification: e.target.value })
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
            <label>Bio</label>
            <textarea
              value={candidateForm.bio}
              onChange={(e) =>
                setCandidateForm({ ...candidateForm, bio: e.target.value })
              }
            />
          </div>
        </form>
      </Modal>

      <Modal
        open={skillModal.open}
        onClose={() => setSkillModal({ open: false })}
        title={skillModal.id ? "Edit skill" : "Add skill"}
        footer={
          <>
            <button
              type="button"
              className="btn"
              onClick={() => setSkillModal({ open: false })}
            >
              Cancel
            </button>
            <button type="submit" form="skill-form" className="btn primary">
              {skillModal.id ? "Save" : "Add skill"}
            </button>
          </>
        }
      >
        <form id="skill-form" onSubmit={saveSkill}>
          <div className="field">
            <label>Skill / Tool</label>
            <select
              value={skillForm.skillId}
              onChange={(e) =>
                setSkillForm({ ...skillForm, skillId: Number(e.target.value) })
              }
            >
              {skillDefinitionsList.length > 0 ? (
                <>
                  <option value={0}>+ Add custom / unlisted skill</option>
                  {skillDefinitionsList.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.categoryName})
                    </option>
                  ))}
                </>
              ) : (
                FRAMEWORKS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))
              )}
            </select>
          </div>

          {skillForm.skillId === 0 ? (
            <div className="grid cols-2">
              <div className="field">
                <label>Skill name</label>
                <input
                  required
                  placeholder="e.g. Go, AWS, Terraform"
                  value={skillForm.customName}
                  onChange={(e) =>
                    setSkillForm({ ...skillForm, customName: e.target.value })
                  }
                />
              </div>
              <div className="field">
                <label>Category</label>
                <select
                  value={skillForm.categorySlug}
                  onChange={(e) =>
                    setSkillForm({ ...skillForm, categorySlug: e.target.value })
                  }
                >
                  <option value="frontend">Frontend</option>
                  <option value="backend">Backend</option>
                  <option value="cloud-devops">Cloud & DevOps</option>
                  <option value="mobile">Mobile</option>
                  <option value="data-storage">Data & Storage</option>
                  <option value="architecture">Architecture & Other</option>
                </select>
              </div>
            </div>
          ) : null}
          <div className="grid cols-2">
            <div className="field">
              <label>Proficiency</label>
              <select
                value={skillForm.proficiency}
                onChange={(e) =>
                  setSkillForm({ ...skillForm, proficiency: e.target.value })
                }
              >
                {PROFICIENCIES.map((p) => (
                  <option key={p} value={p}>
                    {PROFICIENCY_LABEL[p]}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Years used</label>
              <input
                type="number"
                min={0}
                value={skillForm.yearsUsed}
                onChange={(e) =>
                  setSkillForm({ ...skillForm, yearsUsed: Number(e.target.value) })
                }
              />
            </div>
          </div>
          <div className="field">
            <label>Notes</label>
            <textarea
              value={skillForm.notes}
              onChange={(e) =>
                setSkillForm({ ...skillForm, notes: e.target.value })
              }
              placeholder="e.g. Used in production across 3 SaaS products."
            />
          </div>
        </form>
      </Modal>

      <Modal
        open={availModal.open}
        onClose={() => setAvailModal({ open: false })}
        title="Add availability snapshot"
        footer={
          <>
            <button
              type="button"
              className="btn"
              onClick={() => setAvailModal({ open: false })}
            >
              Cancel
            </button>
            <button type="submit" form="avail-form" className="btn primary">
              Save
            </button>
          </>
        }
      >
        <form id="avail-form" onSubmit={saveAvail}>
          <div className="grid cols-2">
            <div className="field">
              <label>Week of</label>
              <input
                type="date"
                value={availForm.weekStart}
                onChange={(e) =>
                  setAvailForm({ ...availForm, weekStart: e.target.value })
                }
              />
            </div>
            <div className="field">
              <label>Hours / week</label>
              <input
                type="number"
                min={0}
                value={availForm.hoursPerWeek}
                onChange={(e) =>
                  setAvailForm({ ...availForm, hoursPerWeek: Number(e.target.value) })
                }
              />
            </div>
          </div>
          <div className="grid cols-2">
            <div className="field">
              <label>Status</label>
              <select
                value={availForm.status}
                onChange={(e) =>
                  setAvailForm({ ...availForm, status: e.target.value })
                }
              >
                {AVAIL_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {AVAILABILITY_LABEL[s]}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Preferred start</label>
              <input
                value={availForm.preferredStart}
                onChange={(e) =>
                  setAvailForm({ ...availForm, preferredStart: e.target.value })
                }
                placeholder="e.g. 2 weeks"
              />
            </div>
          </div>
          <div className="field">
            <label>Notes</label>
            <textarea
              value={availForm.notes}
              onChange={(e) => setAvailForm({ ...availForm, notes: e.target.value })}
            />
          </div>
        </form>
      </Modal>

      <Modal
        open={placementModal.open}
        onClose={() => setPlacementModal({ open: false })}
        title={placementModal.id ? "Edit placement" : "Add placement"}
        footer={
          <>
            <button
              type="button"
              className="btn"
              onClick={() => setPlacementModal({ open: false })}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="placement-form"
              className="btn primary"
            >
              {placementModal.id ? "Save" : "Add placement"}
            </button>
          </>
        }
      >
        <form id="placement-form" onSubmit={savePlacement}>
          <div className="grid cols-2">
            <div className="field">
              <label>Client</label>
              <input
                required
                value={placementForm.clientName}
                onChange={(e) =>
                  setPlacementForm({ ...placementForm, clientName: e.target.value })
                }
              />
            </div>
            <div className="field">
              <label>Role</label>
              <input
                required
                value={placementForm.roleTitle}
                onChange={(e) =>
                  setPlacementForm({ ...placementForm, roleTitle: e.target.value })
                }
              />
            </div>
          </div>
          <div className="grid cols-3">
            <div className="field">
              <label>Status</label>
              <select
                value={placementForm.status}
                onChange={(e) =>
                  setPlacementForm({ ...placementForm, status: e.target.value })
                }
              >
                {MILESTONES.map((m) => (
                  <option key={m} value={m}>
                    {MILESTONE_LABEL[m]}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Value (USD)</label>
              <input
                type="number"
                min={0}
                value={placementForm.valueUsd}
                onChange={(e) =>
                  setPlacementForm({
                    ...placementForm,
                    valueUsd: Number(e.target.value),
                  })
                }
              />
            </div>
            <div className="field">
              <label>Start date</label>
              <input
                type="date"
                value={placementForm.startDate}
                onChange={(e) =>
                  setPlacementForm({ ...placementForm, startDate: e.target.value })
                }
              />
            </div>
          </div>
          <div className="field">
            <label>Notes</label>
            <textarea
              value={placementForm.notes}
              onChange={(e) =>
                setPlacementForm({ ...placementForm, notes: e.target.value })
              }
            />
          </div>
        </form>
      </Modal>

      <Modal
        open={interviewModal.open}
        onClose={() => setInterviewModal({ open: false })}
        title={interviewModal.id ? "Edit interview" : "Add interview"}
        footer={
          <>
            <button
              type="button"
              className="btn"
              onClick={() => setInterviewModal({ open: false })}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="interview-form"
              className="btn primary"
            >
              {interviewModal.id ? "Save" : "Schedule"}
            </button>
          </>
        }
      >
        <form id="interview-form" onSubmit={saveInterview}>
          <div className="grid cols-2">
            <div className="field">
              <label>Type</label>
              <select
                value={interviewForm.type}
                onChange={(e) =>
                  setInterviewForm({ ...interviewForm, type: e.target.value })
                }
              >
                {INTERVIEW_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {INTERVIEW_TYPE_LABEL[t]}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Linked placement</label>
              <select
                value={interviewForm.placementId ?? ""}
                onChange={(e) =>
                  setInterviewForm({
                    ...interviewForm,
                    placementId: e.target.value
                      ? Number(e.target.value)
                      : null,
                  })
                }
              >
                <option value="">None</option>
                {placements.map((p) => (
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
                value={interviewForm.scheduledAt}
                onChange={(e) =>
                  setInterviewForm({ ...interviewForm, scheduledAt: e.target.value })
                }
              />
            </div>
            <div className="field">
              <label>Duration (min)</label>
              <input
                type="number"
                min={15}
                value={interviewForm.durationMinutes}
                onChange={(e) =>
                  setInterviewForm({
                    ...interviewForm,
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
                value={interviewForm.outcome}
                onChange={(e) =>
                  setInterviewForm({ ...interviewForm, outcome: e.target.value })
                }
              >
                {INTERVIEW_OUTCOMES.map((o) => (
                  <option key={o} value={o}>
                    {INTERVIEW_OUTCOME_LABEL[o]}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Interviewer</label>
              <input
                value={interviewForm.interviewer}
                onChange={(e) =>
                  setInterviewForm({ ...interviewForm, interviewer: e.target.value })
                }
              />
            </div>
            <div className="field">
              <label>Score /10</label>
              <input
                type="number"
                min={0}
                max={10}
                value={interviewForm.score ?? ""}
                onChange={(e) =>
                  setInterviewForm({
                    ...interviewForm,
                    score: e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              />
            </div>
          </div>
          <div className="field">
            <label>Feedback</label>
            <textarea
              value={interviewForm.feedback}
              onChange={(e) =>
                setInterviewForm({ ...interviewForm, feedback: e.target.value })
              }
              placeholder="What went well, what to coach, next steps."
            />
          </div>
        </form>
      </Modal>
    </main>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "var(--ink-muted)",
          fontWeight: 700,
        }}
      >
        {label}
      </div>
      <div style={{ fontWeight: 600, color: "var(--ink)", fontSize: 14 }}>
        {value}
      </div>
    </div>
  );
}

function QuickStat({
  count,
  label,
  icon,
  color = "#7a1229",
}: {
  count: number;
  label: string;
  icon: React.ReactNode;
  color?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "10px 12px",
        background: "var(--pebble-tint)",
        borderRadius: 10,
        fontSize: 13,
        gap: 8,
      }}
    >
      <span
        style={{
          color: "var(--ink-soft)",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontWeight: 500,
        }}
      >
        <span
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            background: `${color}1f`,
            color,
            display: "grid",
            placeItems: "center",
          }}
        >
          {icon}
        </span>
        {label}
      </span>
      <span style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
        {count}
      </span>
    </div>
  );
}
