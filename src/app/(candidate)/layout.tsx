import type { ReactNode } from "react";
import { getCurrentUser, getLinkedCandidate } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import ToastHost from "@/components/ToastHost";
import Avatar from "@/components/Avatar";
import { seedDatabase } from "@/lib/seed";
import CandidateNav from "./CandidateNav";

export const dynamic = "force-dynamic";

export default async function CandidateLayout({
  children,
}: {
  children: ReactNode;
}) {
  try {
    await seedDatabase();
  } catch {
    // ignore
  }

  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  if (user.role !== "candidate") {
    // If recruiter tries to view candidate layout, redirect them to recruiter dashboard
    redirect("/dashboard");
  }

  const candidate = await getLinkedCandidate(user.id);

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
      {/* Top Candidate Portal Header */}
      <header
        style={{
          borderBottom: "1px solid rgba(228, 234, 232, 0.8)",
          background: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(12px)",
          position: "sticky",
          top: 0,
          zIndex: 40,
        }}
      >
        <div
          style={{
            maxWidth: 1180,
            margin: "0 auto",
            padding: "12px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          {/* Brand */}
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <Link
              href="/candidate/dashboard"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                textDecoration: "none",
                color: "inherit",
              }}
            >
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
                ✦
              </div>
              <div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: "var(--ink)",
                    letterSpacing: "-0.01em",
                    lineHeight: 1.2,
                  }}
                >
                  Hireloop
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--sangria)",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    fontWeight: 700,
                  }}
                >
                  Candidate Portal
                </div>
              </div>
            </Link>

            {/* Navigation links */}
            <CandidateNav />
          </div>

          {/* Right user & actions */}
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
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
              {candidate?.region ? candidate.region.toUpperCase() : "TALENT"} · Verified
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Avatar
                name={candidate?.fullName || user.name}
                color={candidate?.avatarColor || user.avatarColor}
                size="md"
              />
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--ink)",
                    lineHeight: 1.2,
                  }}
                >
                  {candidate?.fullName || user.name}
                </span>
                <span style={{ fontSize: 11, color: "var(--ink-muted)" }}>
                  {user.email}
                </span>
              </div>
            </div>

            <form action="/api/auth/logout" method="POST" style={{ margin: 0 }}>
              <button
                type="submit"
                className="btn btn-ghost"
                style={{
                  fontSize: 12,
                  padding: "6px 12px",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
                title="Sign out of portal"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main style={{ flex: 1, padding: "32px 24px" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>{children}</div>
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
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          Hireloop Talent Network · Candidate Self-Service Platform
        </div>
      </footer>

      <ToastHost />
    </div>
  );
}
