"use client";

import { useSyncExternalStore } from "react";
import { IconAlertCircle, IconCheckCircle, IconX } from "./Icon";

type Toast = {
  id: number;
  message: string;
  kind: "default" | "success" | "error";
  leaving?: boolean;
};

const HOLD_MS = 3200;
const EXIT_MS = 180;

let nextId = 1;
const listeners = new Set<() => void>();
let toasts: Toast[] = [];

function emit() {
  for (const l of listeners) l();
}

function dismissToast(id: number) {
  const target = toasts.find((x) => x.id === id);
  if (!target || target.leaving) return;
  toasts = toasts.map((x) => (x.id === id ? { ...x, leaving: true } : x));
  emit();
  setTimeout(() => {
    toasts = toasts.filter((x) => x.id !== id);
    emit();
  }, EXIT_MS);
}

export function pushToast(message: string, kind: Toast["kind"] = "default") {
  // Strip decorative leading glyph prefixes so status icons carry the signal cleanly.
  const cleaned = message.replace(/^[✦✓⚡]\s*/, "").trim();
  const id = nextId++;
  const t: Toast = { id, message: cleaned || message, kind };
  toasts = [...toasts.slice(-3), t];
  emit();
  setTimeout(() => dismissToast(id), HOLD_MS);
}

function getSnapshot(): Toast[] {
  return toasts;
}

const SERVER_SNAPSHOT: Toast[] = [];

function getServerSnapshot(): Toast[] {
  return SERVER_SNAPSHOT;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export default function ToastHost() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  if (items.length === 0) return null;
  return (
    <div className="toast-stack" aria-live="polite" aria-atomic="false">
      {items.map((t) => (
        <div
          key={t.id}
          className={`toast ${t.kind}`}
          data-leaving={t.leaving ? "true" : undefined}
          role="status"
        >
          {t.kind === "success" ? (
            <IconCheckCircle size={16} />
          ) : t.kind === "error" ? (
            <IconAlertCircle size={16} />
          ) : null}
          <span>{t.message}</span>
          <button
            type="button"
            className="toast-dismiss"
            onClick={() => dismissToast(t.id)}
            aria-label="Dismiss notification"
          >
            <IconX size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
