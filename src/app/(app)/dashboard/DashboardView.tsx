"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  formatDateTime,
  formatUsd,
  formatUsdExact,
  MILESTONE_LABEL,
  MILESTONE_COLOR,
  MILESTONE_ORDER,
  INTERVIEW_TYPE_LABEL,
  formatRelative,
  relTier,
  REGION_FLAG,
  REGION_LABEL,
} from "@/lib/format";
import Avatar from "@/components/Avatar";
import StatusBadge from "@/components/StatusBadge";
import Sparkline from "@/components/Sparkline";
import {
  IconArrowRight,
  IconArrowUpRight,
  IconBriefcase,
  IconCalendar,
  IconCheck,
  IconClock,
  IconDollar,
  IconStar,
  IconTrendUp,
  IconUsers,
} from "@/components/Icon";

type Stats = {
  candidates: number;
  available: number;
  interviewing: number;
  offers: number;
  placed: number;
  pipelineValue: number;
  placedValue: number;
  passRate: number;
};

type Interview = {
  id: number;
  scheduledAt: string;
  type: string;
  outcome: string;
  candidate: { id: number; fullName: string; avatarColor: string };
};

type RecentCandidate = {
  id: number;
  fullName: string;
  headline: string;
  avatarColor: string;
  seniority: string;
  region: string;
  verification: string;
};

type TopPerformer = {
  name: string;
  avatarColor?: string;
  placements: number;
};

type SkillMixItem = {
  name: string;
  slug: string;
  categoryName: string;
  categoryColor: string;
  count: number;
};

type CategoryMixItem = {
  name: string;
  slug: string;
  color: string;
  count: number;
};

