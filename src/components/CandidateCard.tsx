"use client";

import Avatar from "./Avatar";
import StatusBadge from "./StatusBadge";
import FrameworkChip from "./FrameworkChip";
import { formatCurrency } from "@/lib/format";
import {
  IconMapPin,
  IconClock,
  IconDollar,
  IconCheck,
  IconX,
  IconCalendar,
  IconBriefcase,
  IconShield,
} from "./Icon";
import Link from "next/link";
import { useState } from "react";

export type CandidateCardSkill = {
  id?: number;
  name: string;
  slug?: string;
  category?: string;
  categoryColor?: string;
  proficiency?: string;
  yearsUsed?: number;
};

export type CandidateCardProps = {
  candidate: {
    id: number;
    fullName: string;
    headline: string;
    location?: string;
    region?: string;
    timezone?: string;
    timezoneOverlap?: string;
    seniority?: string;
    yearsExperience?: number;
    hourlyRateUsd?: number;
    verification?: string;
    bio?: string;
    portfolioUrl?: string | null;
    githubUrl?: string | null;
    linkedinUrl?: string | null;
    avatarColor: string;
    skills?: CandidateCardSkill[];
    availabilityStatus?: string;
  };
  placement?: {
    id: number;
    roleTitle: string;
    status: string;
    notes?: string;
  };
  mode?: "shortlist" | "recruiter";
  onAction?: (
    action: "approve" | "reject" | "request_interview",
    feedback?: string
  ) => Promise<void> | void;
  isActionLoading?: boolean;
  actionDone?: "approve" | "reject" | "request_interview" | null;
};

