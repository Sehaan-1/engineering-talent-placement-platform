"use client";

import { useEffect, useState } from "react";

/**
 * Live ticking clock for the sidebar footer.
 * Renders the recruiter's local time in a refined format.
 */
export default function LiveClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const time = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const date = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        padding: "10px 12px",
        borderRadius: 10,
        background: "rgba(255, 255, 255, 0.04)",
        border: "1px solid rgba(255, 255, 255, 0.06)",
        position: "relative",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 10,
          color: "rgba(255, 255, 255, 0.5)",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          fontWeight: 700,
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "#479c73",
            boxShadow: "0 0 6px #479c73",
          }}
        />
        Local time
      </div>
      <div
        style={{
          fontSize: 18,
          fontWeight: 700,
          letterSpacing: "-0.02em",
          color: "#fff",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {time}
      </div>
      <div style={{ fontSize: 11, color: "rgba(255, 255, 255, 0.55)" }}>
        {date}
      </div>
    </div>
  );
}
