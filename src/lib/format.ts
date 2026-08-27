// Lightweight, tree-shakable formatting helpers.

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

export function formatRelative(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  const diff = Date.now() - date.getTime();
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

export function formatRelativeFuture(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const diff = date.getTime() - Date.now();
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

export function relTier(d: Date | string): "urgent" | "soon" | "future" | "past" {
  const date = typeof d === "string" ? new Date(d) : d;
  const diff = date.getTime() - Date.now();
  if (diff < 0) return "past";
  if (diff < 1000 * 60 * 60 * 24) return "urgent";
  if (diff < 1000 * 60 * 60 * 24 * 3) return "soon";
  return "future";
}

export const FRAMEWORKS = [
  { value: "react", label: "React", color: "#61dafb" },
  { value: "angular", label: "Angular", color: "#dd0031" },
  { value: "vue", label: "Vue.js", color: "#42b883" },
  { value: "svelte", label: "Svelte", color: "#ff3e00" },
  { value: "nextjs", label: "Next.js", color: "#1a1716" },
  { value: "nuxt", label: "Nuxt", color: "#00dc82" },
  { value: "typescript", label: "TypeScript", color: "#3178c6" },
  { value: "javascript", label: "JavaScript", color: "#f7df1e" },
] as const;

export const SKILL_CATEGORIES_CONFIG: Record<
  string,
  { label: string; color: string }
> = {
  frontend: { label: "Frontend", color: "#3b82f6" },
  backend: { label: "Backend", color: "#10b981" },
  cloud: { label: "Cloud & DevOps", color: "#f59e0b" },
  mobile: { label: "Mobile", color: "#8b5cf6" },
  data: { label: "Data & Storage", color: "#ec4899" },
  other: { label: "Architecture & Other", color: "#64748b" },
};

export const DEFAULT_SKILL_COLORS: Record<string, string> = {
  react: "#61dafb",
  angular: "#dd0031",
  vue: "#42b883",
  svelte: "#ff3e00",
  nextjs: "#1a1716",
  nuxt: "#00dc82",
  typescript: "#3178c6",
  javascript: "#f7df1e",
  nodejs: "#5fa04e",
  python: "#3776ab",
  golang: "#00add8",
  go: "#00add8",
  rust: "#dea584",
  java: "#b07219",
  csharp: "#178600",
  aws: "#ff9900",
  gcp: "#4285f4",
  azure: "#0078d4",
  docker: "#2496ed",
  kubernetes: "#326ce5",
  terraform: "#844fba",
  graphql: "#e10098",
  postgresql: "#4169e1",
  redis: "#dc382d",
  mongodb: "#47a248",
  tailwind: "#38bdf8",
  flutter: "#02569b",
  swift: "#f05138",
  kotlin: "#7f52ff",
};

export function getSkillColor(
  nameOrSlug: string,
  fallbackCategoryColor?: string
): string {
  const key = nameOrSlug.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (DEFAULT_SKILL_COLORS[key]) return DEFAULT_SKILL_COLORS[key];
  if (fallbackCategoryColor) return fallbackCategoryColor;
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
  sourced: "#9a948f",
  screening: "#5a8db0",
  submitted: "#7a4d9a",
  interviewing: "#c48a3a",
  offer: "#479c73",
  placed: "#2f7a58",
  archived: "#6b6562",
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
  scheduled: "#5a8db0",
  passed: "#2f7a58",
  failed: "#b8334e",
  "no-show": "#7a1229",
  rescheduled: "#c48a3a",
};

export const AVAILABILITY_LABEL: Record<string, string> = {
  available: "Available",
  limited: "Limited",
  booked: "Booked",
  "on-leave": "On leave",
};

export const AVAILABILITY_COLOR: Record<string, string> = {
  available: "#479c73",
  limited: "#c48a3a",
  booked: "#5a8db0",
  "on-leave": "#9a948f",
};

export const REGION_LABEL: Record<string, string> = {
  us: "United States",
  ca: "Canada",
  uk: "United Kingdom",
  eu: "Europe",
  other: "Other",
};

export const REGION_FLAG: Record<string, string> = {
  us: "🇺🇸",
  ca: "🇨🇦",
  uk: "🇬🇧",
  eu: "🇪🇺",
  other: "🌍",
};

export const SENIORITY_COLOR: Record<string, string> = {
  junior: "#9a948f",
  mid: "#5a8db0",
  senior: "#479c73",
  staff: "#c48a3a",
  principal: "#7a1229",
};

export const PALETTE = [
  "#7a1229",
  "#479c73",
  "#c48a3a",
  "#5a8db0",
  "#7a4d9a",
  "#b8334e",
  "#2f7a58",
  "#9a1a35",
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
