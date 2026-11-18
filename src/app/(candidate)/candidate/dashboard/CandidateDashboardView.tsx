"use client";

import { useState } from "react";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import StatusBadge from "@/components/StatusBadge";
import {
  PROFICIENCY_LABEL,
  SENIORITY_LABEL,
  REGION_FLAG,
  formatDate,
  formatDateTime,
  formatUsd,
  INTERVIEW_TYPE_LABEL,
  INTERVIEW_OUTCOME_LABEL,
} from "@/lib/format";
import { pushToast } from "@/components/ToastHost";
import {
  IconCalendar,
  IconClock,
  IconGlobe,
  IconMapPin,
  IconBriefcase,
  IconStar,
  IconPipeline,
  IconBolt,
} from "@/components/Icon";

type Candidate = {
  id: number;
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

type Placement = {
  id: number;
  clientName: string;
  roleTitle: string;
  status: string;
  valueUsd: number;
  startDate: string | null;
  notes: string;
  client: {
    id: number;
    name: string;
    logoColor: string;
    website: string | null;
    industry: string | null;
  } | null;
};

type Interview = {
  id: number;
  type: string;
  scheduledAt: string;
  durationMinutes: number;
  outcome: string;
  interviewer: string;
  score: number | null;
  feedback: string;
};

type Availability = {
  id: number;
  status: string;
  hoursPerWeek: number;
  preferredStart: string;
  notes: string;
  weekStart?: string;
} | null;

type Skill = {
  id: number;
  skillId: number;
  name: string;
  slug: string;
  proficiency: string;
  yearsUsed: number;
  notes: string;
};

const STAGES = [
  { key: "sourced", label: "Sourced", desc: "Profile submitted by recruiter" },
  { key: "screening", label: "Screening", desc: "Initial screen & qualification" },
  { key: "submitted", label: "Client Review", desc: "Presented to client leadership" },
  { key: "interviewing", label: "Interviewing", desc: "Active technical & team rounds" },
  { key: "offer", label: "Offer Stage", desc: "Offer negotiation & compensation" },
  { key: "placed", label: "Placed", desc: "Offer accepted & onboarded" },
];

export default function CandidateDashboardView({
  candidate,
  placements,
  interviews,
  availability,
  skills,
}: {
  candidate: Candidate;
  placements: Placement[];
  interviews: Interview[];
  availability: Availability;
  skills: Skill[];
}) {
  const [currentStatus, setCurrentStatus] = useState<string>(
    availability?.status ?? "available"
  );
  const [savingAvail, setSavingAvail] = useState(false);

  async function handleStatusChange(newStatus: string) {
    if (newStatus === currentStatus) return;
    const oldStatus = currentStatus;
    setCurrentStatus(newStatus);
    setSavingAvail(true);

    try {
      const res = await fetch("/api/availability", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        throw new Error("Failed to update availability");
      }
      pushToast(
        `Your status is now ${newStatus.toUpperCase()}. Recruiters and clients will see this immediately.`,
        "success"
      );
    } catch {
      setCurrentStatus(oldStatus);
      pushToast("Could not save availability. Please try again.", "error");
    } finally {
      setSavingAvail(false);
    }
  }

  const [nowMs] = useState(() => Date.now());
  const upcomingInterviews = interviews.filter(
    (i) => new Date(i.scheduledAt).getTime() > nowMs
  );
  const pastInterviews = interviews.filter(
    (i) => new Date(i.scheduledAt).getTime() <= nowMs
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      {/* Hero Profile Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, #ffffff 0%, #fafcfb 100%)",
          borderRadius: 16,
          border: "1px solid var(--pebble-line)",
          padding: "28px 32px",
          boxShadow: "0 4px 20px rgba(30, 40, 37, 0.04)",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 24,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <Avatar
            name={candidate.fullName}
            color={candidate.avatarColor}
            size="xxl"
          />
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <h1
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: "var(--ink)",
                  margin: 0,
                  letterSpacing: "-0.02em",
                }}
              >
                {candidate.fullName}
              </h1>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  background: "rgba(71, 156, 115, 0.12)",
                  color: "var(--jade)",
                  padding: "2px 8px",
                  borderRadius: 6,
                }}
              >
                {SENIORITY_LABEL[candidate.seniority] || candidate.seniority}
              </span>
            </div>
            <p
              style={{
                fontSize: 15,
                color: "var(--ink-muted)",
                margin: "0 0 10px 0",
                fontWeight: 500,
              }}
            >
              {candidate.headline}
            </p>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: 16,
                fontSize: 13,
                color: "var(--ink-faint)",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <IconMapPin size={14} />
                {candidate.location} ({REGION_FLAG[candidate.region]} {candidate.region.toUpperCase()})
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <IconClock size={14} />
                {candidate.timezoneOverlap}
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <IconBolt size={14} />
                <strong>${candidate.hourlyRateUsd}</strong>/hr target
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <Link
            href="/candidate/profile"
            className="btn btn-primary"
            style={{
              padding: "10px 20px",
              borderRadius: 8,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Edit Profile & Skills →
          </Link>
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 24,
        }}
      >
        {/* Left Column: Availability & Active Placements */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Availability Switcher Card */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: 14,
              border: "1px solid var(--pebble-line)",
              padding: 24,
              boxShadow: "0 2px 10px rgba(0,0,0,0.02)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 16,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <IconGlobe size={18} />
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
                  Current Availability
                </h3>
              </div>
              {savingAvail ? (
                <span style={{ fontSize: 12, color: "var(--sangria)", fontWeight: 500 }}>
                  Saving…
                </span>
              ) : (
                <span style={{ fontSize: 12, color: "var(--ink-muted)" }}>
                  Instant sync
                </span>
              )}
            </div>

            <p style={{ fontSize: 13, color: "var(--ink-muted)", marginBottom: 16 }}>
              Keep your status updated so recruiters submit you to matching high-priority engineering roles.
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 8,
              }}
            >
              {[
                { key: "available", label: "Available", desc: "Ready for interviews", color: "var(--jade)", bg: "rgba(71, 156, 115, 0.08)" },
                { key: "limited", label: "Limited", desc: "Open to part-time / 20h", color: "var(--amber)", bg: "rgba(196, 138, 58, 0.08)" },
                { key: "booked", label: "Booked", desc: "Under contract / placed", color: "#64748b", bg: "rgba(100, 116, 139, 0.08)" },
                { key: "on-leave", label: "On Leave", desc: "Taking time off", color: "var(--sangria)", bg: "rgba(122, 18, 41, 0.08)" },
              ].map((item) => {
                const isSelected = currentStatus === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => handleStatusChange(item.key)}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      padding: "12px 14px",
                      borderRadius: 10,
                      border: isSelected
                        ? `2px solid ${item.color}`
                        : "1px solid var(--pebble-line)",
                      background: isSelected ? item.bg : "#fafbfb",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6, width: "100%" }}>
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: item.color,
                        }}
                      />
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: isSelected ? 700 : 600,
                          color: isSelected ? "var(--ink)" : "var(--ink-muted)",
                        }}
                      >
                        {item.label}
                      </span>
                    </div>
                    <span style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 4 }}>
                      {item.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Placements Pipeline Stepper */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: 14,
              border: "1px solid var(--pebble-line)",
              padding: 24,
              boxShadow: "0 2px 10px rgba(0,0,0,0.02)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 20,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <IconPipeline size={18} />
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
                  Active Placements Pipeline
                </h3>
              </div>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  background: "var(--pebble-soft)",
                  padding: "3px 8px",
                  borderRadius: 6,
                  color: "var(--ink-muted)",
                }}
              >
                {placements.length} {placements.length === 1 ? "Role" : "Roles"}
              </span>
            </div>

            {placements.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "32px 16px",
                  color: "var(--ink-muted)",
                  fontSize: 14,
                  background: "var(--pebble-soft)",
                  borderRadius: 10,
                }}
              >
                No active placements currently. Your recruiter will notify you when you are submitted to open client opportunities.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                {placements.map((placement) => {
                  const currentStageIdx = STAGES.findIndex(
                    (s) => s.key === placement.status
                  );
                  const clientColor = placement.client?.logoColor || "#6366f1";

                  return (
                    <div
                      key={placement.id}
                      style={{
                        borderRadius: 12,
                        border: "1px solid var(--pebble-line)",
                        padding: 18,
                        background: "#fafcfb",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          justifyContent: "space-between",
                          gap: 12,
                          marginBottom: 16,
                        }}
                      >
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span
                              style={{
                                width: 10,
                                height: 10,
                                borderRadius: 3,
                                background: clientColor,
                                display: "inline-block",
                              }}
                            />
                            <strong style={{ fontSize: 15, color: "var(--ink)" }}>
                              {placement.clientName}
                            </strong>
                          </div>
                          <div
                            style={{
                              fontSize: 14,
                              fontWeight: 600,
                              color: "var(--sangria)",
                              marginTop: 2,
                            }}
                          >
                            {placement.roleTitle}
                          </div>
                        </div>

                        <div style={{ textAlign: "right" }}>
                          <StatusBadge kind="milestone" value={placement.status} />
                          {placement.valueUsd > 0 ? (
                            <div
                              style={{
                                fontSize: 12,
                                color: "var(--ink-muted)",
                                marginTop: 4,
                                fontWeight: 500,
                              }}
                            >
                              Est. {formatUsd(placement.valueUsd)}
                            </div>
                          ) : null}
                        </div>
                      </div>

                      {/* Interactive Horizontal Pipeline Stepper */}
                      <div style={{ marginTop: 12, marginBottom: 8 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            position: "relative",
                          }}
                        >
                          {/* Connecting Bar */}
                          <div
                            style={{
                              position: "absolute",
                              left: 12,
                              right: 12,
                              top: 10,
                              height: 3,
                              background: "var(--pebble-line)",
                              zIndex: 1,
                            }}
                          />
                          <div
                            style={{
                              position: "absolute",
                              left: 12,
                              top: 10,
                              height: 3,
                              background: "var(--jade)",
                              zIndex: 2,
                              width:
                                currentStageIdx >= 0
                                  ? `${(currentStageIdx / (STAGES.length - 1)) * 100}%`
                                  : "0%",
                              transition: "width 0.3s ease",
                            }}
                          />

                          {STAGES.map((st, idx) => {
                            const isPassed = idx <= currentStageIdx;
                            const isCurrent = idx === currentStageIdx;

                            return (
                              <div
                                key={st.key}
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  alignItems: "center",
                                  zIndex: 3,
                                  position: "relative",
                                }}
                              >
                                <div
                                  style={{
                                    width: 22,
                                    height: 22,
                                    borderRadius: "50%",
                                    background: isCurrent
                                      ? "var(--sangria)"
                                      : isPassed
                                      ? "var(--jade)"
                                      : "#ffffff",
                                    border: isCurrent
                                      ? "3px solid #ffffff"
                                      : isPassed
                                      ? "2px solid var(--jade)"
                                      : "2px solid var(--pebble-line)",
                                    boxShadow: isCurrent
                                      ? "0 0 0 2px var(--sangria)"
                                      : "none",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "#ffffff",
                                    fontSize: 10,
                                    fontWeight: 700,
                                  }}
                                >
                                  {isPassed ? "✓" : idx + 1}
                                </div>
                                <span
                                  style={{
                                    fontSize: 10,
                                    marginTop: 6,
                                    fontWeight: isCurrent ? 700 : isPassed ? 600 : 400,
                                    color: isCurrent
                                      ? "var(--sangria)"
                                      : isPassed
                                      ? "var(--ink)"
                                      : "var(--ink-faint)",
                                    textAlign: "center",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {st.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {placement.notes ? (
                        <div
                          style={{
                            marginTop: 12,
                            padding: "8px 12px",
                            background: "var(--pebble-soft)",
                            borderRadius: 8,
                            fontSize: 12,
                            color: "var(--ink-muted)",
                          }}
                        >
                          <strong>Latest Recruiter Note:</strong> {placement.notes}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Interviews & Skills */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Upcoming & Recent Interviews */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: 14,
              border: "1px solid var(--pebble-line)",
              padding: 24,
              boxShadow: "0 2px 10px rgba(0,0,0,0.02)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 20,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <IconCalendar size={18} />
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
                  Interview Schedule & Coaching
                </h3>
              </div>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--ink-muted)",
                }}
              >
                {interviews.length} Scheduled
              </span>
            </div>

            {interviews.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "32px 16px",
                  color: "var(--ink-muted)",
                  fontSize: 14,
                  background: "var(--pebble-soft)",
                  borderRadius: 10,
                }}
              >
                No upcoming interview rounds right now. Keep your skills updated and your recruiter will schedule interviews with interested teams.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {upcomingInterviews.length > 0 ? (
                  <div>
                    <span
                      style={{
                        fontSize: 11,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        color: "var(--jade)",
                        fontWeight: 700,
                        display: "block",
                        marginBottom: 8,
                      }}
                    >
                      Upcoming Rounds
                    </span>
                    {upcomingInterviews.map((it) => (
                      <div
                        key={it.id}
                        style={{
                          borderRadius: 10,
                          border: "1px solid rgba(71, 156, 115, 0.3)",
                          background: "rgba(71, 156, 115, 0.04)",
                          padding: 14,
                          marginBottom: 8,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginBottom: 4,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 700,
                              color: "var(--ink)",
                            }}
                          >
                            {INTERVIEW_TYPE_LABEL[it.type] || it.type} Interview
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              color: "var(--jade)",
                              background: "rgba(71, 156, 115, 0.12)",
                              padding: "2px 6px",
                              borderRadius: 4,
                            }}
                          >
                            {it.durationMinutes} mins
                          </span>
                        </div>
                        <div style={{ fontSize: 13, color: "var(--ink-muted)" }}>
                          📅 {formatDateTime(it.scheduledAt)}
                        </div>
                        {it.interviewer ? (
                          <div
                            style={{
                              fontSize: 12,
                              color: "var(--ink-faint)",
                              marginTop: 4,
                            }}
                          >
                            Interviewer: <strong>{it.interviewer}</strong>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}

                {pastInterviews.length > 0 ? (
                  <div>
                    <span
                      style={{
                        fontSize: 11,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        color: "var(--ink-muted)",
                        fontWeight: 700,
                        display: "block",
                        marginBottom: 8,
                        marginTop: 4,
                      }}
                    >
                      Past Rounds & Feedback
                    </span>
                    {pastInterviews.map((it) => (
                      <div
                        key={it.id}
                        style={{
                          borderRadius: 10,
                          border: "1px solid var(--pebble-line)",
                          background: "#fafbfb",
                          padding: 14,
                          marginBottom: 8,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginBottom: 4,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: "var(--ink)",
                            }}
                          >
                            {INTERVIEW_TYPE_LABEL[it.type] || it.type}
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              color:
                                it.outcome === "passed"
                                  ? "var(--jade)"
                                  : it.outcome === "failed"
                                  ? "var(--sangria)"
                                  : "var(--ink-muted)",
                            }}
                          >
                            {INTERVIEW_OUTCOME_LABEL[it.outcome] || it.outcome}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: "var(--ink-muted)" }}>
                          {formatDate(it.scheduledAt)} · {it.interviewer}
                        </div>
                        {it.feedback ? (
                          <div
                            style={{
                              marginTop: 6,
                              fontSize: 12,
                              color: "var(--ink-muted)",
                              fontStyle: "italic",
                              background: "#ffffff",
                              padding: "6px 10px",
                              borderRadius: 6,
                              border: "1px solid var(--pebble-line)",
                            }}
                          >
                            &ldquo;{it.feedback}&rdquo;
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {/* Skill Matrices Snapshot */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: 14,
              border: "1px solid var(--pebble-line)",
              padding: 24,
              boxShadow: "0 2px 10px rgba(0,0,0,0.02)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 16,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <IconStar size={18} />
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
                  Your Verified Skills
                </h3>
              </div>
              <Link
                href="/candidate/profile"
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--sangria)",
                  textDecoration: "none",
                }}
              >
                Manage Skills →
              </Link>
            </div>

            {skills.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--ink-muted)" }}>
                No skills added yet. Add your core languages and frameworks to boost matching scores!
              </p>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {skills.map((sk) => (
                  <div
                    key={sk.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      background: "var(--pebble-soft)",
                      border: "1px solid var(--pebble-line)",
                      padding: "5px 10px",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  >
                    <strong style={{ color: "var(--ink)" }}>{sk.name}</strong>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color:
                          sk.proficiency === "expert"
                            ? "var(--sangria)"
                            : sk.proficiency === "strong"
                            ? "var(--jade)"
                            : "var(--ink-muted)",
                      }}
                    >
                      {PROFICIENCY_LABEL[sk.proficiency] || sk.proficiency}
                    </span>
                    <span style={{ fontSize: 10, color: "var(--ink-faint)" }}>
                      ({sk.yearsUsed}y)
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