export default function DashboardView({
  userName,
  topPerformer,
  stats,
  upcomingInterviews,
  skillsByFramework,
  skillMix = [],
  categoryMix = [],
  placementsByStatus,
  recentCandidates,
  sparklines,
}: {
  userName: string;
  topPerformer?: TopPerformer | null;
  stats: Stats;
  upcomingInterviews: Interview[];
  skillsByFramework: Record<string, number>;
  skillMix?: SkillMixItem[];
  categoryMix?: CategoryMixItem[];
  placementsByStatus: Record<string, { count: number; value: number }>;
  recentCandidates: RecentCandidate[];
  sparklines: {
    candidates: number[];
    pipeline: number[];
    interviewing: number[];
    available: number[];
  };
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const totalSkills = skillMix.length > 0
    ? skillMix.reduce((a, b) => a + b.count, 0)
    : Object.values(skillsByFramework).reduce((a, b) => a + b, 0);
  const maxSkill = Math.max(
    1,
    ...(skillMix.length > 0
      ? skillMix.map((s) => s.count)
      : Object.values(skillsByFramework))
  );

  return (
    <main className="content fade-in">
      <header className="page-header">
        <div className="meta">
          <h1>Welcome back, {userName}</h1>
          <p>
            You have <strong>{stats.available}</strong> candidates available,
            <strong> {stats.interviewing}</strong> active interview loops, and
            <strong> {formatUsdExact(stats.pipelineValue)}</strong> in open
            pipeline.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/candidates" className="btn">
            Browse network
          </Link>
          <Link href="/candidates?new=1" className="btn primary">
            <IconUsers size={14} />
            Add candidate
          </Link>
        </div>
      </header>

      <section className="grid cols-4">
        <KpiCard
          icon={<IconUsers size={18} />}
          label="Candidates in network"
          value={stats.candidates.toString()}
          data={sparklines.candidates}
          color="#7a1229"
          foot={
            <>
              <span className="pill">
                <IconTrendUp size={11} /> 12%
              </span>
              <span>vs last month</span>
            </>
          }
        />
        <KpiCard
          icon={<IconClock size={18} />}
          label="Available now"
          value={stats.available.toString()}
          data={sparklines.available}
          color="#479c73"
          variant="jade"
          foot={
            <>
              <span className="pill">ready to submit</span>
              <span>this week</span>
            </>
          }
        />
        <KpiCard
          icon={<IconBriefcase size={18} />}
          label="In interview loop"
          value={stats.interviewing.toString()}
          data={sparklines.interviewing}
          color="#c48a3a"
          variant="amber"
          foot={
            <>
              <span className="pill warn">{stats.offers} offers</span>
              <span>pending</span>
            </>
          }
        />
        <KpiCard
          icon={<IconDollar size={18} />}
          label="Open pipeline"
          value={formatUsd(stats.pipelineValue)}
          data={sparklines.pipeline}
          color="#5a8db0"
          variant="slate"
          foot={
            <>
              <span className="pill">
                {formatUsd(stats.placedValue)} placed
              </span>
              <span>to date</span>
            </>
          }
        />
      </section>

      <section className="grid" style={{ gridTemplateColumns: "minmax(0, 1.65fr) minmax(0, 1fr)" }}>
        <div className="card card-pad">
          <div className="section-title">
            <h2>Placement pipeline</h2>
            <Link href="/placements" className="meta">
              View all
            </Link>
          </div>
          <div className="pipeline">
            {MILESTONE_ORDER.map((s) => {
              const data = placementsByStatus[s] ?? { count: 0, value: 0 };
              return (
                <Link
                  href={`/placements?status=${s}`}
                  className="col"
                  key={s}
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <div className="head">
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <span
                        className="dot"
                        style={{ background: MILESTONE_COLOR[s] }}
                      />
                      {MILESTONE_LABEL[s]}
                    </span>
                    <span className="count">{data.count}</span>
                  </div>
                  <div className="value">{formatUsd(data.value)}</div>
                </Link>
              );
            })}
          </div>

          <div className="divider" />
          <div className="section-title">
            <h2>Upcoming interviews</h2>
            <Link href="/interviews" className="meta">
              All interviews
            </Link>
          </div>
          {upcomingInterviews.length === 0 ? (
            <div
              style={{
                padding: "24px 0",
                color: "var(--ink-muted)",
                fontSize: 13,
                textAlign: "center",
              }}
            >
              No upcoming interviews scheduled.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {upcomingInterviews.map((iv) => {
                const at = new Date(iv.scheduledAt).getTime();
                const diff = at - now;
                const minutes = Math.round(diff / 60000);
                const rel =
                  minutes < 0
                    ? "now"
                    : minutes < 60
                      ? `in ${minutes}m`
                      : minutes < 60 * 24
                        ? `in ${Math.round(minutes / 60)}h`
                        : `in ${Math.round(minutes / (60 * 24))}d`;
                const tier = relTier(iv.scheduledAt);
                return (
                  <Link
                    key={iv.id}
                    href="/interviews"
                    className="list-row"
                    style={{
                      textDecoration: "none",
                      color: "inherit",
                      borderRadius: 10,
                      padding: "12px 14px",
                    }}
                  >
                    <Avatar
                      name={iv.candidate.fullName}
                      color={iv.candidate.avatarColor}
                      size="sm"
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>
                        {iv.candidate.fullName}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--ink-muted)",
                          marginTop: 2,
                        }}
                      >
                        {INTERVIEW_TYPE_LABEL[iv.type] ?? iv.type} ·{" "}
                        {formatDateTime(iv.scheduledAt)}
                      </div>
                    </div>
                    <span
                      className={`rel-pill ${
                        tier === "urgent"
                          ? "urgent"
                          : tier === "soon"
                            ? "soon"
                            : "jade"
                      }`}
                    >
                      {rel}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div
          className="card card-pad"
          style={{
            background:
              "linear-gradient(160deg, #fff 0%, var(--jade-tint) 100%)",
          }}
        >
          <div className="section-title">
            <h2>Top skills in network</h2>
            <Link href="/skills" className="meta">
              View matrix
            </Link>
          </div>
          <div
            style={{
              fontSize: 13,
              color: "var(--ink-soft)",
              marginBottom: 14,
            }}
          >
            {totalSkills} tracked skills across {skillMix.length > 0 ? skillMix.length : categoryMix.length} technologies
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {(skillMix.length > 0
              ? skillMix
              : categoryMix.map((c) => ({
                  name: c.name,
                  slug: c.slug,
                  categoryName: "Category",
                  categoryColor: c.color,
                  count: c.count,
                }))
            ).slice(0, 7).map((s) => {
              const count = s.count;
              const pct = maxSkill === 0 ? 0 : (count / maxSkill) * 100;
              return (
                <div key={s.slug}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: 12,
                      color: "var(--ink-soft)",
                      marginBottom: 6,
                    }}
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        fontWeight: 600,
                      }}
                    >
                      <span
                        className="dot"
                        style={{ background: s.categoryColor }}
                      />
                      {s.name}
                      <span
                        style={{
                          fontSize: 10,
                          color: "var(--ink-muted)",
                          fontWeight: 500,
                        }}
                      >
                        ({s.categoryName})
                      </span>
                    </span>
                    <span
                      style={{
                        fontWeight: 700,
                        color: "var(--ink)",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {count}
                    </span>
                  </div>
                  <div className="skill-bar">
                    <span
                      style={{
                        width: `${pct}%`,
                        background: s.categoryColor,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section
        className="grid"
        style={{ gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)" }}
      >
        <div className="card">
          <div className="card-pad" style={{ paddingBottom: 0 }}>
            <div className="section-title">
              <h2>Recent candidates</h2>
              <Link href="/candidates" className="meta">
                View all
              </Link>
            </div>
          </div>
          <div className="table-wrap" style={{ border: "none", borderRadius: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Region</th>
                  <th>Seniority</th>
                  <th>Verification</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {recentCandidates.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div
                        style={{
                          display: "flex",
                          gap: 12,
                          alignItems: "center",
                        }}
                      >
                        <Avatar
                          name={c.fullName}
                          color={c.avatarColor}
                          size="sm"
                        />
                        <div>
                          <div style={{ fontWeight: 600 }}>{c.fullName}</div>
                          <div
                            style={{
                              fontSize: 12,
                              color: "var(--ink-muted)",
                            }}
                          >
                            {c.headline}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <span>{REGION_FLAG[c.region]}</span>
                        {REGION_LABEL[c.region]}
                      </div>
                    </td>
                    <td>
                      <StatusBadge kind="seniority" value={c.seniority} />
                    </td>
                    <td>
                      <StatusBadge kind="verification" value={c.verification} />
                    </td>
                    <td>
                      <Link
                        href={`/candidates/${c.id}`}
                        className="btn ghost sm"
                      >
                        Open
                        <IconArrowUpRight size={12} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card card-pad">
          <div className="section-title">
            <h2>Performance</h2>
            <span className="meta">30d</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <PerformanceRow
              label="Interview pass rate"
              value={`${stats.passRate}%`}
              progress={stats.passRate}
              color="#479c73"
            />
            <PerformanceRow
              label="Time to placement"
              value="18d"
              progress={72}
              color="#5a8db0"
              suffix="avg"
            />
            <PerformanceRow
              label="Client NPS"
              value="+62"
              progress={86}
              color="#c48a3a"
            />
            <PerformanceRow
              label="Offer acceptance"
              value="84%"
              progress={84}
              color="#7a1229"
            />
          </div>

          <div className="divider" />

          {topPerformer ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "12px 14px",
                borderRadius: 12,
                background: "var(--sangria-tint)",
                border: "1px solid rgba(122, 18, 41, 0.12)",
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  background: topPerformer.avatarColor || "var(--sangria)",
                  color: "#fff",
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                }}
              >
                <IconStar size={16} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                  Top performer: {topPerformer.name}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--ink-muted)",
                  }}
                >
                  {topPerformer.placements} placement{topPerformer.placements === 1 ? "" : "s"} completed
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "12px 14px",
                borderRadius: 12,
                background: "rgba(0, 0, 0, 0.02)",
                border: "1px dashed var(--border)",
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  background: "var(--border)",
                  color: "var(--ink-muted)",
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                }}
              >
                <IconStar size={16} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-muted)" }}>
                  No placements yet
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--ink-muted)",
                  }}
                >
                  Place candidates to see top performers highlighted here
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function KpiCard({
  icon,
  label,
  value,
  data,
  color,
  variant,
  foot,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  data: number[];
  color: string;
  variant?: "jade" | "amber" | "slate";
  foot: React.ReactNode;
}) {
  return (
    <div className={`kpi ${variant ?? ""}`}>
      <div className="head">
        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "var(--ink-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            {label}
          </div>
          <div className="value" style={{ marginTop: 8 }}>
            {value}
          </div>
        </div>
        <div className="icon">{icon}</div>
      </div>
      <Sparkline data={data} color={color} width={260} height={42} />
      <div className="foot">{foot}</div>
    </div>
  );
}

function PerformanceRow({
  label,
  value,
  progress,
  color,
  suffix,
}: {
  label: string;
  value: string;
  progress: number;
  color: string;
  suffix?: string;
}) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 6,
        }}
      >
        <span
          style={{
            fontSize: 12,
            color: "var(--ink-soft)",
            fontWeight: 600,
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "var(--ink)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {value}
          {suffix ? (
            <span
              style={{
                fontSize: 10,
                color: "var(--ink-muted)",
                fontWeight: 500,
                marginLeft: 3,
              }}
            >
              {suffix}
            </span>
          ) : null}
        </span>
      </div>
      <div className="skill-bar">
        <span
          style={{
            width: `${Math.min(100, progress)}%`,
            background: color,
          }}
        />
      </div>
    </div>
  );
}
