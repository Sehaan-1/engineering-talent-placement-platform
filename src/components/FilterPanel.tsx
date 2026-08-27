"use client";

import { useState } from "react";
import {
  REGION_FLAG,
  REGION_LABEL,
  SENIORITY_LABEL,
  AVAILABILITY_LABEL,
  getSkillColor,
} from "@/lib/format";
import {
  IconFilter,
  IconSearch,
  IconClose,
  IconUsers,
  IconClock,
  IconDollar,
} from "@/components/Icon";

export type SkillDefinitionOption = {
  id: number;
  name: string;
  slug: string;
  categoryName: string;
  categoryColor: string;
};

export type FilterValues = {
  q: string;
  skills: string[]; // slugs
  seniority: string[];
  region: string[];
  rateMin: number | "";
  rateMax: number | "";
  availability: string;
  verification: string;
};

const REGIONS = ["us", "ca", "uk", "eu", "other"] as const;
const SENIORITIES = ["junior", "mid", "senior", "staff", "principal"] as const;
const VERIFICATIONS = ["verified", "pending", "unverified", "rejected"] as const;
const AVAILABILITIES = ["available", "limited", "booked", "on-leave"] as const;

export default function FilterPanel({
  availableSkills = [],
  values,
  onChange,
  onReset,
}: {
  availableSkills: SkillDefinitionOption[];
  values: FilterValues;
  onChange: (next: FilterValues) => void;
  onReset: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [skillSearch, setSkillSearch] = useState("");

  const activeFilterCount =
    (values.skills.length > 0 ? 1 : 0) +
    (values.seniority.length > 0 ? 1 : 0) +
    (values.region.length > 0 ? 1 : 0) +
    (values.rateMin !== "" || values.rateMax !== "" ? 1 : 0) +
    (values.availability ? 1 : 0) +
    (values.verification ? 1 : 0);

  const hasAnyFilter = activeFilterCount > 0 || !!values.q;

  function toggleSkill(slug: string) {
    const exists = values.skills.includes(slug);
    const nextSkills = exists
      ? values.skills.filter((s) => s !== slug)
      : [...values.skills, slug];
    onChange({ ...values, skills: nextSkills });
  }

  function toggleSeniority(s: string) {
    const exists = values.seniority.includes(s);
    const next = exists
      ? values.seniority.filter((item) => item !== s)
      : [...values.seniority, s];
    onChange({ ...values, seniority: next });
  }

  function toggleRegion(r: string) {
    const exists = values.region.includes(r);
    const next = exists
      ? values.region.filter((item) => item !== r)
      : [...values.region, r];
    onChange({ ...values, region: next });
  }

  const filteredSkillOptions = availableSkills.filter((s) =>
    s.name.toLowerCase().includes(skillSearch.toLowerCase()) ||
    s.categoryName.toLowerCase().includes(skillSearch.toLowerCase())
  );

  return (
    <div
      className="card"
      style={{
        marginBottom: 20,
        borderRadius: 14,
        border: "1px solid var(--pebble-deep)",
        background: "#ffffff",
        boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
        overflow: "hidden",
      }}
    >
      {/* Top Search and Quick Actions Bar */}
      <div
        style={{
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "var(--pebble-tint)",
            border: "1px solid var(--pebble-deep)",
            borderRadius: 10,
            padding: "0 12px",
            minWidth: 260,
            flex: 1,
          }}
        >
          <IconSearch size={15} className="text-muted" />
          <input
            placeholder="Search candidate name, headline, bio, location, tags..."
            value={values.q}
            onChange={(e) => onChange({ ...values, q: e.target.value })}
            style={{
              border: "none",
              outline: "none",
              font: "inherit",
              fontSize: 13,
              padding: "9px 0",
              background: "transparent",
              flex: 1,
              color: "var(--ink)",
            }}
          />
          {values.q ? (
            <button
              type="button"
              onClick={() => onChange({ ...values, q: "" })}
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                padding: 4,
                color: "var(--ink-muted)",
              }}
            >
              <IconClose size={12} />
            </button>
          ) : null}
        </div>

        {/* Quick Filters */}
        <select
          className="input sm"
          value={values.verification}
          onChange={(e) => onChange({ ...values, verification: e.target.value })}
          style={{ width: 140, height: 38 }}
        >
          <option value="">Any verification</option>
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

        <select
          className="input sm"
          value={values.availability}
          onChange={(e) => onChange({ ...values, availability: e.target.value })}
          style={{ width: 140, height: 38 }}
        >
          <option value="">Any availability</option>
          {AVAILABILITIES.map((a) => (
            <option key={a} value={a}>
              {AVAILABILITY_LABEL[a]}
            </option>
          ))}
        </select>

        <button
          type="button"
          className={`btn sm ${expanded ? "primary" : "ghost"}`}
          onClick={() => setExpanded(!expanded)}
          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <IconFilter size={13} />
          <span>Advanced filters</span>
          {activeFilterCount > 0 ? (
            <span
              style={{
                background: expanded ? "rgba(255,255,255,0.25)" : "var(--sangria)",
                color: "#fff",
                borderRadius: "50%",
                width: 18,
                height: 18,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 10,
                fontWeight: 700,
              }}
            >
              {activeFilterCount}
            </span>
          ) : null}
        </button>

        {hasAnyFilter ? (
          <button
            type="button"
            className="btn ghost sm"
            onClick={onReset}
            style={{ color: "var(--crimson)", display: "inline-flex", alignItems: "center", gap: 4 }}
          >
            <IconClose size={12} />
            Clear all
          </button>
        ) : null}
      </div>

      {/* Selected Skill Chips Pill Strip */}
      {values.skills.length > 0 ? (
        <div
          style={{
            padding: "8px 16px",
            background: "var(--pebble-light)",
            borderTop: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
            fontSize: 12,
          }}
        >
          <span style={{ fontWeight: 600, color: "var(--ink-soft)" }}>
            Active skill filters ({values.skills.length}):
          </span>
          {values.skills.map((slug) => {
            const def = availableSkills.find((s) => s.slug === slug);
            const label = def?.name ?? slug;
            const color = def?.categoryColor ?? getSkillColor(slug);
            return (
              <span
                key={slug}
                className="chip"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: "#fff",
                  border: `1px solid ${color}40`,
                  padding: "3px 8px",
                  borderRadius: 8,
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                <span
                  className="dot"
                  style={{ background: color, width: 8, height: 8 }}
                />
                {label}
                <button
                  type="button"
                  onClick={() => toggleSkill(slug)}
                  style={{
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    padding: 0,
                    marginLeft: 2,
                    display: "flex",
                    alignItems: "center",
                    color: "var(--ink-muted)",
                  }}
                >
                  <IconClose size={10} />
                </button>
              </span>
            );
          })}
          <button
            type="button"
            onClick={() => onChange({ ...values, skills: [] })}
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              fontSize: 11,
              color: "var(--ink-muted)",
              textDecoration: "underline",
            }}
          >
            Clear skills
          </button>
        </div>
      ) : null}

      {/* Expanded Multi-criteria Drawer */}
      {expanded ? (
        <div
          style={{
            padding: "16px 20px",
            borderTop: "1px solid var(--border)",
            background: "linear-gradient(to bottom, #ffffff, var(--pebble-light))",
            display: "grid",
            gap: 16,
          }}
        >
          {/* Seniority & Regions */}
          <div className="grid cols-2">
            <div>
              <label
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--ink-muted)",
                  marginBottom: 8,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <IconUsers size={13} /> Seniority Level
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {SENIORITIES.map((s) => {
                  const active = values.seniority.includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleSeniority(s)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 600,
                        border: active
                          ? "1px solid var(--sangria)"
                          : "1px solid var(--pebble-deep)",
                        background: active ? "var(--sangria-tint)" : "#fff",
                        color: active ? "var(--sangria)" : "var(--ink)",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {SENIORITY_LABEL[s]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--ink-muted)",
                  marginBottom: 8,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <IconClock size={13} /> Region / Overlap
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {REGIONS.map((r) => {
                  const active = values.region.includes(r);
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => toggleRegion(r)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 600,
                        border: active
                          ? "1px solid var(--jade)"
                          : "1px solid var(--pebble-deep)",
                        background: active ? "var(--jade-tint)" : "#fff",
                        color: active ? "var(--jade)" : "var(--ink)",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {REGION_FLAG[r]} {REGION_LABEL[r]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Rate Range */}
          <div>
            <label
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--ink-muted)",
                marginBottom: 8,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <IconDollar size={13} /> Hourly Rate Range (USD/hr)
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: 12, maxWidth: 360 }}>
              <div style={{ position: "relative", flex: 1 }}>
                <span
                  style={{
                    position: "absolute",
                    left: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--ink-muted)",
                    fontSize: 13,
                  }}
                >
                  $
                </span>
                <input
                  type="number"
                  placeholder="Min (e.g. 50)"
                  min={0}
                  className="input"
                  style={{ paddingLeft: 24 }}
                  value={values.rateMin}
                  onChange={(e) =>
                    onChange({
                      ...values,
                      rateMin: e.target.value === "" ? "" : Number(e.target.value),
                    })
                  }
                />
              </div>
              <span style={{ color: "var(--ink-muted)" }}>to</span>
              <div style={{ position: "relative", flex: 1 }}>
                <span
                  style={{
                    position: "absolute",
                    left: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--ink-muted)",
                    fontSize: 13,
                  }}
                >
                  $
                </span>
                <input
                  type="number"
                  placeholder="Max (e.g. 180)"
                  min={0}
                  className="input"
                  style={{ paddingLeft: 24 }}
                  value={values.rateMax}
                  onChange={(e) =>
                    onChange({
                      ...values,
                      rateMax: e.target.value === "" ? "" : Number(e.target.value),
                    })
                  }
                />
              </div>
            </div>
          </div>

          {/* Skill Tag Multi-Select Library */}
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <label
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--ink-muted)",
                  margin: 0,
                }}
              >
                Filter by Skills ({availableSkills.length} available)
              </label>
              <input
                placeholder="Filter skill list..."
                value={skillSearch}
                onChange={(e) => setSkillSearch(e.target.value)}
                style={{
                  padding: "4px 8px",
                  fontSize: 11,
                  borderRadius: 6,
                  border: "1px solid var(--border)",
                  outline: "none",
                  width: 160,
                }}
              />
            </div>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
                maxHeight: 140,
                overflowY: "auto",
                padding: "8px",
                background: "#fff",
                borderRadius: 10,
                border: "1px solid var(--border)",
              }}
            >
              {filteredSkillOptions.map((s) => {
                const active = values.skills.includes(s.slug);
                return (
                  <button
                    key={s.slug}
                    type="button"
                    onClick={() => toggleSkill(s.slug)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "4px 10px",
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 500,
                      border: active
                        ? `1px solid ${s.categoryColor}`
                        : "1px solid var(--pebble-deep)",
                      background: active ? `${s.categoryColor}15` : "#fff",
                      color: active ? s.categoryColor : "var(--ink)",
                      cursor: "pointer",
                    }}
                  >
                    <span
                      className="dot"
                      style={{
                        background: s.categoryColor,
                        width: 7,
                        height: 7,
                      }}
                    />
                    <span>{s.name}</span>
                  </button>
                );
              })}
              {filteredSkillOptions.length === 0 ? (
                <div style={{ fontSize: 12, color: "var(--ink-muted)", padding: "6px" }}>
                  No skills matching &quot;{skillSearch}&quot;
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
