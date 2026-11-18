"use client";

import React from "react";
import { Stage, Window, Bar, Text, type Act, type Layout } from "./stageshow";
import "./hireloop-hero.css";

interface HeroSceneState {
  query: string;
  matchScore: number;
  highlightAlex: boolean;
  shortlisted: boolean;
  satelliteVisible: boolean;
  statusLabel: string;
}

const INITIAL_STATE: HeroSceneState = {
  query: "",
  matchScore: 89,
  highlightAlex: false,
  shortlisted: false,
  satelliteVisible: false,
  statusLabel: "Available",
};

const POSTER_STATE: HeroSceneState = {
  query: "React + TypeScript",
  matchScore: 98,
  highlightAlex: true,
  shortlisted: true,
  satelliteVisible: true,
  statusLabel: "Shortlisted",
};

async function heroScript(a: Act<HeroSceneState>) {
  // Beat 0: rest a moment at start of loop
  await a.wait(700);

  // Beat 1: Move cursor towards search filter
  await a.move("search-filter");
  await a.wait(300);

  // Beat 2: Click and type skill requirements
  await a.click("search-filter");
  await a.set({ query: "React" });
  await a.wait(200);
  await a.set({ query: "React + TS" });
  await a.wait(350);

  // Beat 3: AI Matching calculates high match score for Alex Chen
  await a.set({
    query: "React + TypeScript",
    matchScore: 98,
    highlightAlex: true,
    statusLabel: "Top Match",
  });
  await a.wait(500);

  // Beat 4: Move to "Add Shortlist" button and click
  await a.move("shortlist-btn");
  await a.wait(350);
  await a.click("shortlist-btn");

  // Beat 5: Shortlist satellite popover emerges with client confirmation
  await a.set({
    shortlisted: true,
    satelliteVisible: true,
    statusLabel: "Shortlisted",
  });

  // Hold payoff so viewer absorbs the value
  await a.wait(3800);

  // Return cursor to start point so the loop seam is perfectly seamless
  await a.move("search-filter");
  await a.wait(300);

  // Clean, seamless reset back to initial
  await a.set({
    satelliteVisible: false,
    shortlisted: false,
    highlightAlex: false,
    query: "",
    matchScore: 89,
    statusLabel: "Available",
  });
  await a.wait(400);
}