export default function CandidateCard({
  candidate,
  placement,
  mode = "recruiter",
  onAction,
  isActionLoading = false,
  actionDone = null,
}: CandidateCardProps) {
  const [showFeedbackModal, setShowFeedbackModal] = useState<
    "approve" | "reject" | "request_interview" | null
  >(null);
  const [feedbackText, setFeedbackText] = useState("");

  const handleActionClick = (
    act: "approve" | "reject" | "request_interview"
  ) => {
    setShowFeedbackModal(act);
    setFeedbackText("");
  };

  const handleConfirmAction = async () => {
    if (!showFeedbackModal || !onAction) return;
    const act = showFeedbackModal;
    setShowFeedbackModal(null);
    await onAction(act, feedbackText);
  };

  return (
    <div
      className="card candidate-card"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        padding: 24,
        background: "rgba(255, 255, 255, 0.92)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid rgba(228, 234, 232, 0.8)",
        boxShadow: "var(--shadow-sm)",
        transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        position: "relative",
      }}
    >
      {/* Top Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 16,
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Avatar
            name={candidate.fullName}
            color={candidate.avatarColor}
            size="lg"
          />
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <h3
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: "var(--ink)",
                  margin: 0,
                  letterSpacing: "-0.02em",
                }}
              >
                {candidate.fullName}
              </h3>
              {candidate.seniority ? (
                <StatusBadge kind="seniority" value={candidate.seniority} size="sm" />
              ) : null}
              {candidate.verification === "verified" ? (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 3,
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--jade)",
                    background: "var(--jade-soft)",
                    padding: "2px 6px",
                    borderRadius: 6,
                  }}
                  title="Vetted & Verified Talent"
                >
                  <IconShield size={11} /> Verified
                </span>
              ) : null}
              {candidate.availabilityStatus ? (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    fontSize: 11,
                    fontWeight: 600,
                    color:
                      candidate.availabilityStatus === "available"
                        ? "var(--jade-deep)"
                        : candidate.availabilityStatus === "limited"
                          ? "var(--amber)"
                          : "var(--ink-muted)",
                    background:
                      candidate.availabilityStatus === "available"
                        ? "var(--jade-soft)"
                        : candidate.availabilityStatus === "limited"
                          ? "var(--amber-soft)"
                          : "var(--pebble-soft)",
                    padding: "2px 8px",
                    borderRadius: 999,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background:
                        candidate.availabilityStatus === "available"
                          ? "var(--jade)"
                          : candidate.availabilityStatus === "limited"
                            ? "var(--amber)"
                            : "var(--ink-muted)",
                    }}
                  />
                  {candidate.availabilityStatus === "available"
                    ? "Available"
                    : candidate.availabilityStatus === "limited"
                      ? "Limited"
                      : candidate.availabilityStatus === "booked"
                        ? "Booked"
                        : "On Leave"}
                </span>
              ) : null}
            </div>
            <div
              style={{
                fontSize: 13,
                color: "var(--ink-muted)",
                marginTop: 2,
                fontWeight: 500,
              }}
            >
              {candidate.headline}
            </div>
          </div>
        </div>

        {/* Rate & Meta */}
        <div style={{ textAlign: "right" }}>
          {candidate.hourlyRateUsd ? (
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: "var(--sangria)",
                letterSpacing: "-0.02em",
              }}
            >
              ${candidate.hourlyRateUsd}
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: "var(--ink-muted)",
                }}
              >
                /hr
              </span>
            </div>
          ) : null}
          {candidate.yearsExperience ? (
            <div
              style={{
                fontSize: 11,
                color: "var(--ink-faint)",
                fontWeight: 500,
                marginTop: 2,
              }}
            >
              {candidate.yearsExperience}+ yrs exp
            </div>
          ) : null}
        </div>
      </div>

      {/* Role Placement Badge if available */}
      {placement ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            padding: "8px 12px",
            background: "var(--pebble-soft)",
            borderRadius: 8,
            fontSize: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: "var(--ink)",
              fontWeight: 600,
            }}
          >
            <IconBriefcase size={14} />
            <span>Target Role: {placement.roleTitle}</span>
          </div>
          <StatusBadge kind="milestone" value={placement.status} size="sm" />
        </div>
      ) : null}

      {/* Location / Timezone Details */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          fontSize: 12,
          color: "var(--ink-muted)",
          flexWrap: "wrap",
        }}
      >
        {candidate.location ? (
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <IconMapPin size={13} />
            <span>{candidate.location}</span>
          </div>
        ) : null}
        {candidate.timezoneOverlap ? (
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <IconClock size={13} />
            <span>{candidate.timezoneOverlap}</span>
          </div>
        ) : null}
      </div>

      {/* Bio excerpt */}
      {candidate.bio ? (
        <p
          style={{
            fontSize: 13,
            color: "var(--ink-soft)",
            lineHeight: 1.55,
            margin: 0,
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {candidate.bio}
        </p>
      ) : null}

      {/* Skill Chips */}
      {candidate.skills && candidate.skills.length > 0 ? (
        <div>
          <div
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              fontWeight: 700,
              color: "var(--ink-faint)",
              marginBottom: 6,
            }}
          >
            Core Competencies
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {candidate.skills.slice(0, 8).map((sk, idx) => (
              <FrameworkChip
                key={idx}
                name={sk.name}
                skill={{
                  name: sk.name,
                  slug: sk.slug,
                  categoryColor: sk.categoryColor,
                }}
                proficiency={sk.proficiency}
                size="sm"
              />
            ))}
            {candidate.skills.length > 8 ? (
              <span
                style={{
                  fontSize: 11,
                  padding: "3px 8px",
                  borderRadius: 999,
                  background: "var(--pebble-soft)",
                  color: "var(--ink-muted)",
                  fontWeight: 600,
                  alignSelf: "center",
                }}
              >
                +{candidate.skills.length - 8} more
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Shortlist Client Actions */}
      {mode === "shortlist" && onAction ? (
        <div
          style={{
            marginTop: "auto",
            paddingTop: 16,
            borderTop: "1px solid rgba(228, 234, 232, 0.8)",
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          {actionDone ? (
            <div
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                textAlign: "center",
                background:
                  actionDone === "approve"
                    ? "var(--jade-soft)"
                    : actionDone === "request_interview"
                      ? "var(--amber-soft)"
                      : "var(--ruby-soft)",
                color:
                  actionDone === "approve"
                    ? "var(--jade-deep)"
                    : actionDone === "request_interview"
                      ? "var(--amber)"
                      : "var(--ruby)",
              }}
            >
              {actionDone === "approve"
                ? "✓ Candidate Approved"
                : actionDone === "request_interview"
                  ? "📅 Interview Requested"
                  : "✕ Declined"}
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => handleActionClick("approve")}
                disabled={isActionLoading}
                className="btn primary sm"
                style={{
                  flex: 1,
                  background: "var(--jade)",
                  borderColor: "var(--jade)",
                }}
              >
                <IconCheck size={14} /> Approve Candidate
              </button>
              <button
                type="button"
                onClick={() => handleActionClick("request_interview")}
                disabled={isActionLoading}
                className="btn sm"
                style={{
                  flex: 1,
                  background: "#fff",
                  borderColor: "var(--amber)",
                  color: "var(--amber)",
                }}
              >
                <IconCalendar size={14} /> Request Interview
              </button>
              <button
                type="button"
                onClick={() => handleActionClick("reject")}
                disabled={isActionLoading}
                className="btn danger sm"
              >
                <IconX size={14} /> Decline
              </button>
            </>
          )}
        </div>
      ) : null}

      {/* Recruiter View Footer Link */}
      {mode === "recruiter" ? (
        <div
          style={{
            marginTop: "auto",
            paddingTop: 12,
            borderTop: "1px solid rgba(228, 234, 232, 0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Link
            href={`/candidates/${candidate.id}`}
            className="btn ghost sm"
            style={{ color: "var(--sangria)", fontWeight: 600 }}
          >
            View Full Profile →
          </Link>
        </div>
      ) : null}

      {/* Action feedback modal prompt */}
      {showFeedbackModal ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(26, 23, 22, 0.5)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 16,
          }}
          onClick={() => setShowFeedbackModal(null)}
        >
          <div
            className="card"
            style={{
              maxWidth: 440,
              width: "100%",
              padding: 24,
              background: "#fff",
              borderRadius: "var(--radius-lg)",
              boxShadow: "var(--shadow-xl)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h4
              style={{
                fontSize: 16,
                fontWeight: 700,
                margin: "0 0 8px",
                color: "var(--ink)",
              }}
            >
              {showFeedbackModal === "approve"
                ? "Approve for Offer / Placement"
                : showFeedbackModal === "request_interview"
                  ? "Request an Interview Round"
                  : "Decline Candidate"}
            </h4>
            <p
              style={{
                fontSize: 13,
                color: "var(--ink-muted)",
                margin: "0 0 16px",
                lineHeight: 1.45,
              }}
            >
              {showFeedbackModal === "approve"
                ? `Confirm your approval of ${candidate.fullName}. You can optionally include notes or proposed start timelines.`
                : showFeedbackModal === "request_interview"
                  ? `Specify preferred interview topics, dates, or interviewers for ${candidate.fullName}.`
                  : `Please share any quick feedback on why this candidate was not a fit.`}
            </p>

            <textarea
              className="search"
              style={{
                width: "100%",
                minHeight: 90,
                padding: 10,
                borderRadius: 8,
                border: "1px solid var(--pebble-deep)",
                fontSize: 13,
                fontFamily: "inherit",
                color: "var(--ink)",
                marginBottom: 16,
                resize: "vertical",
              }}
              placeholder="Optional notes or feedback..."
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
            />

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
              }}
            >
              <button
                type="button"
                className="btn ghost sm"
                onClick={() => setShowFeedbackModal(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`btn sm ${
                  showFeedbackModal === "approve"
                    ? "primary"
                    : showFeedbackModal === "reject"
                      ? "danger"
                      : "primary"
                }`}
                onClick={handleConfirmAction}
                disabled={isActionLoading}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
