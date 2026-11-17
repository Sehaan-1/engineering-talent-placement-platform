"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { harmonizeColor, initials } from "@/lib/format";
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
  IconShield,
  IconBuilding,
  IconX,
} from "./Icon";

export const TOGGLE_SIDEBAR_EVENT = "hireloop:toggle-sidebar";

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [showNewOrgModal, setShowNewOrgModal] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [creatingOrg, setCreatingOrg] = useState(false);

  useEffect(() => {
    function onToggle() {
      setMobileOpen((prev) => !prev);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileOpen(false);
    }
    window.addEventListener(TOGGLE_SIDEBAR_EVENT, onToggle);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener(TOGGLE_SIDEBAR_EVENT, onToggle);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

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
      setMobileOpen(false);
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
      pushToast(`Workspace "${newOrgName.trim()}" created`, "success");
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
    <>
      <div
        className="sidebar-backdrop"
        data-open={mobileOpen ? "true" : "false"}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />
      <aside
        className="sidebar"
        data-open={mobileOpen ? "true" : "false"}
        aria-label="Primary navigation"
      >
        <div className="sidebar-brand">
          <div className="logo" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
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
              className="brand-sub"
              style={{
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
              title={org?.name || "Talent network"}
            >
              {org?.name || "Talent network"}
            </div>
          </div>
          <button
            type="button"
            className="sidebar-close-btn"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
          >
            <IconX size={16} />
          </button>
        </div>

        {/* Workspace switcher when multiple workspaces exist */}
        {allOrgs.length > 1 && (
          <div style={{ padding: "0 4px" }}>
            <label
              htmlFor="sidebar-org-switcher"
              style={{
                fontSize: 11.5,
                color: "rgba(255, 255, 255, 0.62)",
                display: "block",
                marginBottom: 5,
                fontWeight: 600,
              }}
            >
              Workspace
            </label>
            <select
              id="sidebar-org-switcher"
              value={org?.id}
              onChange={(e) => handleSwitchOrg(Number(e.target.value))}
              disabled={switching}
              style={{
                width: "100%",
                padding: "7px 10px",
                borderRadius: 8,
                background: "rgba(255, 255, 255, 0.1)",
                color: "#ffffff",
                border: "1px solid rgba(255, 255, 255, 0.18)",
                fontSize: 12.5,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              {allOrgs.map((o) => (
                <option
                  key={o.id}
                  value={o.id}
                  style={{ background: "#1a1716", color: "#ffffff" }}
                >
                  {o.name} {o.id === org?.id ? "(current)" : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        <LiveClock />

        <nav
          aria-label="Recruiting"
          style={{ display: "flex", flexDirection: "column", gap: 2 }}
        >
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
                onClick={() => setMobileOpen(false)}
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

        <div>
          <div className="sidebar-section">Workspace</div>
          <nav
            aria-label="Workspace settings"
            style={{ display: "flex", flexDirection: "column", gap: 2 }}
          >
            <Link
              href="/skills"
              onClick={() => setMobileOpen(false)}
              className={`nav-link ${isActive("/skills") ? "active" : ""}`}
            >
              <IconStack size={17} />
              <span>Skill matrix</span>
            </Link>
            <Link
              href="/settings/team"
              onClick={() => setMobileOpen(false)}
              className={`nav-link ${isActive("/settings/team") ? "active" : ""}`}
            >
              <IconBuilding size={17} />
              <span>Team</span>
            </Link>
            {memberRole !== "member" && (
              <Link
                href="/settings/audit"
                onClick={() => setMobileOpen(false)}
                className={`nav-link ${isActive("/settings/audit") ? "active" : ""}`}
              >
                <IconShield size={17} />
                <span>Audit log</span>
              </Link>
            )}
            <Link
              href="/settings"
              onClick={() => setMobileOpen(false)}
              className={`nav-link ${
                isActive("/settings") &&
                !pathname?.startsWith("/settings/team") &&
                !pathname?.startsWith("/settings/audit")
                  ? "active"
                  : ""
              }`}
            >
              <IconSettings size={17} />
              <span>Settings</span>
            </Link>
          </nav>
        </div>

        <div className="sidebar-foot">
          <div
            className="avatar"
            style={{ background: harmonizeColor(user.avatarColor, user.name) }}
            aria-hidden="true"
          >
            {initials(user.name)}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              className="name"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                minWidth: 0,
              }}
            >
              <span
                style={{
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {user.name}
              </span>
              <span className="sidebar-role-pill">{roleLabel}</span>
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
            type="button"
            onClick={handleLogout}
            className="btn ghost sm"
            title="Sign out"
            aria-label="Sign out"
            style={{ color: "rgba(255, 255, 255, 0.72)", padding: "7px 8px" }}
          >
            <IconLogout size={15} />
          </button>
        </div>

        <Modal
          open={showNewOrgModal}
          onClose={() => setShowNewOrgModal(false)}
          title="Create workspace"
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
                {creatingOrg ? "Creating…" : "Create workspace"}
              </button>
            </>
          }
        >
          <form id="create-org-form" onSubmit={handleCreateOrg}>
            <div className="field">
              <label htmlFor="new-org-name">Workspace name</label>
              <input
                id="new-org-name"
                required
                placeholder="e.g. Northstar Talent"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
              />
            </div>
          </form>
        </Modal>
      </aside>
    </>
  );
}