export default function HireloopStageshowHero() {
  return (
    <div className="hl-hero-stage">
      <Stage<HeroSceneState>
        width={640}
        height={360}
        initial={INITIAL_STATE}
        poster={POSTER_STATE}
        script={heroScript}
        cursor={{
          at: "search-filter",
          style: "real",
          idle: 3000,
          ripple: true,
        }}
        compact={{ below: 560, width: 358, height: 320 }}
        theme="light"
      >
        {(state: HeroSceneState, _rect, layout: Layout) => {
          const isCompact = layout === "compact";

          return (
            <>
              <Window
                url="hireloop.dev/candidates?role=frontend"
                className="hl-window"
                style={{
                  width: isCompact ? 336 : 600,
                  height: isCompact ? 290 : 324,
                  left: isCompact ? 11 : 20,
                  top: isCompact ? 14 : 18,
                }}
              >
                <div className="hl-layout">
                  {/* Sidebar (hidden on compact) */}
                  {!isCompact && (
                    <aside className="hl-sidebar">
                      <div className="hl-sidebar-section">Recruiting</div>
                      <div className="hl-nav-item" data-active="true">
                        <span className="hl-nav-dot" />
                        <span>Candidates</span>
                      </div>
                      <div className="hl-nav-item">
                        <span className="hl-nav-dot" />
                        <span>Placements</span>
                      </div>
                      <div className="hl-nav-item">
                        <span className="hl-nav-dot" />
                        <span>Shortlists</span>
                      </div>
                      <div className="hl-sidebar-section">Agency</div>
                      <div className="hl-nav-item">
                        <span className="hl-nav-dot" />
                        <span>Clients</span>
                      </div>
                      <div className="hl-nav-item">
                        <span className="hl-nav-dot" />
                        <span>Skill Matrix</span>
                      </div>
                    </aside>
                  )}

                  {/* Main Candidate Explorer */}
                  <main className="hl-main">
                    {/* Filter / Search Bar */}
                    <div className="hl-filter-bar">
                      <div
                        className="hl-search-input"
                        data-target="search-filter"
                        data-cursor="text"
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#72847d"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                        >
                          <circle cx="11" cy="11" r="8" />
                          <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <Text style={{ fontSize: 11, color: state.query ? "#192420" : "#8a9c94" }}>
                          {state.query || "Filter by skill, framework, role…"}
                        </Text>
                      </div>
                      {!isCompact && (
                        <>
                          <span className="hl-filter-pill">US Overlap</span>
                          <span className="hl-filter-pill">&lt; $150/hr</span>
                        </>
                      )}
                    </div>

                    {/* Candidate Cards */}
                    <div className="hl-candidate-list">
                      {/* Focal Card: Alex Chen */}
                      <div
                        className="hl-candidate-card"
                        data-featured={state.highlightAlex ? "true" : undefined}
                      >
                        <div className="hl-card-top">
                          <div className="hl-candidate-identity">
                            <div
                              className="hl-avatar"
                              style={{
                                background: "linear-gradient(135deg, #479c73, #2e6b4e)",
                              }}
                            >
                              AC
                            </div>
                            <div>
                              <div className="hl-candidate-name">Alex Chen</div>
                              <div className="hl-candidate-title">
                                Staff Frontend Engineer · SF (8y exp)
                              </div>
                            </div>
                          </div>
                          <div className="hl-match-badge">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="#216947">
                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                            </svg>
                            <span>{state.matchScore}% Match</span>
                          </div>
                        </div>

                        <div className="hl-card-skills">
                          <span
                            className="hl-skill-chip"
                            data-matched={state.highlightAlex ? "true" : undefined}
                          >
                            React 19
                          </span>
                          <span
                            className="hl-skill-chip"
                            data-matched={state.highlightAlex ? "true" : undefined}
                          >
                            TypeScript
                          </span>
                          <span
                            className="hl-skill-chip"
                            data-matched={state.highlightAlex ? "true" : undefined}
                          >
                            GraphQL
                          </span>
                          <span className="hl-skill-chip">Next.js</span>
                          {!isCompact && <span className="hl-skill-chip">Tailwind</span>}
                        </div>

                        <div className="hl-card-actions">
                          <span>$140/hr · {state.statusLabel}</span>
                          <button
                            type="button"
                            className="hl-btn-shortlist"
                            data-target="shortlist-btn"
                            data-shortlisted={state.shortlisted ? "true" : undefined}
                          >
                            {state.shortlisted ? (
                              <>
                                <svg
                                  width="10"
                                  height="10"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="3"
                                >
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                                <span>Shortlisted</span>
                              </>
                            ) : (
                              <span>+ Add Shortlist</span>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Secondary Candidate: Maya Okafor */}
                      <div className="hl-quiet-row">
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div
                            className="hl-avatar"
                            style={{
                              width: 22,
                              height: 22,
                              fontSize: 9,
                              background: "linear-gradient(135deg, #7a1229, #9e1f3b)",
                            }}
                          >
                            MO
                          </div>
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 600, color: "#25332e" }}>
                              Maya Okafor
                            </div>
                            <div style={{ fontSize: 9.5, color: "#778982" }}>
                              Senior Fullstack · Toronto
                            </div>
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <Bar w={isCompact ? 40 : 80} tone={2} />
                          <span style={{ fontSize: 10, fontWeight: 600, color: "#479c73" }}>
                            92%
                          </span>
                        </div>
                      </div>

                      {/* Tertiary Candidate: Liam Vance (Quiet row) */}
                      {!isCompact && (
                        <div className="hl-quiet-row">
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div
                              className="hl-avatar"
                              style={{
                                width: 22,
                                height: 22,
                                fontSize: 9,
                                background: "#4c6677",
                              }}
                            >
                              LV
                            </div>
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 600, color: "#25332e" }}>
                                Liam Vance
                              </div>
                              <div style={{ fontSize: 9.5, color: "#778982" }}>
                                Principal UI Architect · London
                              </div>
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <Bar w={70} tone={2} />
                            <span style={{ fontSize: 10, fontWeight: 600, color: "#479c73" }}>
                              89%
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </main>
                </div>
              </Window>

              {/* Satellite Card: Client Shortlist Confirmation */}
              {state.satelliteVisible && (
                <div
                  className="hl-satellite"
                  style={{
                    bottom: isCompact ? 6 : 14,
                    right: isCompact ? 6 : 12,
                    width: isCompact ? 210 : 230,
                  }}
                >
                  <div className="hl-satellite-header">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#479c73"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    >
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    <span>Acme Corp Shortlist</span>
                  </div>
                  <div className="hl-satellite-body">
                    <strong>Alex Chen</strong> attached to Staff Frontend role. Client review link generated.
                  </div>
                  <div className="hl-satellite-meta">
                    <span>Active · 5 days</span>
                    <span style={{ color: "#245840", fontWeight: 700 }}>98% Match</span>
                  </div>
                </div>
              )}
            </>
          );
        }}
      </Stage>
    </div>
  );
}
