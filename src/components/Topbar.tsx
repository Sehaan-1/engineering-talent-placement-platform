"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import { TOGGLE_SIDEBAR_EVENT } from "./Sidebar";
import {
  IconSearch,
  IconPlus,
  IconBell,
  IconFileText,
  IconInterview,
  IconClock,
  IconPipeline,
  IconUsers,
  IconMenu,
} from "./Icon";

const TITLES: Record<string, { title: string; crumb: string }> = {
  "/dashboard": { title: "Overview", crumb: "Workspace" },
  "/candidates": { title: "Candidates", crumb: "Workspace / Candidates" },
  "/availability": { title: "Availability", crumb: "Workspace / Availability" },
  "/placements": { title: "Placements", crumb: "Workspace / Placements" },
  "/interviews": { title: "Interviews", crumb: "Workspace / Interviews" },
  "/skills": { title: "Skill matrix", crumb: "Workspace / Skills" },
  "/clients": { title: "Clients", crumb: "Workspace / Clients" },
  "/settings/team": { title: "Team", crumb: "Workspace / Settings / Team" },
  "/settings/audit": { title: "Audit log", crumb: "Workspace / Settings / Audit" },
  "/settings": { title: "Settings", crumb: "Workspace / Settings" },
};

interface AppNotification {
  id: number;
  type: string;
  title: string;
  body: string;
  href: string | null;
  read: boolean;
  createdAt: string;
}

function timeAgo(dateString: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(dateString).getTime()) / 1000
  );
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getNotificationIcon(type: string) {
  switch (type) {
    case "interview_scheduled":
      return <IconInterview size={14} style={{ color: "var(--slate)" }} />;
    case "status_changed":
      return <IconPipeline size={14} style={{ color: "var(--jade-deep)" }} />;
    case "availability_changed":
      return <IconClock size={14} style={{ color: "var(--amber)" }} />;
    case "candidate_invited":
      return <IconUsers size={14} style={{ color: "var(--sangria)" }} />;
    case "resume_parsed":
      return <IconFileText size={14} style={{ color: "var(--jade-deep)" }} />;
    default:
      return <IconBell size={14} style={{ color: "var(--ink-soft)" }} />;
  }
}

const POPOVER_EXIT_MS = 130;

