// Lightweight module that re-exports the helpers needed in client-safe contexts.
export {
  hashPassword,
  verifyPassword,
  newSessionId,
  tokenFingerprint,
  createSessionForUser,
  destroyCurrentSession,
  getCurrentUser,
  requireUser,
} from "./auth";

export const PALETTE = [
  "#6366f1",
  "#ec4899",
  "#f59e0b",
  "#10b981",
  "#06b6d4",
  "#8b5cf6",
  "#ef4444",
  "#22c55e",
  "#3b82f6",
  "#f97316",
];

export function pickColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}
