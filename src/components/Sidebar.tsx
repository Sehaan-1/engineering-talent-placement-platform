"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { initials } from "@/lib/format";
import LiveClock from "./LiveClock";
import Modal from "./Modal";
import { pushToast } from "./ToastHost";
import {
  IconDashboard,
  IconUsers,
  IconClock,
  IconPipeline,
  IconBriefcase,
  IconInterview,
  IconStack,
  IconSettings,
  IconLogout,
  IconSparkle,
  IconShield,
  IconBuilding,
  IconPlus,
  IconCheck,
} from "./Icon";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

const PRIMARY: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: <IconDashboard size={17} /> },
  { href: "/candidates", label: "Candidates", icon: <IconUsers size={17} /> },
  { href: "/availability", label: "Availability", icon: <IconClock size={17} /> },
  { href: "/placements", label: "Placements", icon: <IconPipeline size={17} /> },
  { href: "/clients", label: "Clients", icon: <IconBriefcase size={17} /> },
  { href: "/interviews", label: "Interviews", icon: <IconInterview size={17} /> },
];

export default function Sidebar({
  user,
  org,
  memberRole,
  allOrgs = [],
  counts,
}: {
  user: { id: number; name: string; email: string; avatarColor: string };
  org?: { id: number; name: string; plan?: string; logoColor?: string };
  memberRole?: string;
  allOrgs?: Array<{ id: number; name: string; plan?: string; role?: string }>;
  counts: {
    candidates: number;
    interviews: number;
    placements: number;
    clients?: number;
  };
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [switching, setSwitching] = useState(false);
  const [showNewOrgModal, setShowNewOrgModal] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [creatingOrg, setCreatingOrg] = useState(false);

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname?.startsWith(href) ?? false;
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  async function handleSwitchOrg(orgId: number) {
    if (orgId === org?.id || switching) return;
    setSwitching(true);
    try {
      const res = await fetch("/api/org/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId }),
      });
      if (!res.ok) throw new Error("Failed to switch workspace");
      pushToast("Switched workspace", "success");
      router.refresh();
    } catch (err: unknown) {
      pushToast(err instanceof Error ? err.message : "Switch failed", "error");
    } finally {
      setSwitching(false);
    }
  }

  async function handleCreateOrg(e: React.FormEvent) {
    e.preventDefault();
    if (!newOrgName.trim()) return;
    setCreatingOrg(true);
    try {
      const res = await fetch("/api/org/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newOrgName.trim() }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.error || "Failed to create workspace");
      }
      pushToast(`Workspace "${newOrgName.trim()}" created!`, "success");
      setShowNewOrgModal(false);
      setNewOrgName("");
      router.refresh();
    } catch (err: unknown) {
      pushToast(err instanceof Error ? err.message : "Creation failed", "error");
    } finally {
      setCreatingOrg(false);
    }
  }

  const roleLabel =
    memberRole === "owner" ? "Owner" : memberRole === "admin" ? "Admin" : "Member";

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div
          className="logo"
          style={{
            background: org?.logoColor
              ? `linear-gradient(135deg, ${org.logoColor}, #7a1229)`
              : undefined,
          }}
        >
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
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
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="name">Hireloop</div>
          <div
            className="tag"
            style={{
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              color: "rgba(255, 255, 255, 0.75)",
            }}
            title={org?.name || "Talent Network"}
          >
            {org?.name || "Talent Network"}
          </div>
        </div>
      </div>

      {/* Workspace Switcher Bar if multiple workspaces exist */}
      {allOrgs.length > 1 && (
        <div style={{ padding: "0 4px", marginBottom: 6 }}>
          <label
            style={{
              fontSize: 10,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "rgba(255, 255, 255, 0.4)",
              display: "block",
              marginBottom: 4,
              fontWeight: 600,
            }}
          >
            Active Workspace
          </label>
          <select
            value={org?.id}
            onChange={(e) => handleSwitchOrg(Number(e.target.value))}
            disabled={switching}
            style={{
              width: "100%",
              padding: "6px 8px",
              borderRadius: 6,
              background: "rgba(255, 255, 255, 0.08)",
              color: "#ffffff",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            {allOrgs.map((o) => (
              <option key={o.id} value={o.id} style={{ background: "#1e2825", color: "#ffffff" }}>
                {o.name} {o.id === org?.id ? "(Current)" : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      <LiveClock />

      <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {PRIMARY.map((item) => {
          const count =
            item.href === "/candidates"
              ? counts.candidates
              : item.href === "/interviews"
              ? counts.interviews
              : item.href === "/placements"
              ? counts.placements
              : item.href === "/clients"
              ? counts.clients
              : null;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link ${isActive(item.href) ? "active" : ""}`}
            >
              {item.icon}
              <span>{item.label}</span>
              {count != null && count > 0 ? (
                <span className="count">{count}</span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-section">Workspace</div>
      <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Link
          href="/skills"
          className={`nav-link ${isActive("/skills") ? "active" : ""}`}
        >
          <IconStack size={17} />
          <span>Skill matrix</span>
        </Link>
        <Link
          href="/settings/team"
          className={`nav-link ${isActive("/settings/team") ? "active" : ""}`}
        >
          <IconBuilding size={17} />
          <span>Team</span>
        </Link>
        {memberRole !== "member" && (
          <Link
            href="/settings/audit"
            className={`nav-link ${isActive("/settings/audit") ? "active" : ""}`}
          >
            <IconShield size={17} />
            <span>Audit log</span>
          </Link>
        )}
        <Link
          href="/settings"
          className={`nav-link ${isActive("/settings") && !pathname?.startsWith("/settings/team") && !pathname?.startsWith("/settings/audit") ? "active" : ""}`}
        >
          <IconSettings size={17} />
          <span>Settings</span>
        </Link>
      </nav>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 12px",
          borderRadius: 10,
          background:
            "linear-gradient(135deg, rgba(71, 156, 115, 0.15), rgba(71, 156, 115, 0.05))",
          border: "1px solid rgba(71, 156, 115, 0.2)",
          fontSize: 12,
          color: "rgba(255, 255, 255, 0.85)",
        }}
      >
        <IconSparkle size={14} />
        <span style={{ fontWeight: 600 }}>AI coaching</span>
        <span
          style={{
            marginLeft: "auto",
            fontSize: 9,
            background: "var(--jade)",
            color: "#fff",
            padding: "2px 6px",
            borderRadius: 4,
            fontWeight: 700,
            letterSpacing: "0.05em",
          }}
        >
          BETA
        </span>
      </div>

      <div className="sidebar-foot">
        <div className="avatar" style={{ background: user.avatarColor }}>
          {initials(user.name)}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            className="name"
            style={{
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span>{user.name}</span>
            <span
              style={{
                fontSize: 9,
                padding: "1px 5px",
                borderRadius: 4,
                fontWeight: 700,
                textTransform: "uppercase",
                background:
                  memberRole === "owner"
                    ? "rgba(245, 158, 11, 0.2)"
                    : memberRole === "admin"
                    ? "rgba(59, 130, 246, 0.2)"
                    : "rgba(255, 255, 255, 0.15)",
                color:
                  memberRole === "owner"
                    ? "#f59e0b"
                    : memberRole === "admin"
                    ? "#60a5fa"
                    : "rgba(255, 255, 255, 0.8)",
                border: "1px solid currentColor",
              }}
            >
              {roleLabel}
            </span>
          </div>
          <div
            className="email"
            style={{
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {user.email}
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="btn ghost sm"
          title="Sign out"
          style={{ color: "rgba(255, 255, 255, 0.55)" }}
        >
          <IconLogout size={14} />
        </button>
      </div>

      {/* Modal for creating a new workspace */}
      <Modal
        open={showNewOrgModal}
        onClose={() => setShowNewOrgModal(false)}
        title="Create New Workspace"
        footer={
          <>
            <button
              type="button"
              className="btn"
              onClick={() => setShowNewOrgModal(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="create-org-form"
              className="btn primary"
              disabled={creatingOrg}
            >
              {creatingOrg ? "Creating…" : "Create Workspace"}
            </button>
          </>
        }
      >
        <form id="create-org-form" onSubmit={handleCreateOrg}>
          <div className="field">
            <label>Workspace / Agency Name</label>
            <input
              required
              placeholder="e.g. Apex Global Talent"
              value={newOrgName}
              onChange={(e) => setNewOrgName(e.target.value)}
            />
          </div>
        </form>
      </Modal>
    </aside>
  );
}
