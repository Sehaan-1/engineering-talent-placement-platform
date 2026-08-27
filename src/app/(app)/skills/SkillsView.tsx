"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import Avatar from "@/components/Avatar";
import FrameworkChip from "@/components/FrameworkChip";
import EmptyState from "@/components/EmptyState";
import Modal from "@/components/Modal";
import { PROFICIENCY_LABEL, PROFICIENCY_WEIGHT } from "@/lib/format";
import { IconStar, IconPlus, IconSearch, IconClose, IconCode } from "@/components/Icon";
import { pushToast } from "@/components/ToastHost";
import { useRouter } from "next/navigation";

export type SkillCategoryItem = {
  id: number;
  name: string;
  slug: string;
  color: string;
};

export type SkillDefinitionItem = {
  id: number;
  categoryId: number;
  name: string;
  slug: string;
  categoryName: string;
  categorySlug: string;
  categoryColor: string;
};

export type CandidateSkillItem = {
  id: number;
  skillId: number;
  name: string;
  slug: string;
  categoryName: string;
  categorySlug: string;
  categoryColor: string;
  proficiency: string;
  yearsUsed: number;
  candidate: {
    id: number;
    fullName: string;
    headline: string;
    avatarColor: string;
  };
};

const PROFICIENCY_ORDER = ["expert", "strong", "working", "learning"] as const;

