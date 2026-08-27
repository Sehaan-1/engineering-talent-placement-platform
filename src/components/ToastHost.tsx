"use client";

import { useSyncExternalStore } from "react";

type Toast = {
  id: number;
  message: string;
  kind: "default" | "success" | "error";
};

let nextId = 1;
const listeners = new Set<() => void>();
let toasts: Toast[] = [];

function emit() {
  for (const l of listeners) l();
}

export function pushToast(message: string, kind: Toast["kind"] = "default") {
  const t: Toast = { id: nextId++, message, kind };
  toasts = [...toasts, t];
  emit();
  setTimeout(() => {
    toasts = toasts.filter((x) => x.id !== t.id);
    emit();
  }, 3200);
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
    <>
      {items.map((t) => (
        <div key={t.id} className={`toast ${t.kind}`} role="status">
          {t.message}
        </div>
      ))}
    </>
  );
}
