// Lightweight, tree-shakable formatting helpers and Hireloop brand color maps.

export function initials(name: string): string {
  const parts = name
    .split(/\s+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function formatUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `$${Math.round(n / 1000)}k`;
  return `$${n}`;
}

export function formatUsdExact(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export const formatCurrency = formatUsdExact;
export const formatTimeAgo = formatRelative;

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateTime(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatRelative(
  d: Date | string | null | undefined,
  nowMs: number = Date.now()
): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  const diff = nowMs - date.getTime();
  const abs = Math.abs(diff);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (abs < minute) return "just now";
  if (abs < hour) return `${Math.floor(abs / minute)}m ago`;
  if (abs < day) return `${Math.floor(abs / hour)}h ago`;
  if (abs < 7 * day) return `${Math.floor(abs / day)}d ago`;
  if (abs < 30 * day) return `${Math.floor(abs / (7 * day))}w ago`;
  return formatDate(date);
}

export function formatRelativeFuture(
  d: Date | string,
  nowMs: number = Date.now()
): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const diff = date.getTime() - nowMs;
  const abs = Math.abs(diff);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (abs < minute) return "now";
  if (abs < hour) return `in ${Math.floor(abs / minute)}m`;
  if (abs < day) return `in ${Math.round(abs / hour)}h`;
  if (abs < 7 * day) return `in ${Math.floor(abs / day)}d`;
  if (abs < 30 * day) return `in ${Math.floor(abs / (7 * day))}w`;
  return formatDate(date);
}

export function relTier(
  d: Date | string,
  nowMs: number = Date.now()
): "urgent" | "soon" | "future" | "past" {
  const date = typeof d === "string" ? new Date(d) : d;
  const diff = date.getTime() - nowMs;
  if (diff < 0) return "past";
  if (diff < 1000 * 60 * 60 * 24) return "urgent";
  if (diff < 1000 * 60 * 60 * 24 * 3) return "soon";
  return "future";
}

export const FRAMEWORKS = [
  { value: "react", label: "React", color: "#3d7a99" },
  { value: "angular", label: "Angular", color: "#9a1a35" },
  { value: "vue", label: "Vue.js", color: "#2f7a58" },
  { value: "svelte", label: "Svelte", color: "#b55232" },
  { value: "nextjs", label: "Next.js", color: "#1a1716" },
  { value: "nuxt", label: "Nuxt", color: "#3b8764" },
  { value: "typescript", label: "TypeScript", color: "#3b6e96" },
  { value: "javascript", label: "JavaScript", color: "#b5862b" },
] as const;

export const SKILL_CATEGORIES_CONFIG: Record<
  string,
  { label: string; color: string }
> = {
  frontend: { label: "Frontend", color: "#7a1229" },
  backend: { label: "Backend", color: "#2f7a58" },
  cloud: { label: "Cloud & DevOps", color: "#9c6b28" },
  mobile: { label: "Mobile", color: "#456d87" },
  data: { label: "Data & Storage", color: "#8e3f32" },
  other: { label: "Architecture & Other", color: "#5e5753" },
};

export const DEFAULT_SKILL_COLORS: Record<string, string> = {
  react: "#3d7a99",
  angular: "#9a1a35",
  vue: "#2f7a58",
  svelte: "#b55232",
  nextjs: "#1a1716",
  nuxt: "#3b8764",
  typescript: "#3b6e96",
  javascript: "#b5862b",
  nodejs: "#3d7a55",
  python: "#3b6e96",
  golang: "#3a7d8c",
  go: "#3a7d8c",
  rust: "#8e4d32",
  java: "#9c6b28",
  csharp: "#2f7a58",
  aws: "#b06e24",
  gcp: "#456d87",
  azure: "#3b6e96",
  docker: "#456d87",
  kubernetes: "#3b6e96",
  terraform: "#5e5753",
  graphql: "#9a1a35",
  postgresql: "#456d87",
  redis: "#a82843",
  mongodb: "#2f7a58",
  tailwind: "#3d7a99",
  tailwindcss: "#3d7a99",
  flutter: "#3b6e96",
  swift: "#b55232",
  kotlin: "#5e5753",
};

// Map saturated legacy hex values from seeded rows into Hireloop's warm, restrained palette.
const LEGACY_COLOR_MAP: Record<string, string> = {
  "#ec4899": "#7a1229",
  "#db2777": "#8c2842",
  "#8b5cf6": "#5e5753",
  "#7c3aed": "#5e5753",
  "#9333ea": "#7a1229",
  "#7a4d9a": "#5e5753",
  "#6366f1": "#456d87",
  "#4f46e5": "#456d87",
  "#3b82f6": "#456d87",
  "#2563eb": "#456d87",
  "#0ea5e9": "#3d7a99",
  "#06b6d4": "#366c75",
  "#14b8a6": "#2f7a58",
  "#10b981": "#2f7a58",
  "#059669": "#2f7a58",
  "#22c55e": "#2f7a58",
  "#f59e0b": "#9c6b28",
  "#d97706": "#9c6b28",
  "#f97316": "#8e4d32",
  "#ef4444": "#a82843",
  "#dc2626": "#a82843",
  "#64748b": "#5e5753",
};

export function harmonizeColor(color?: string | null, seed = ""): string {
  if (!color) return pickColor(seed || "hireloop");
  const normalized = color.trim().toLowerCase();
  if (LEGACY_COLOR_MAP[normalized]) return LEGACY_COLOR_MAP[normalized];
  if (PALETTE.includes(normalized)) return normalized;
  return seed ? pickColor(seed) : normalized;
}

export function getSkillColor(
  nameOrSlug: string,
  fallbackCategoryColor?: string
): string {
  const key = nameOrSlug.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (DEFAULT_SKILL_COLORS[key]) return DEFAULT_SKILL_COLORS[key];
  if (fallbackCategoryColor) return harmonizeColor(fallbackCategoryColor);
  return pickColor(nameOrSlug);
}

export const PROFICIENCY_LABEL: Record<string, string> = {
  learning: "Learning",
  working: "Working",
  strong: "Strong",
  expert: "Expert",
};

export const PROFICIENCY_WEIGHT: Record<string, number> = {
  learning: 1,
  working: 2,
  strong: 3,
  expert: 4,
};

export const SENIORITY_LABEL: Record<string, string> = {
  junior: "Junior",
  mid: "Mid-level",
  senior: "Senior",
  staff: "Staff",
  principal: "Principal",
};

export const STATUS_LABEL: Record<string, string> = {
  unverified: "Unverified",
  pending: "In review",
  verified: "Verified",
  rejected: "Rejected",
};

export const MILESTONE_LABEL: Record<string, string> = {
  sourced: "Sourced",
  screening: "Screening",
  submitted: "Submitted",
  interviewing: "Interviewing",
  offer: "Offer",
  placed: "Placed",
  archived: "Archived",
};

export const MILESTONE_COLOR: Record<string, string> = {
  sourced: "#6b6562",
  screening: "#456d87",
  submitted: "#7a1229",
  interviewing: "#9c6b28",
  offer: "#3b8764",
  placed: "#2f7a58",
  archived: "#78716c",
};

export const MILESTONE_ORDER = [
  "sourced",
  "screening",
  "submitted",
  "interviewing",
  "offer",
  "placed",
  "archived",
] as const;

export const INTERVIEW_TYPE_LABEL: Record<string, string> = {
  screen: "Recruiter screen",
  technical: "Technical",
  "system-design": "System design",
  behavioral: "Behavioral",
  final: "Final round",
};

export const INTERVIEW_OUTCOME_LABEL: Record<string, string> = {
  scheduled: "Scheduled",
  passed: "Passed",
  failed: "Failed",
  "no-show": "No-show",
  rescheduled: "Rescheduled",
};

export const INTERVIEW_OUTCOME_COLOR: Record<string, string> = {
  scheduled: "#456d87",
  passed: "#2f7a58",
  failed: "#a82843",
  "no-show": "#7a1229",
  rescheduled: "#9c6b28",
};

export const AVAILABILITY_LABEL: Record<string, string> = {
  available: "Available",
  limited: "Limited",
  booked: "Booked",
  "on-leave": "On leave",
};

export const AVAILABILITY_COLOR: Record<string, string> = {
  available: "#2f7a58",
  limited: "#9c6b28",
  booked: "#456d87",
  "on-leave": "#6b6562",
};

export const REGION_LABEL: Record<string, string> = {
  us: "United States",
  ca: "Canada",
  uk: "United Kingdom",
  eu: "Europe",
  other: "International",
};

export const REGION_CODE: Record<string, string> = {
  us: "US",
  ca: "CA",
  uk: "UK",
  eu: "EU",
  other: "INTL",
};

// Kept as empty strings to avoid broken emoji flag glyphs in UI copy; use REGION_CODE or REGION_LABEL.
export const REGION_FLAG: Record<string, string> = {
  us: "",
  ca: "",
  uk: "",
  eu: "",
  other: "",
};

export const SENIORITY_COLOR: Record<string, string> = {
  junior: "#6b6562",
  mid: "#456d87",
  senior: "#2f7a58",
  staff: "#9c6b28",
  principal: "#7a1229",
};

export const PALETTE = [
  "#7a1229",
  "#2f7a58",
  "#456d87",
  "#9c6b28",
  "#8e4d32",
  "#366353",
  "#524642",
  "#8c2842",
];

export function pickColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
