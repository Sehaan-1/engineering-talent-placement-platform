"use client";

import { useState } from "react";
import {
  REGION_CODE,
  REGION_LABEL,
  SENIORITY_LABEL,
  AVAILABILITY_LABEL,
  getSkillColor,
  harmonizeColor,
} from "@/lib/format";
import {
  IconSliders,
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
  skills: string[];
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
  const [scrollEdges, setScrollEdges] = useState<{ top: boolean; bottom: boolean }>({
    top: false,
    bottom: availableSkills.length > 18,
  });

  function updateScrollEdges(el: HTMLDivElement | null) {
    if (!el) return;
    const top = el.scrollTop > 2;
    const bottom = el.scrollHeight - el.scrollTop - el.clientHeight > 2;
    setScrollEdges((prev) =>
      prev.top === top && prev.bottom === bottom ? prev : { top, bottom }
    );
  }

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

  const filteredSkillOptions = availableSkills.filter(
    (s) =>
      s.name.toLowerCase().includes(skillSearch.toLowerCase()) ||
      s.categoryName.toLowerCase().includes(skillSearch.toLowerCase())
  );

  return (
    <div
      className="card"
      style={{
        borderRadius: 14,
        border: "1px solid var(--pebble-line)",
        background: "var(--surface)",
        overflow: "hidden",
      }}
    >
      {/* Search and quick filters */}
      <div
        style={{
          padding: "12px 14px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <div
          className="search-field"
          style={{ minWidth: "min(240px, 100%)" }}
        >
          <IconSearch size={15} className="text-muted" />
          <input
            placeholder="Search by name, headline, location, or tag…"
            value={values.q}
            onChange={(e) => onChange({ ...values, q: e.target.value })}
          />
          {values.q ? (
            <button
              type="button"
              onClick={() => onChange({ ...values, q: "" })}
              aria-label="Clear search query"
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                padding: 4,
                display: "inline-flex",
                alignItems: "center",
                color: "var(--ink-muted)",
              }}
            >
              <IconClose size={13} />
            </button>
          ) : null}
        </div>

        <select
          className="input"
          aria-label="Filter by verification status"
          value={values.verification}
          onChange={(e) => onChange({ ...values, verification: e.target.value })}
          style={{ minWidth: 152 }}
        >
          <option value="">All verification</option>
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
          className="input"
          aria-label="Filter by availability"
          value={values.availability}
          onChange={(e) => onChange({ ...values, availability: e.target.value })}
          style={{ minWidth: 150 }}
        >
          <option value="">All availability</option>
          {AVAILABILITIES.map((a) => (
            <option key={a} value={a}>
              {AVAILABILITY_LABEL[a]}
            </option>
          ))}
        </select>

        <button
          type="button"
          className={`btn ${expanded ? "primary" : ""}`}
          aria-expanded={expanded}
          onClick={() => setExpanded((prev) => !prev)}
        >
          <IconSliders size={14} />
          <span>Filters</span>
          {activeFilterCount > 0 ? (
            <span
              style={{
                background: expanded
                  ? "rgba(255, 255, 255, 0.22)"
                  : "var(--sangria-tint)",
                color: expanded ? "#fff" : "var(--sangria)",
                borderRadius: 999,
                minWidth: 18,
                height: 18,
                padding: "0 5px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontWeight: 600,
                fontVariantNumeric: "tabular-nums",
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
            style={{ color: "var(--ruby)" }}
          >
            <IconClose size={13} />
            <span>Reset</span>
          </button>
        ) : null}
      </div>

      {/* Selected skill chips */}
      {values.skills.length > 0 ? (
        <div
          style={{
            padding: "8px 14px",
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
            Skills ({values.skills.length}):
          </span>
          {values.skills.map((slug) => {
            const def = availableSkills.find((s) => s.slug === slug);
            const label = def?.name ?? slug;
            const color = getSkillColor(slug, def?.categoryColor);
            return (
              <span key={slug} className="chip">
                <span className="swatch" style={{ background: color }} />
                <span>{label}</span>
                <button
                  type="button"
                  onClick={() => toggleSkill(slug)}
                  aria-label={`Remove ${label} filter`}
                  style={{
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    padding: 2,
                    display: "inline-flex",
                    alignItems: "center",
                    color: "var(--ink-muted)",
                  }}
                >
                  <IconClose size={11} />
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
              fontSize: 12,
              fontWeight: 500,
              color: "var(--ink-muted)",
              textDecoration: "underline",
            }}
          >
            Clear skills
          </button>
        </div>
      ) : null}

      {/* Coordinated collapsible multi-criteria drawer */}
      <div
        className="collapse-shell"
        data-open={expanded ? "true" : "false"}
        aria-hidden={!expanded}
      >
        <div className="collapse-inner">
          <div
            style={{
              padding: "16px 18px",
              borderTop: "1px solid var(--border)",
              background: "var(--pebble-tint)",
              display: "grid",
              gap: 16,
            }}
          >
            <div className="grid cols-2">
              <div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--ink-soft)",
                    marginBottom: 8,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <IconUsers size={14} className="text-muted" />
                  <span>Seniority level</span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {SENIORITIES.map((s) => {
                    const active = values.seniority.includes(s);
                    return (
                      <button
                        key={s}
                        type="button"
                        tabIndex={expanded ? 0 : -1}
                        onClick={() => toggleSeniority(s)}
                        className="btn sm"
                        style={
                          active
                            ? {
                                borderColor: "var(--sangria)",
                                background: "var(--sangria-tint)",
                                color: "var(--sangria)",
                              }
                            : undefined
                        }
                      >
                        {SENIORITY_LABEL[s]}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--ink-soft)",
                    marginBottom: 8,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <IconClock size={14} className="text-muted" />
                  <span>Region &amp; overlap</span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {REGIONS.map((r) => {
                    const active = values.region.includes(r);
                    return (
                      <button
                        key={r}
                        type="button"
                        tabIndex={expanded ? 0 : -1}
                        onClick={() => toggleRegion(r)}
                        className="btn sm"
                        style={
                          active
                            ? {
                                borderColor: "var(--jade)",
                                background: "var(--jade-tint)",
                                color: "var(--jade-deep)",
                              }
                            : undefined
                        }
                      >
                        <span style={{ color: "var(--ink-muted)", fontWeight: 500 }}>
                          {REGION_CODE[r]}
                        </span>
                        <span>{REGION_LABEL[r]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--ink-soft)",
                  marginBottom: 8,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <IconDollar size={14} className="text-muted" />
                <span>Hourly rate range (USD/hr)</span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  maxWidth: 360,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ position: "relative", flex: "1 1 120px" }}>
                  <span
                    style={{
                      position: "absolute",
                      left: 10,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--ink-muted)",
                      fontSize: 13,
                      pointerEvents: "none",
                    }}
                  >
                    $
                  </span>
                  <input
                    type="number"
                    placeholder="Min (50)"
                    min={0}
                    tabIndex={expanded ? 0 : -1}
                    className="input"
                    style={{ paddingLeft: 24, width: "100%" }}
                    value={values.rateMin}
                    onChange={(e) =>
                      onChange({
                        ...values,
                        rateMin:
                          e.target.value === "" ? "" : Number(e.target.value),
                      })
                    }
                  />
                </div>
                <span style={{ fontSize: 12.5, color: "var(--ink-muted)" }}>
                  to
                </span>
                <div style={{ position: "relative", flex: "1 1 120px" }}>
                  <span
                    style={{
                      position: "absolute",
                      left: 10,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--ink-muted)",
                      fontSize: 13,
                      pointerEvents: "none",
                    }}
                  >
                    $
                  </span>
                  <input
                    type="number"
                    placeholder="Max (180)"
                    min={0}
                    tabIndex={expanded ? 0 : -1}
                    className="input"
                    style={{ paddingLeft: 24, width: "100%" }}
                    value={values.rateMax}
                    onChange={(e) =>
                      onChange({
                        ...values,
                        rateMax:
                          e.target.value === "" ? "" : Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
            </div>

            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 10,
                  flexWrap: "wrap",
                  marginBottom: 8,
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--ink-soft)",
                  }}
                >
                  Skills ({availableSkills.length} tracked)
                </span>
                <input
                  placeholder="Find skill…"
                  tabIndex={expanded ? 0 : -1}
                  value={skillSearch}
                  onChange={(e) => setSkillSearch(e.target.value)}
                  className="input sm"
                  style={{ width: 170 }}
                />
              </div>

              <div
                style={{
                  background: "var(--surface)",
                  borderRadius: 10,
                  border: "1px solid var(--border)",
                  padding: "2px 0",
                }}
              >
                <div
                  className="scroll-fade-y"
                  data-more-top={scrollEdges.top ? "true" : undefined}
                  data-more-bottom={
                    scrollEdges.bottom && filteredSkillOptions.length > 14
                      ? "true"
                      : undefined
                  }
                  onScroll={(e) => updateScrollEdges(e.currentTarget)}
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                    maxHeight: 152,
                    overflowY: "auto",
                    padding: "8px 10px",
                  }}
                >
                {filteredSkillOptions.map((s) => {
                  const active = values.skills.includes(s.slug);
                  const swatch = harmonizeColor(s.categoryColor, s.slug);
                  return (
                    <button
                      key={s.slug}
                      type="button"
                      tabIndex={expanded ? 0 : -1}
                      onClick={() => toggleSkill(s.slug)}
                      className="btn sm"
                      style={
                        active
                          ? {
                              borderColor: swatch,
                              background: "var(--pebble-light)",
                              color: "var(--ink)",
                            }
                          : undefined
                      }
                    >
                      <span
                        className="dot"
                        style={{ background: swatch, width: 6, height: 6 }}
                      />
                      <span>{s.name}</span>
                    </button>
                  );
                })}
                {filteredSkillOptions.length === 0 ? (
                  <div
                    style={{
                      fontSize: 12.5,
                      color: "var(--ink-muted)",
                      padding: 6,
                    }}
                  >
                    No skills matching &ldquo;{skillSearch}&rdquo;
                  </div>
                ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
