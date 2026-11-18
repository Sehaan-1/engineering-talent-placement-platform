"use client";

import { useState } from "react";
import CandidateCard, { type CandidateCardProps } from "@/components/CandidateCard";
import StatusBadge from "@/components/StatusBadge";
import FrameworkChip from "@/components/FrameworkChip";
import { formatTimeAgo, formatCurrency } from "@/lib/format";
import {
  IconBuilding,
  IconBriefcase,
  IconCheck,
  IconClock,
  IconCalendar,
  IconMapPin,
  IconShield,
  IconGlobe,
  IconMail,
  IconUser,
} from "@/components/Icon";

type ShortlistData = {
  shortlist: {
    id: number;
    sharedAt: string;
    expiresAt: string;
  };
  client: {
    id: number;
    name: string;
    website?: string | null;
    industry?: string | null;
    contactName: string;
    logoColor: string;
  };
  placement: {
    id: number;
    roleTitle: string;
    status: string;
    startDate?: string | null;
    notes?: string;
  };
  candidate: CandidateCardProps["candidate"];
};

export default function ShortlistView({
  token,
  initialData,
}: {
  token: string;
  initialData: ShortlistData;
}) {
  const [data, setData] = useState<ShortlistData>(initialData);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [actionDone, setActionDone] = useState<
    "approve" | "reject" | "request_interview" | null
  >(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleCandidateAction = async (
    action: "approve" | "reject" | "request_interview",
    feedback?: string
  ) => {
    setIsActionLoading(true);
    try {
      const res = await fetch(`/api/shortlists/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, feedback }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to submit decision");
      }

      const result = await res.json();
      setActionDone(action);
      setData((prev) => ({
        ...prev,
        placement: {
          ...prev.placement,
          status: result.placement.status,
          notes: result.placement.notes,
        },
      }));

      if (action === "approve") {
        setStatusMessage(
          "✓ Candidate Approved! Your talent partner has been notified to proceed with offer preparations."
        );
      } else if (action === "request_interview") {
        setStatusMessage(
          "📅 Interview Requested! We will coordinate times and calendar invites shortly."
        );
      } else {
        setStatusMessage(
          "Feedback recorded. We will update your candidate recommendations."
        );
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error submitting decision");
    } finally {
      setIsActionLoading(false);
    }
  };

  const [nowMs] = useState(() => Date.now());
  const daysLeft = Math.max(
    0,
    Math.ceil(
      (new Date(data.shortlist.expiresAt).getTime() - nowMs) /
        (1000 * 60 * 60 * 24)
    )
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Client & Role Header Banner */}
      <div
        className="card card-pad"
        style={{
          background: "linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(245, 248, 247, 0.9))",
          border: `1px solid rgba(228, 234, 232, 0.9)`,
          borderLeft: `5px solid ${data.client.logoColor || "var(--sangria)"}`,
          boxShadow: "var(--shadow-md)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 12,
                color: "var(--ink-muted)",
                marginBottom: 4,
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: data.client.logoColor || "var(--sangria)",
                }}
              />
              <span style={{ fontWeight: 700, color: "var(--ink)" }}>
                {data.client.name}
              </span>
              {data.client.industry ? (
                <>
                  <span>·</span>
                  <span>{data.client.industry}</span>
                </>
              ) : null}
            </div>

            <h1
              style={{
                fontSize: 26,
                fontWeight: 800,
                color: "var(--ink)",
                margin: "0 0 6px",
                letterSpacing: "-0.025em",
              }}
            >
              Candidate Shortlist: {data.placement.roleTitle}
            </h1>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                fontSize: 13,
                color: "var(--ink-soft)",
                flexWrap: "wrap",
              }}
            >
              <span>
                Shared for review with <strong>{data.client.contactName}</strong>
              </span>
              <span>·</span>
              <span style={{ color: "var(--ink-muted)" }}>
                Expires in {daysLeft} days
              </span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 8,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, color: "var(--ink-muted)" }}>
                Pipeline Stage:
              </span>
              <StatusBadge kind="milestone" value={data.placement.status} />
            </div>
            {data.placement.startDate ? (
              <div
                style={{
                  fontSize: 11,
                  color: "var(--jade-deep)",
                  background: "var(--jade-soft)",
                  padding: "3px 8px",
                  borderRadius: 6,
                  fontWeight: 600,
                }}
              >
                Target Start:{" "}
                {new Date(data.placement.startDate).toLocaleDateString()}
              </div>
            ) : null}
          </div>
        </div>

        {/* Optional Role description / note */}
        {data.placement.notes ? (
          <div
            style={{
              marginTop: 16,
              paddingTop: 16,
              borderTop: "1px solid rgba(228, 234, 232, 0.7)",
              fontSize: 13,
              color: "var(--ink-soft)",
              lineHeight: 1.5,
              background: "rgba(255, 255, 255, 0.5)",
              padding: 12,
              borderRadius: 8,
            }}
          >
            <strong>Position Context & Notes:</strong>
            <p style={{ margin: "4px 0 0", whiteSpace: "pre-line" }}>
              {data.placement.notes}
            </p>
          </div>
        ) : null}
      </div>

      {/* Decision status alert */}
      {statusMessage ? (
        <div
          style={{
            padding: "14px 18px",
            borderRadius: "var(--radius-md)",
            background: "var(--jade-soft)",
            border: "1px solid var(--jade)",
            color: "var(--jade-deep)",
            fontSize: 14,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <IconCheck size={18} />
          <span>{statusMessage}</span>
        </div>
      ) : null}

      {/* Candidate Card Showcase */}
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <h2
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "var(--ink)",
              margin: 0,
            }}
          >
            Recommended Engineer
          </h2>
          <span style={{ fontSize: 12, color: "var(--ink-muted)" }}>
            Review qualifications and submit your feedback below
          </span>
        </div>

        <CandidateCard
          candidate={data.candidate}
          placement={data.placement}
          mode="shortlist"
          onAction={handleCandidateAction}
          isActionLoading={isActionLoading}
          actionDone={actionDone}
        />
      </div>

      {/* Full Skill Matrix & Deep Competency Breakdown */}
      {data.candidate.skills && data.candidate.skills.length > 0 ? (
        <div className="card card-pad">
          <div className="section-title">
            <h2>Detailed Technical Proficiency</h2>
            <span className="meta">Verified Assessments</span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: 12,
            }}
          >
            {data.candidate.skills.map((sk, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  background: "var(--pebble-soft)",
                  borderRadius: 10,
                  fontSize: 13,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: sk.categoryColor || "var(--sangria)",
                    }}
                  />
                  <strong style={{ color: "var(--ink)" }}>{sk.name}</strong>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {sk.yearsUsed ? (
                    <span
                      style={{
                        fontSize: 11,
                        color: "var(--ink-faint)",
                      }}
                    >
                      {sk.yearsUsed} yr{sk.yearsUsed > 1 ? "s" : ""}
                    </span>
                  ) : null}
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: "capitalize",
                      padding: "2px 6px",
                      borderRadius: 4,
                      background:
                        sk.proficiency === "expert"
                          ? "var(--jade-soft)"
                          : sk.proficiency === "strong"
                            ? "var(--slate-soft)"
                            : "var(--pebble-deep)",
                      color:
                        sk.proficiency === "expert"
                          ? "var(--jade-deep)"
                          : sk.proficiency === "strong"
                            ? "var(--slate)"
                            : "var(--ink)",
                    }}
                  >
                    {sk.proficiency}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Recruiter Contact Footer Banner */}
      <div
        className="card card-pad"
        style={{
          background: "var(--pebble-soft)",
          border: "1px solid var(--pebble-deep)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h4
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: "var(--ink)",
              margin: "0 0 4px",
            }}
          >
            Questions regarding this candidate?
          </h4>
          <p
            style={{
              fontSize: 13,
              color: "var(--ink-muted)",
              margin: 0,
            }}
          >
            Your dedicated talent partner is on standby to schedule interviews,
            provide work samples, or adjust role parameters.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            className="btn primary sm"
            onClick={() => handleCandidateAction("request_interview")}
            disabled={isActionLoading || actionDone !== null}
          >
            <IconCalendar size={14} /> Schedule Direct Interview
          </button>
        </div>
      </div>
    </div>
  );
}