export default function Topbar({ orgName }: { orgName?: string } = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const [searchState, setSearchState] = useState<{
    scope: string;
    value: string;
  }>({ scope: pathname ?? "", value: "" });

  const inCandidates = pathname?.startsWith("/candidates") ?? false;
  const q =
    inCandidates || searchState.scope === (pathname ?? "")
      ? searchState.value
      : "";

  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownRendered, setDropdownRendered] = useState(false);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const matchedMeta =
    TITLES[pathname ?? ""] ??
    Object.entries(TITLES).find(([key]) => pathname?.startsWith(key))?.[1] ?? {
      title: "Hireloop",
      crumb: "Workspace",
    };

  const meta = {
    title: matchedMeta.title,
    crumb: orgName
      ? matchedMeta.crumb.replace(/^Workspace/, orgName)
      : matchedMeta.crumb,
  };

  const closeDropdown = useCallback(() => {
    setDropdownOpen(false);
  }, []);

  useEffect(() => {
    if (dropdownOpen || !dropdownRendered) return;
    const t = window.setTimeout(() => setDropdownRendered(false), POPOVER_EXIT_MS);
    return () => window.clearTimeout(t);
  }, [dropdownOpen, dropdownRendered]);

  // Initial notification count & live SSE listener
  useEffect(() => {
    let eventSource: EventSource | null = null;

    async function fetchInitialNotifications() {
      try {
        const res = await fetch("/api/notifications");
        if (res.ok) {
          const data = await res.json();
          setUnreadCount(data.unreadCount || 0);
          setNotifications(data.notifications || []);
        }
      } catch {
        // Ignore transient polling failures
      }
    }

    fetchInitialNotifications();

    try {
      eventSource = new EventSource("/api/notifications/stream");
      eventSource.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (typeof parsed.unreadCount === "number") {
            setUnreadCount(parsed.unreadCount);
          }
          if (Array.isArray(parsed.recent)) {
            setNotifications(parsed.recent);
          }
        } catch {
          // Ignore malformed keepalive events
        }
      };
    } catch {
      // SSE unavailable
    }

    return () => {
      if (eventSource) eventSource.close();
    };
  }, []);

  // Close dropdown on outside pointerdown or Escape
  useEffect(() => {
    if (!dropdownOpen) return;
    function handleOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        closeDropdown();
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeDropdown();
    }
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, [dropdownOpen, closeDropdown]);

  async function handleToggleDropdown() {
    if (dropdownOpen) {
      closeDropdown();
      return;
    }
    setDropdownRendered(true);
    setDropdownOpen(true);
    setLoadingNotifs(true);
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } finally {
      setLoadingNotifs(false);
    }
  }

  async function handleMarkAllAsRead() {
    try {
      const res = await fetch("/api/notifications", { method: "PATCH" });
      if (res.ok) {
        setUnreadCount(0);
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      }
    } catch {
      // Ignore network error
    }
  }

  async function handleClickNotification(notif: AppNotification) {
    if (!notif.read) {
      fetch(`/api/notifications/${notif.id}`, { method: "PATCH" }).catch(
        () => {}
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
      );
    }
    closeDropdown();
    if (notif.href) {
      router.push(notif.href);
    }
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    router.push(
      `/candidates${params.toString() ? `?${params.toString()}` : ""}`
    );
  }

  function openMobileMenu() {
    window.dispatchEvent(new CustomEvent(TOGGLE_SIDEBAR_EVENT));
  }

  return (
    <header className="topbar">
      <button
        type="button"
        className="mobile-menu-btn"
        onClick={openMobileMenu}
        aria-label="Open navigation menu"
      >
        <IconMenu size={18} />
      </button>

      <div className="topbar-heading">
        <div className="crumb">{meta.crumb}</div>
        <div className="title">{meta.title}</div>
      </div>

      <form className="search" onSubmit={submitSearch} role="search">
        <IconSearch size={15} />
        <input
          aria-label="Search candidates or skills"
          placeholder="Search candidates or skills…"
          value={q}
          onChange={(e) =>
            setSearchState({ scope: pathname ?? "", value: e.target.value })
          }
        />
        <kbd aria-hidden="true">Enter</kbd>
      </form>

      <button
        type="button"
        className="btn topbar-mobile-search"
        style={{ padding: "8px 10px" }}
        aria-label="Search candidates"
        onClick={() => router.push("/candidates")}
      >
        <IconSearch size={16} />
      </button>

      {/* Notification bell & popover */}
      <div style={{ position: "relative", flexShrink: 0 }} ref={dropdownRef}>
        <button
          type="button"
          className="btn"
          onClick={handleToggleDropdown}
          aria-expanded={dropdownOpen}
          aria-haspopup="dialog"
          aria-label="Notifications"
          title="Notifications"
          style={{
            position: "relative",
            padding: "8px 10px",
            background: dropdownOpen ? "var(--pebble-soft)" : undefined,
          }}
        >
          <IconBell size={16} />
          {unreadCount > 0 && (
            <span
              style={{
                position: "absolute",
                top: -4,
                right: -4,
                minWidth: 17,
                height: 17,
                padding: "0 4px",
                borderRadius: 999,
                background: "var(--sangria)",
                color: "#ffffff",
                fontSize: 11,
                fontWeight: 700,
                fontVariantNumeric: "tabular-nums",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                lineHeight: 1,
                boxShadow: "0 0 0 2px var(--surface)",
              }}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        {dropdownRendered && (
          <div
            className="notif-popover"
            data-closing={!dropdownOpen ? "true" : undefined}
            role="dialog"
            aria-label="Notifications"
          >
            <div
              style={{
                padding: "12px 16px",
                borderBottom: "1px solid var(--pebble-line)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                background: "var(--pebble-tint)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <strong style={{ fontSize: 13.5, color: "var(--ink)" }}>
                  Notifications
                </strong>
                {unreadCount > 0 && (
                  <span className="badge brand sm">{unreadCount} new</span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: 12,
                    color: "var(--sangria)",
                    fontWeight: 600,
                    cursor: "pointer",
                    padding: "2px 4px",
                  }}
                >
                  Mark all read
                </button>
              )}
            </div>

            <div style={{ overflowY: "auto", maxHeight: 360 }}>
              {loadingNotifs ? (
                <div
                  style={{
                    padding: 24,
                    textAlign: "center",
                    color: "var(--ink-muted)",
                    fontSize: 13,
                  }}
                >
                  Loading notifications…
                </div>
              ) : notifications.length === 0 ? (
                <div
                  style={{
                    padding: "32px 20px",
                    textAlign: "center",
                    color: "var(--ink-muted)",
                    fontSize: 13,
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: "var(--pebble-soft)",
                      color: "var(--ink-muted)",
                      display: "grid",
                      placeItems: "center",
                      margin: "0 auto 10px",
                    }}
                  >
                    <IconBell size={18} />
                  </div>
                  <p
                    style={{
                      margin: "0 0 3px",
                      fontWeight: 600,
                      color: "var(--ink)",
                    }}
                  >
                    All caught up
                  </p>
                  <span style={{ fontSize: 12 }}>
                    Placement and interview updates appear here live.
                  </span>
                </div>
              ) : (
                notifications.map((notif) => (
                  <button
                    key={notif.id}
                    type="button"
                    onClick={() => handleClickNotification(notif)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      fontFamily: "inherit",
                      padding: "12px 16px",
                      border: "none",
                      borderBottom: "1px solid var(--pebble-soft)",
                      background: notif.read
                        ? "transparent"
                        : "var(--sangria-tint)",
                      cursor: "pointer",
                      display: "flex",
                      gap: 10,
                      alignItems: "flex-start",
                      transition: "background 0.14s var(--ease-fade)",
                    }}
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 7,
                        background: "var(--surface)",
                        border: "1px solid var(--pebble-line)",
                        display: "grid",
                        placeItems: "center",
                        flexShrink: 0,
                        marginTop: 1,
                      }}
                    >
                      {getNotificationIcon(notif.type)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 8,
                        }}
                      >
                        <strong
                          style={{
                            fontSize: 13,
                            color: "var(--ink)",
                            fontWeight: notif.read ? 500 : 600,
                          }}
                        >
                          {notif.title}
                        </strong>
                        <span
                          style={{
                            fontSize: 11.5,
                            color: "var(--ink-muted)",
                            flexShrink: 0,
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {timeAgo(notif.createdAt)}
                        </span>
                      </div>
                      <p
                        style={{
                          fontSize: 12,
                          color: "var(--ink-muted)",
                          margin: "2px 0 0",
                          lineHeight: 1.4,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {notif.body}
                      </p>
                    </div>
                    {!notif.read && (
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: "var(--sangria)",
                          marginTop: 7,
                          flexShrink: 0,
                        }}
                        aria-hidden="true"
                      />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <button
        type="button"
        className="btn"
        title="Add candidate"
        aria-label="Add candidate"
        onClick={() => router.push("/candidates?new=1")}
      >
        <IconPlus size={15} />
        <span className="topbar-quick-label">Add candidate</span>
      </button>
    </header>
  );
}
