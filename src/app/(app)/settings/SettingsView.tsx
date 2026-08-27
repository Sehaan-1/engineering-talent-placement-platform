"use client";

import Link from "next/link";
import Avatar from "@/components/Avatar";
import { useRouter } from "next/navigation";
import {
  IconLogout,
  IconStar,
  IconUsers,
  IconShield,
  IconBuilding,
  IconArrowRight,
} from "@/components/Icon";

export default function SettingsView({
  user,
  org,
  memberRole,
  counts,
}: {
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
    avatarColor: string;
  };
  org: {
    id: number;
    name: string;
    plan: string;
    logoColor: string;
  };
  memberRole: string;
  counts: {
    candidates: number;
    placements: number;
    interviews: number;
    availability: number;
    skills: number;
    members: number;
  };
}) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  const roleLabel =
    memberRole === "owner"
      ? "Owner"
      : memberRole === "admin"
      ? "Admin"
      : "Member";

  return (
    <main className="content fade-in">
      <header className="page-header">
        <div className="meta">
          <h1>Settings &amp; Workspace</h1>
          <p>Manage your account, team permissions, and workspace preferences.</p>
        </div>
      </header>

      {/* Workspace & Team Quick Links */}
      <section className="grid cols-2" style={{ gap: 16, marginBottom: 20 }}>
        <Link
          href="/settings/team"
          className="card card-pad"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            textDecoration: "none",
            color: "inherit",
            transition: "transform 0.15s ease, border-color 0.15s ease",
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              background: "rgba(59, 130, 246, 0.12)",
              color: "#2563eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <IconUsers size={22} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
              <span>Team Management</span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "1px 6px",
                  borderRadius: 4,
                  background: "#eff6ff",
                  color: "#1d4ed8",
                }}
              >
                {counts.members} {counts.members === 1 ? "member" : "members"}
              </span>
            </div>
            <p style={{ fontSize: 12, color: "var(--ink-muted)", margin: "4px 0 0 0" }}>
              Invite recruiters, manage role permissions (Owner/Admin/Member), and workspace seats.
            </p>
          </div>
          <IconArrowRight size={16} style={{ color: "var(--ink-muted)" }} />
        </Link>

        {memberRole !== "member" ? (
          <Link
            href="/settings/audit"
            className="card card-pad"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              textDecoration: "none",
              color: "inherit",
              transition: "transform 0.15s ease, border-color 0.15s ease",
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: "rgba(122, 18, 41, 0.12)",
                color: "var(--sangria)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <IconShield size={22} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                <span>Audit Log &amp; Compliance</span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "1px 5px",
                    borderRadius: 4,
                    background: "#f0fdf4",
                    color: "#16a34a",
                    border: "1px solid #bbf7d0",
                  }}
                >
                  ENTERPRISE
                </span>
              </div>
              <p style={{ fontSize: 12, color: "var(--ink-muted)", margin: "4px 0 0 0" }}>
                Immutable activity trail, attribute-level JSON diffs, and CSV compliance export.
              </p>
            </div>
            <IconArrowRight size={16} style={{ color: "var(--ink-muted)" }} />
          </Link>
        ) : (
          <div
            className="card card-pad"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              opacity: 0.7,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: "rgba(100, 116, 139, 0.12)",
                color: "#64748b",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <IconShield size={22} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>
                Audit Log &amp; Compliance
              </div>
              <p style={{ fontSize: 12, color: "var(--ink-muted)", margin: "4px 0 0 0" }}>
                Requires Admin or Owner role in this workspace.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Account & Workspace Grid */}
      <section className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div className="card card-pad">
          <h2 style={{ marginTop: 0, fontSize: 16 }}>Your Account</h2>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              marginTop: 10,
            }}
          >
            <Avatar name={user.name} color={user.avatarColor} size="lg" />
            <div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{user.name}</div>
              <div className="text-muted text-sm">{user.email}</div>
              <div className="text-muted text-sm" style={{ marginTop: 4 }}>
                Workspace Role:{" "}
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "2px 6px",
                    borderRadius: 4,
                    textTransform: "uppercase",
                    background:
                      memberRole === "owner"
                        ? "#fef3c7"
                        : memberRole === "admin"
                        ? "#eff6ff"
                        : "#f3f4f6",
                    color:
                      memberRole === "owner"
                        ? "#92400e"
                        : memberRole === "admin"
                        ? "#1e40af"
                        : "#374151",
                  }}
                >
                  {roleLabel}
                </span>
              </div>
            </div>
          </div>
          <div className="divider" />
          <p className="text-muted text-sm" style={{ marginTop: 0 }}>
            You are currently working within <strong>{org.name}</strong> ({org.plan} tier).
          </p>
          <button className="btn danger" onClick={handleLogout}>
            <IconLogout size={13} />
            Sign out
          </button>
        </div>

        <div className="card card-pad">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <h2 style={{ margin: 0, fontSize: 16 }}>Workspace Metrics</h2>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: "2px 6px",
                borderRadius: 4,
                background: "rgba(122, 18, 41, 0.1)",
                color: "var(--sangria)",
              }}
            >
              {org.name}
            </span>
          </div>

          <div className="grid cols-2" style={{ marginTop: 6, gap: 14 }}>
            <Stat label="Candidates" value={counts.candidates} />
            <Stat label="Placements" value={counts.placements} />
            <Stat label="Interviews" value={counts.interviews} />
            <Stat label="Active Team" value={counts.members} />
            <Stat label="Skills tracked" value={counts.skills} />
            <Stat
              label="Avg per candidate"
              value={
                counts.candidates > 0
                  ? (counts.skills / counts.candidates).toFixed(1)
                  : "0"
              }
            />
          </div>
        </div>
      </section>

      <section className="card card-pad" style={{ marginTop: 20 }}>
        <h2 style={{ marginTop: 0, fontSize: 16 }}>About Hireloop</h2>
        <p className="text-soft text-sm" style={{ maxWidth: 720 }}>
          Hireloop is a multi-tenant placement workspace for boutique recruiting teams that
          staff remote frontend engineers across the US, Canada, and the UK.
          Track every candidate&apos;s framework strengths, timezone overlap, team notes,
          and maintain full enterprise audit compliance.
        </p>
        <div className="cluster" style={{ marginTop: 12 }}>
          <span className="chip">
            <IconStar size={11} /> v2.5 Multi-Tenant
          </span>
          <span className="chip">PostgreSQL + Drizzle</span>
          <span className="chip">RBAC + Audit Trail</span>
          <span className="chip">Next.js App Router</span>
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          color: "var(--text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          fontWeight: 600,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
    </div>
  );
}