export default function SkillsView({
  skills,
  categories,
  definitions,
  counts,
}: {
  skills: CandidateSkillItem[];
  categories: SkillCategoryItem[];
  definitions: SkillDefinitionItem[];
  counts: Record<string, number>;
}) {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSkillSlug, setSelectedSkillSlug] = useState("");
  const [proficiency, setProficiency] = useState("");
  const [search, setSearch] = useState("");

  const [showAddDefModal, setShowAddDefModal] = useState(false);
  const [newDefName, setNewDefName] = useState("");
  const [newDefCategorySlug, setNewDefCategorySlug] = useState(
    categories[0]?.slug ?? "frontend"
  );
  const [savingDef, setSavingDef] = useState(false);

  const filtered = useMemo(() => {
    return skills.filter((s) => {
      if (selectedCategory && s.categorySlug !== selectedCategory) return false;
      if (selectedSkillSlug && s.slug !== selectedSkillSlug) return false;
      if (proficiency && s.proficiency !== proficiency) return false;
      if (search) {
        const q = search.toLowerCase();
        const matchName = s.candidate.fullName.toLowerCase().includes(q);
        const matchSkill = s.name.toLowerCase().includes(q);
        const matchHeadline = s.candidate.headline.toLowerCase().includes(q);
        if (!matchName && !matchSkill && !matchHeadline) return false;
      }
      return true;
    });
  }, [skills, selectedCategory, selectedSkillSlug, proficiency, search]);

  // Group by skill definition name
  const bySkill = useMemo(() => {
    const map = new Map<string, CandidateSkillItem[]>();
    for (const s of filtered) {
      const list = map.get(s.slug) ?? [];
      list.push(s);
      map.set(s.slug, list);
    }
    return map;
  }, [filtered]);

  async function handleCreateDefinition(e: React.FormEvent) {
    e.preventDefault();
    if (!newDefName.trim()) return;
    setSavingDef(true);
    try {
      const res = await fetch("/api/skills/definitions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: newDefName.trim(),
          categorySlug: newDefCategorySlug,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to define skill");
      }
      pushToast(`Skill "${newDefName.trim()}" added to library.`, "success");
      setShowAddDefModal(false);
      setNewDefName("");
      router.refresh();
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Failed", "error");
    } finally {
      setSavingDef(false);
    }
  }

  const activeFilterCount =
    (selectedCategory ? 1 : 0) +
    (selectedSkillSlug ? 1 : 0) +
    (proficiency ? 1 : 0) +
    (search ? 1 : 0);

  return (
    <main className="content fade-in">
      <header className="page-header">
        <div className="meta">
          <h1>Skill matrix</h1>
          <p>
            {skills.length} tracked skill proficiencies across {categories.length}{" "}
            technical disciplines. Use this to instantly find matching talent.
          </p>
        </div>
        <div>
          <button
            className="btn"
            onClick={() => setShowAddDefModal(true)}
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <IconPlus size={14} />
            Define new skill
          </button>
        </div>
      </header>

      {/* Category Pills Bar */}
      <div
        style={{
          display: "flex",
          gap: 8,
          overflowX: "auto",
          paddingBottom: 4,
          marginBottom: 16,
        }}
      >
        <button
          type="button"
          onClick={() => {
            setSelectedCategory("");
            setSelectedSkillSlug("");
          }}
          style={{
            padding: "6px 14px",
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            border: !selectedCategory
              ? "1px solid var(--sangria)"
              : "1px solid var(--pebble-deep)",
            background: !selectedCategory ? "var(--sangria)" : "#fff",
            color: !selectedCategory ? "#fff" : "var(--ink)",
            transition: "all 0.15s ease",
            whiteSpace: "nowrap",
          }}
        >
          All categories ({skills.length})
        </button>
        {categories.map((c) => {
          const active = selectedCategory === c.slug;
          const count = skills.filter((s) => s.categorySlug === c.slug).length;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setSelectedCategory(active ? "" : c.slug);
                setSelectedSkillSlug("");
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 14px",
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                border: active
                  ? `1px solid ${c.color}`
                  : "1px solid var(--pebble-deep)",
                background: active ? c.color : "#fff",
                color: active ? "#fff" : "var(--ink)",
                transition: "all 0.15s ease",
                whiteSpace: "nowrap",
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: active ? "#fff" : c.color,
                }}
              />
              <span>{c.name}</span>
              <span
                style={{
                  fontSize: 10,
                  opacity: 0.8,
                  background: active ? "rgba(0,0,0,0.15)" : "var(--pebble-tint)",
                  padding: "1px 6px",
                  borderRadius: 10,
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Toolbar filters */}
      <div className="toolbar" style={{ marginBottom: 20 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "var(--pebble-tint)",
            border: "1px solid var(--pebble-deep)",
            borderRadius: 8,
            padding: "0 10px",
            minWidth: 200,
            flex: 1,
          }}
        >
          <IconSearch size={14} className="text-muted" />
          <input
            placeholder="Search candidates or skills..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              border: "none",
              outline: "none",
              font: "inherit",
              fontSize: 13,
              padding: "8px 0",
              background: "transparent",
              width: "100%",
            }}
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch("")}
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                color: "var(--ink-muted)",
              }}
            >
              <IconClose size={12} />
            </button>
          ) : null}
        </div>

        <select
          className="input"
          value={selectedSkillSlug}
          onChange={(e) => setSelectedSkillSlug(e.target.value)}
          style={{ minWidth: 160 }}
        >
          <option value="">All skills</option>
          {definitions
            .filter((d) => !selectedCategory || d.categorySlug === selectedCategory)
            .map((d) => (
              <option key={d.id} value={d.slug}>
                {d.name} ({counts[d.slug] ?? 0})
              </option>
            ))}
        </select>

        <select
          className="input"
          value={proficiency}
          onChange={(e) => setProficiency(e.target.value)}
          style={{ minWidth: 140 }}
        >
          <option value="">Any proficiency</option>
          {PROFICIENCY_ORDER.map((p) => (
            <option key={p} value={p}>
              {PROFICIENCY_LABEL[p]}
            </option>
          ))}
        </select>

        {activeFilterCount > 0 ? (
          <button
            className="btn ghost sm"
            onClick={() => {
              setSelectedCategory("");
              setSelectedSkillSlug("");
              setProficiency("");
              setSearch("");
            }}
          >
            Clear filters
          </button>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<IconStar size={26} />}
            title="No matching skills found"
            description="Try selecting a different category or skill, or attach new skills to candidate profiles."
          />
        </div>
      ) : (
        <section style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {Array.from(bySkill.entries()).map(([slug, list]) => {
            const first = list[0];
            const sorted = [...list].sort(
              (a, b) =>
                (PROFICIENCY_WEIGHT[b.proficiency] ?? 0) -
                (PROFICIENCY_WEIGHT[a.proficiency] ?? 0)
            );
            return (
              <div
                key={slug}
                className="card"
                style={{
                  borderRadius: 12,
                  border: "1px solid var(--pebble-deep)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "12px 18px",
                    background: "var(--pebble-light)",
                    borderBottom: "1px solid var(--border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <FrameworkChip
                      name={first.name}
                      framework={first.slug}
                      color={first.categoryColor}
                    />
                    <span
                      style={{
                        fontSize: 11,
                        color: "var(--ink-muted)",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                      }}
                    >
                      {first.categoryName}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--ink-muted)",
                    }}
                  >
                    {list.length} {list.length === 1 ? "engineer" : "engineers"}
                  </span>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                    gap: 12,
                    padding: 16,
                  }}
                >
                  {sorted.map((s) => (
                    <Link
                      key={s.id}
                      href={`/candidates/${s.candidate.id}`}
                      style={{
                        textDecoration: "none",
                        color: "inherit",
                        background: "#fff",
                        border: "1px solid var(--pebble-deep)",
                        borderRadius: 10,
                        padding: "10px 14px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10,
                        transition: "all 0.15s ease",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                        <Avatar
                          name={s.candidate.fullName}
                          color={s.candidate.avatarColor}
                          size="sm"
                        />
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontWeight: 600,
                              fontSize: 13,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {s.candidate.fullName}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: "var(--ink-muted)",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {s.candidate.headline}
                          </div>
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "flex-end",
                          gap: 3,
                          flexShrink: 0,
                        }}
                      >
                        <span
                          className={`skill-tag ${s.proficiency}`}
                          style={{ fontSize: 10, padding: "2px 6px" }}
                        >
                          {PROFICIENCY_LABEL[s.proficiency] ?? s.proficiency}
                        </span>
                        <span
                          style={{
                            fontSize: 10,
                            color: "var(--ink-muted)",
                          }}
                        >
                          {s.yearsUsed}y exp
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* Define New Skill Modal */}
      <Modal
        open={showAddDefModal}
        onClose={() => setShowAddDefModal(false)}
        title="Define new skill"
        footer={
          <>
            <button
              type="button"
              className="btn"
              onClick={() => setShowAddDefModal(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="define-skill-form"
              className="btn primary"
              disabled={savingDef}
            >
              {savingDef ? "Creating…" : "Add to Library"}
            </button>
          </>
        }
      >
        <form id="define-skill-form" onSubmit={handleCreateDefinition}>
          <div className="field">
            <label>Skill Name</label>
            <input
              required
              placeholder="e.g. Kubernetes, Rust, GraphQL, Swift"
              value={newDefName}
              onChange={(e) => setNewDefName(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Category</label>
            <select
              value={newDefCategorySlug}
              onChange={(e) => setNewDefCategorySlug(e.target.value)}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <p className="text-muted text-sm" style={{ marginTop: 8 }}>
            Once defined, this skill will be selectable across candidate profiles and filters.
          </p>
        </form>
      </Modal>
    </main>
  );
}
