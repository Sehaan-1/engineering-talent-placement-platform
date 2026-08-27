"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Avatar from "@/components/Avatar";
import { pushToast } from "@/components/ToastHost";
import {
  PROFICIENCY_LABEL,
  REGION_FLAG,
} from "@/lib/format";
import {
  IconGlobe,
  IconLink,
  IconPlus,
  IconStar,
  IconTrash,
  IconUsers,
  IconUpload,
  IconFileText,
  IconCheck,
  IconSparkle,
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

type Skill = {
  id: number;
  skillId: number;
  name: string;
  slug: string;
  categoryName?: string;
  categoryColor?: string;
  proficiency: string;
  yearsUsed: number;
  notes: string;
};

type SkillDef = {
  id: number;
  name: string;
  slug: string;
  categoryId: number;
};

type Category = {
  id: number;
  name: string;
  slug: string;
  color: string;
};

export default function CandidateProfileView({
  candidate,
  skills: initialSkills,
  allSkillDefs,
  categories,
}: {
  candidate: Candidate;
  skills: Skill[];
  allSkillDefs: SkillDef[];
  categories: Category[];
}) {
  const router = useRouter();

  // Profile form state
  const [headline, setHeadline] = useState(candidate.headline);
  const [bio, setBio] = useState(candidate.bio);
  const [location, setLocation] = useState(candidate.location);
  const [timezone, setTimezone] = useState(candidate.timezone);
  const [timezoneOverlap, setTimezoneOverlap] = useState(candidate.timezoneOverlap);
  const [hourlyRateUsd, setHourlyRateUsd] = useState(candidate.hourlyRateUsd);
  const [phone, setPhone] = useState(candidate.phone ?? "");
  const [portfolioUrl, setPortfolioUrl] = useState(candidate.portfolioUrl ?? "");
  const [githubUrl, setGithubUrl] = useState(candidate.githubUrl ?? "");
  const [linkedinUrl, setLinkedinUrl] = useState(candidate.linkedinUrl ?? "");

  // Skills state
  const [skills, setSkills] = useState<Skill[]>(initialSkills);
  const [selectedSkillIdToAdd, setSelectedSkillIdToAdd] = useState<number | "">("");
  const [selectedProfToAdd, setSelectedProfToAdd] = useState<string>("strong");
  const [yearsToAdd, setYearsToAdd] = useState<number>(3);

  // Resume upload & AI parsing state
  const [uploadingResume, setUploadingResume] = useState(false);
  const [resumeParsedResult, setResumeParsedResult] = useState<{
    filename: string;
    skillsFound: string[];
  } | null>(null);

  const [saving, setSaving] = useState(false);

  async function handleResumeFile(file: File) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
      pushToast("Please upload a valid PDF document.", "error");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      pushToast("File exceeds 10MB limit.", "error");
      return;
    }

    setUploadingResume(true);
    setResumeParsedResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/candidates/${candidate.id}/resume`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to parse resume");
      }

      setResumeParsedResult({
        filename: file.name,
        skillsFound: data.skillsFound || [],
      });

      pushToast(
        `✓ Resume processed! Extracted ${data.skillsCount || 0} skills.`,
        "success"
      );
      router.refresh();
    } catch (err: any) {
      console.error(err);
      pushToast(err.message || "Resume upload failed", "error");
    } finally {
      setUploadingResume(false);
    }
  }

  function handleAddSkill() {
    if (!selectedSkillIdToAdd) return;
    const def = allSkillDefs.find((d) => d.id === Number(selectedSkillIdToAdd));
    if (!def) return;

    if (skills.some((s) => s.skillId === def.id)) {
      pushToast(`${def.name} is already in your skills list.`, "error");
      return;
    }

    const cat = categories.find((c) => c.id === def.categoryId);

    const newSkill: Skill = {
      id: Date.now(), // Temporary client id
      skillId: def.id,
      name: def.name,
      slug: def.slug,
      categoryName: cat?.name,
      categoryColor: cat?.color,
      proficiency: selectedProfToAdd,
      yearsUsed: Math.max(1, yearsToAdd),
      notes: "",
    };

    setSkills([newSkill, ...skills]);
    setSelectedSkillIdToAdd("");
    pushToast(
      `Added ${def.name} (${selectedProfToAdd.toUpperCase()}). Click 'Save Changes' to persist.`,
      "success"
    );
  }

  function handleRemoveSkill(skillId: number) {
    setSkills(skills.filter((s) => s.skillId !== skillId));
  }

  function handleProficiencyChange(skillId: number, newProf: string) {
    setSkills(
      skills.map((s) =>
        s.skillId === skillId ? { ...s, proficiency: newProf } : s
      )
    );
  }

  function handleYearsChange(skillId: number, years: number) {
    setSkills(
      skills.map((s) =>
        s.skillId === skillId ? { ...s, yearsUsed: Math.max(1, years) } : s
      )
    );
  }

  function handleNotesChange(skillId: number, notes: string) {
    setSkills(
      skills.map((s) =>
        s.skillId === skillId ? { ...s, notes } : s
      )
    );
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        headline,
        bio,
        location,
        timezone,
        timezoneOverlap,
        hourlyRateUsd: Number(hourlyRateUsd),
        phone: phone || null,
        portfolioUrl: portfolioUrl || null,
        githubUrl: githubUrl || null,
        linkedinUrl: linkedinUrl || null,
        skills: skills.map((s) => ({
          skillId: s.skillId,
          proficiency: s.proficiency,
          yearsUsed: s.yearsUsed,
          notes: s.notes,
        })),
      };

      const res = await fetch("/api/candidates/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to save profile");
      }

      pushToast(
        "Your profile and skill self-assessment have been updated.",
        "success"
      );

      router.refresh();
    } catch (err) {
      pushToast(
        err instanceof Error ? err.message : "Error saving profile",
        "error"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      {/* Header Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
          background: "#ffffff",
          padding: "20px 28px",
          borderRadius: 14,
          border: "1px solid var(--pebble-line)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Avatar
            name={candidate.fullName}
            color={candidate.avatarColor}
            size="xl"
          />
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: "var(--ink)" }}>
              My Profile & Skill Matrix
            </h1>
            <p style={{ fontSize: 13, color: "var(--ink-muted)", margin: "2px 0 0 0" }}>
              Keep your experience and technical proficiencies accurate for client matching.
            </p>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="btn btn-primary"
          style={{
            padding: "10px 24px",
            borderRadius: 8,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {saving ? "Saving Changes…" : "Save All Changes ✓"}
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
          gap: 24,
        }}
      >
        {/* Left: Personal Details & Links */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              background: "#ffffff",
              borderRadius: 14,
              border: "1px solid var(--pebble-line)",
              padding: 24,
            }}
          >
            <h3
              style={{
                fontSize: 16,
                fontWeight: 700,
                marginBottom: 16,
                color: "var(--ink)",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <IconUsers size={18} />
              Core Information
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="field">
                <label>Full Name (Verified)</label>
                <input
                  type="text"
                  disabled
                  value={candidate.fullName}
                  style={{ background: "var(--pebble-soft)", cursor: "not-allowed" }}
                />
                <span style={{ fontSize: 11, color: "var(--ink-muted)" }}>
                  Managed by your recruiter ({REGION_FLAG[candidate.region]} {candidate.region.toUpperCase()} region).
                </span>
              </div>

              <div className="field">
                <label>Professional Headline</label>
                <input
                  type="text"
                  required
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="e.g. Senior Frontend Architect · React & TypeScript"
                />
              </div>

              <div className="field">
                <label>Bio & Career Summary</label>
                <textarea
                  rows={4}
                  required
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Summarize your engineering expertise, favorite tech stacks, and team leadership experience…"
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="field">
                  <label>Location</label>
                  <input
                    type="text"
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Hourly Rate ($ USD)</label>
                  <input
                    type="number"
                    min={20}
                    max={500}
                    required
                    value={hourlyRateUsd}
                    onChange={(e) => setHourlyRateUsd(Number(e.target.value))}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="field">
                  <label>Timezone</label>
                  <input
                    type="text"
                    required
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Timezone Overlap</label>
                  <input
                    type="text"
                    required
                    value={timezoneOverlap}
                    onChange={(e) => setTimezoneOverlap(e.target.value)}
                    placeholder="e.g. PST ±3h"
                  />
                </div>
              </div>

              <div className="field">
                <label>Contact Phone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                />
              </div>
            </div>
          </div>

          {/* Social / Portfolio Links */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: 14,
              border: "1px solid var(--pebble-line)",
              padding: 24,
            }}
          >
            <h3
              style={{
                fontSize: 16,
                fontWeight: 700,
                marginBottom: 16,
                color: "var(--ink)",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <IconLink size={18} />
              Portfolio & Profile Links
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="field">
                <label>Portfolio / Personal Website</label>
                <input
                  type="url"
                  value={portfolioUrl}
                  onChange={(e) => setPortfolioUrl(e.target.value)}
                  placeholder="https://yourportfolio.com"
                />
              </div>

              <div className="field">
                <label>GitHub Profile</label>
                <input
                  type="url"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  placeholder="https://github.com/yourhandle"
                />
              </div>

              <div className="field">
                <label>LinkedIn Profile</label>
                <input
                  type="url"
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  placeholder="https://linkedin.com/in/yourprofile"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Technical Skill Matrices Editor */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              background: "#ffffff",
              borderRadius: 14,
              border: "1px solid var(--pebble-line)",
              padding: 24,
            }}
          >
            {/* AI Resume Upload Section */}
            <div
              style={{
                background: "linear-gradient(135deg, #f5f3ff 0%, #fdf4ff 100%)",
                border: "1px solid #e9d5ff",
                borderRadius: 12,
                padding: 20,
                marginBottom: 24,
                boxShadow: "0 2px 8px rgba(147, 51, 234, 0.04)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      background: "#9333ea",
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
                      AI Resume Sync & Skill Extractor
                    </strong>
                    <span
                      style={{
                        marginLeft: 8,
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        background: "#d8b4fe",
                        color: "#3b0764",
                        padding: "2px 6px",
                        borderRadius: 4,
                      }}
                    >
                      AI Powered
                    </span>
                  </div>
                </div>
              </div>
              <p style={{ fontSize: 13, color: "#6b21a8", marginBottom: 16, lineHeight: 1.5 }}>
                Upload your PDF resume. Our AI parser extracts technical competencies, estimated experience, and auto-populates your skill matrix below.
              </p>

              {/* Upload Drop Area */}
              <div
                style={{
                  border: "2px dashed #c084fc",
                  borderRadius: 10,
                  padding: "20px 16px",
                  textAlign: "center",
                  background: "#ffffff",
                  cursor: uploadingResume ? "wait" : "pointer",
                  transition: "all 0.2s ease",
                  position: "relative",
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (uploadingResume) return;
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleResumeFile(file);
                }}
              >
                <input
                  type="file"
                  accept="application/pdf"
                  disabled={uploadingResume}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleResumeFile(file);
                    e.target.value = "";
                  }}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    opacity: 0,
                    cursor: uploadingResume ? "wait" : "pointer",
                  }}
                />

                {uploadingResume ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        border: "3px solid #e9d5ff",
                        borderTopColor: "#9333ea",
                        borderRadius: "50%",
                        animation: "spin 1s linear infinite",
                      }}
                    />
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#7e22ce" }}>
                      Analyzing resume and syncing skills…
                    </span>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                    <IconUpload size={24} style={{ color: "#9333ea" }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
                      Drop your PDF resume here, or <span style={{ color: "#9333ea", textDecoration: "underline" }}>browse files</span>
                    </span>
                    <span style={{ fontSize: 11, color: "var(--ink-muted)" }}>
                      Supports PDF up to 10MB
                    </span>
                  </div>
                )}
              </div>

              {resumeParsedResult && (
                <div
                  style={{
                    marginTop: 12,
                    padding: "10px 14px",
                    background: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                    borderRadius: 8,
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#166534", fontSize: 13, fontWeight: 600 }}>
                    <IconCheck size={16} />
                    <span>Parsed {resumeParsedResult.filename}: {resumeParsedResult.skillsFound.length} skills recognized</span>
                  </div>
                  {resumeParsedResult.skillsFound.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {resumeParsedResult.skillsFound.map((s, idx) => (
                        <span
                          key={idx}
                          style={{
                            fontSize: 11,
                            fontWeight: 500,
                            padding: "2px 8px",
                            borderRadius: 12,
                            background: "#dcfce7",
                            color: "#15803d",
                          }}
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <h3
              style={{
                fontSize: 16,
                fontWeight: 700,
                marginBottom: 16,
                color: "var(--ink)",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <IconStar size={18} />
              Skill Self-Assessment Matrix
            </h3>

            {/* Add Skill Bar */}
            <div
              style={{
                background: "var(--pebble-soft)",
                borderRadius: 10,
                padding: 14,
                marginBottom: 20,
                border: "1px solid var(--pebble-line)",
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--ink)",
                  display: "block",
                  marginBottom: 8,
                }}
              >
                Add Skill to Matrix
              </span>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1fr 1fr auto",
                  gap: 8,
                  alignItems: "center",
                }}
              >
                <select
                  value={selectedSkillIdToAdd}
                  onChange={(e) =>
                    setSelectedSkillIdToAdd(
                      e.target.value ? Number(e.target.value) : ""
                    )
                  }
                  style={{
                    padding: "8px 10px",
                    borderRadius: 6,
                    border: "1px solid var(--pebble-line)",
                    fontSize: 13,
                  }}
                >
                  <option value="">Select a skill…</option>
                  {allSkillDefs
                    .filter((def) => !skills.some((s) => s.skillId === def.id))
                    .map((def) => (
                      <option key={def.id} value={def.id}>
                        {def.name}
                      </option>
                    ))}
                </select>

                <select
                  value={selectedProfToAdd}
                  onChange={(e) => setSelectedProfToAdd(e.target.value)}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 6,
                    border: "1px solid var(--pebble-line)",
                    fontSize: 13,
                  }}
                >
                  <option value="learning">Learning</option>
                  <option value="working">Working</option>
                  <option value="strong">Strong</option>
                  <option value="expert">Expert</option>
                </select>

                <input
                  type="number"
                  min={1}
                  max={25}
                  value={yearsToAdd}
                  onChange={(e) => setYearsToAdd(Number(e.target.value))}
                  placeholder="Yrs"
                  style={{
                    padding: "8px 10px",
                    borderRadius: 6,
                    border: "1px solid var(--pebble-line)",
                    fontSize: 13,
                  }}
                />

                <button
                  type="button"
                  onClick={handleAddSkill}
                  className="btn btn-secondary"
                  style={{ padding: "8px 12px", borderRadius: 6 }}
                  title="Add skill"
                >
                  <IconPlus size={16} />
                </button>
              </div>
            </div>

            {/* List of Skills */}
            {skills.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--ink-muted)", textAlign: "center", padding: 20 }}>
                No skills listed yet. Add your core programming languages and frameworks above.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {skills.map((s) => (
                  <div
                    key={s.skillId}
                    style={{
                      border: "1px solid var(--pebble-line)",
                      borderRadius: 10,
                      padding: 14,
                      background: "#fafcfb",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 10,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <strong style={{ fontSize: 14, color: "var(--ink)" }}>
                          {s.name}
                        </strong>
                        {s.categoryName ? (
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 600,
                              background: s.categoryColor ? `${s.categoryColor}15` : "var(--pebble-soft)",
                              color: s.categoryColor || "var(--ink-muted)",
                              padding: "2px 6px",
                              borderRadius: 4,
                            }}
                          >
                            {s.categoryName}
                          </span>
                        ) : null}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(s.skillId)}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "var(--sangria)",
                          cursor: "pointer",
                          padding: 4,
                          display: "flex",
                          alignItems: "center",
                        }}
                        title="Remove skill"
                      >
                        <IconTrash size={15} />
                      </button>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1.5fr 1fr",
                        gap: 10,
                        marginBottom: 8,
                      }}
                    >
                      <div>
                        <label style={{ fontSize: 11, color: "var(--ink-muted)", display: "block", marginBottom: 3 }}>
                          Proficiency
                        </label>
                        <select
                          value={s.proficiency}
                          onChange={(e) =>
                            handleProficiencyChange(s.skillId, e.target.value)
                          }
                          style={{
                            width: "100%",
                            padding: "6px 8px",
                            borderRadius: 6,
                            border: "1px solid var(--pebble-line)",
                            fontSize: 12,
                            background: "#ffffff",
                          }}
                        >
                          <option value="learning">Learning</option>
                          <option value="working">Working (Daily)</option>
                          <option value="strong">Strong (Production)</option>
                          <option value="expert">Expert (Architecture)</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ fontSize: 11, color: "var(--ink-muted)", display: "block", marginBottom: 3 }}>
                          Years Experience
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={30}
                          value={s.yearsUsed}
                          onChange={(e) =>
                            handleYearsChange(s.skillId, Number(e.target.value))
                          }
                          style={{
                            width: "100%",
                            padding: "6px 8px",
                            borderRadius: 6,
                            border: "1px solid var(--pebble-line)",
                            fontSize: 12,
                            background: "#ffffff",
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <input
                        type="text"
                        value={s.notes}
                        onChange={(e) => handleNotesChange(s.skillId, e.target.value)}
                        placeholder="Context / projects (e.g. Next.js 15 App Router, SSR, Tailwind)"
                        style={{
                          width: "100%",
                          padding: "6px 8px",
                          borderRadius: 6,
                          border: "1px solid var(--pebble-line)",
                          fontSize: 12,
                          background: "#ffffff",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}
