import type { ReactNode } from "react";
import ToastHost from "@/components/ToastHost";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--pebble-tint)",
        display: "flex",
        flexDirection: "column",
        color: "var(--ink)",
      }}
    >
      {/* Top Client Portal Bar */}
      <header
        style={{
          borderBottom: "1px solid rgba(228, 234, 232, 0.8)",
          background: "rgba(255, 255, 255, 0.92)",
          backdropFilter: "blur(12px)",
          position: "sticky",
          top: 0,
          zIndex: 40,
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            padding: "16px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          {/* Brand */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: "var(--sangria)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontWeight: 700,
                fontSize: 16,
                boxShadow: "0 2px 8px rgba(122, 18, 41, 0.3)",
              }}
            >
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 17l6-6 4 4 6-6" />
                <path d="M14 9h6v6" />
              </svg>
            </div>
            <div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "var(--ink)",
                  letterSpacing: "-0.01em",
                }}
              >
                Hireloop
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "var(--ink-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  fontWeight: 600,
                }}
              >
                Client Review Portal
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 12,
              color: "var(--ink-muted)",
              background: "var(--pebble-soft)",
              padding: "4px 10px",
              borderRadius: 999,
              fontWeight: 500,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "var(--jade)",
                display: "inline-block",
              }}
            />
            Secure Shortlist Session
          </div>
        </div>
      </header>

      {/* Main content */}
      <main style={{ flex: 1, padding: "32px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>{children}</div>
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: "1px solid rgba(228, 234, 232, 0.8)",
          padding: "24px",
          textAlign: "center",
          fontSize: 12,
          color: "var(--ink-faint)",
        }}
      >
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          Powered by <strong>Hireloop Talent Network</strong> · Verified
          Engineering Talent Placement Platform
        </div>
      </footer>

      <ToastHost />
    </div>
  );
}
