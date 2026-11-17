"use client";

import { useEffect, useState } from "react";

/**
 * Hydration-safe local clock for the recruiter sidebar.
 * Defers reading the local system time until mounted so SSR and client HTML match.
 */
export default function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    const initialId = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 15_000);
    return () => {
      window.clearTimeout(initialId);
      window.clearInterval(id);
    };
  }, []);

  const time = now
    ? now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    : "--:--";

  const date = now
    ? now.toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
      })
    : "Local schedule";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 3,
        padding: "10px 12px",
        borderRadius: 10,
        background: "rgba(255, 255, 255, 0.06)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          fontSize: 11.5,
          lineHeight: 1.25,
          color: "rgba(255, 255, 255, 0.68)",
          fontWeight: 500,
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "#5cb88c",
            flexShrink: 0,
          }}
          aria-hidden="true"
        />
        <span>Local time</span>
      </div>
      <div
        style={{
          fontSize: 18,
          lineHeight: 1.2,
          fontWeight: 700,
          letterSpacing: "-0.02em",
          color: "#fff",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {time}
      </div>
      <div
        style={{
          fontSize: 11.5,
          lineHeight: 1.3,
          color: "rgba(255, 255, 255, 0.62)",
        }}
      >
        {date}
      </div>
    </div>
  );
}
