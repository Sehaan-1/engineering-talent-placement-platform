"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import {
  IconSearch,
  IconBolt,
  IconBell,
  IconCheck,
  IconSparkle,
  IconInterview,
  IconClock,
  IconPipeline,
  IconUsers,
} from "./Icon";

const TITLES: Record<string, { title: string; crumb: string }> = {
  "/dashboard": { title: "Overview", crumb: "Workspace" },
  "/candidates": { title: "Candidates", crumb: "Workspace / Candidates" },
  "/availability": { title: "Availability", crumb: "Workspace / Availability" },
  "/placements": { title: "Placements", crumb: "Workspace / Placements" },
  "/interviews": { title: "Interviews", crumb: "Workspace / Interviews" },
  "/skills": { title: "Skill matrix", crumb: "Workspace / Skills" },
  "/clients": { title: "Clients", crumb: "Workspace / Clients" },
  "/settings/team": { title: "Team Management", crumb: "Workspace / Settings / Team" },
  "/settings/audit": { title: "Audit Log & Compliance", crumb: "Workspace / Settings / Audit" },
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
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
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
      return <IconInterview size={14} style={{ color: "#3b82f6" }} />;
    case "status_changed":
      return <IconPipeline size={14} style={{ color: "#10b981" }} />;
    case "availability_changed":
      return <IconClock size={14} style={{ color: "#f59e0b" }} />;
    case "candidate_invited":
      return <IconUsers size={14} style={{ color: "#8b5cf6" }} />;
    case "resume_parsed":
      return <IconSparkle size={14} style={{ color: "#9333ea" }} />;
    default:
      return <IconBell size={14} style={{ color: "#6366f1" }} />;
  }
}

export default function Topbar({ orgName }: { orgName?: string } = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const [q, setQ] = useState("");

  // Notification state
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
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

  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    if (!pathname?.startsWith("/candidates")) {
      setQ("");
    }
  }

  // Initial notification count & SSE listener
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
      } catch (err) {
        // Ignore background polling errors
      }
    }

    fetchInitialNotifications();

    // Subscribe to SSE stream for live updates
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
          // ignore
        }
      };
    } catch {
      // SSE not supported or network error
    }

    return () => {
      if (eventSource) eventSource.close();
    };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownOpen]);

  async function handleOpenDropdown() {
    setDropdownOpen((prev) => !prev);
    if (!dropdownOpen) {
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
  }

  async function handleMarkAllAsRead() {
    try {
      const res = await fetch("/api/notifications", { method: "PATCH" });
      if (res.ok) {
        setUnreadCount(0);
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleClickNotification(notif: AppNotification) {
    if (!notif.read) {
      fetch(`/api/notifications/${notif.id}`, { method: "PATCH" }).catch(() => {});
      setUnreadCount((c) => Math.max(0, c - 1));
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
      );
    }
    setDropdownOpen(false);
    if (notif.href) {
      router.push(notif.href);
    }
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    router.push(`/candidates${params.toString() ? `?${params.toString()}` : ""}`);
  }

  return (
    <div className="topbar">
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div className="crumb">{meta.crumb}</div>
        <div className="title">{meta.title}</div>
      </div>
      <form className="search" onSubmit={submitSearch}>
        <IconSearch size={15} />
        <input
          placeholder="Search candidates, skills, clients…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <kbd>⏎</kbd>
      </form>

      {/* Notification Bell & Dropdown */}
      <div style={{ position: "relative" }} ref={dropdownRef}>
        <button
          className="btn"
          onClick={handleOpenDropdown}
          style={{
            position: "relative",
            padding: "8px 10px",
            background: dropdownOpen ? "var(--pebble-soft)" : undefined,
          }}
          title="Notifications"
          aria-label="Notifications"
        >
          <IconBell size={16} />
          {unreadCount > 0 && (
            <span
              style={{
                position: "absolute",
                top: -3,
                right: -3,
                minWidth: 16,
                height: 16,
                padding: "0 4px",
                borderRadius: 8,
                background: "var(--sangria, #ef4444)",
                color: "#ffffff",
                fontSize: 10,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                lineHeight: 1,
                boxShadow: "0 0 0 2px var(--surface, #ffffff)",
              }}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        {dropdownOpen && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              right: 0,
              width: 360,
              maxHeight: 440,
              background: "var(--surface, #ffffff)",
              border: "1px solid var(--pebble-line, #e2e8f0)",
              borderRadius: 12,
              boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
              zIndex: 1000,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Dropdown Header */}
            <div
              style={{
                padding: "12px 16px",
                borderBottom: "1px solid var(--pebble-line, #e2e8f0)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "var(--pebble-soft, #f8fafc)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <strong style={{ fontSize: 13, color: "var(--ink)" }}>Notifications</strong>
                {unreadCount > 0 && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      background: "rgba(99, 102, 241, 0.12)",
                      color: "#6366f1",
                      padding: "1px 6px",
                      borderRadius: 10,
                    }}
                  >
                    {unreadCount} new
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: 11,
                    color: "#6366f1",
                    fontWeight: 600,
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  Mark all as read
                </button>
              )}
            </div>

            {/* Notifications List */}
            <div style={{ overflowY: "auto", maxHeight: 360 }}>
              {loadingNotifs ? (
                <div style={{ padding: 24, textAlign: "center", color: "var(--ink-muted)", fontSize: 12 }}>
                  Loading notifications…
                </div>
              ) : notifications.length === 0 ? (
                <div style={{ padding: 32, textAlign: "center", color: "var(--ink-muted)", fontSize: 13 }}>
                  <IconBell size={24} style={{ margin: "0 auto 8px", opacity: 0.4 }} />
                  <p style={{ margin: 0 }}>You&apos;re all caught up!</p>
                  <span style={{ fontSize: 11 }}>New alerts will appear here in real time.</span>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => handleClickNotification(notif)}
                    style={{
                      padding: "12px 16px",
                      borderBottom: "1px solid var(--pebble-line, #f1f5f9)",
                      background: notif.read ? "transparent" : "rgba(99, 102, 241, 0.04)",
                      cursor: "pointer",
                      display: "flex",
                      gap: 10,
                      alignItems: "flex-start",
                      transition: "background 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "var(--pebble-soft, #f8fafc)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = notif.read
                        ? "transparent"
                        : "rgba(99, 102, 241, 0.04)";
                    }}
                  >
                    <div
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 6,
                        background: "var(--surface, #ffffff)",
                        border: "1px solid var(--pebble-line, #e2e8f0)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        marginTop: 2,
                      }}
                    >
                      {getNotificationIcon(notif.type)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
                        <strong
                          style={{
                            fontSize: 12,
                            color: "var(--ink)",
                            fontWeight: notif.read ? 600 : 700,
                          }}
                        >
                          {notif.title}
                        </strong>
                        <span style={{ fontSize: 10, color: "var(--ink-muted)", flexShrink: 0 }}>
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
                          background: "#6366f1",
                          marginTop: 6,
                          flexShrink: 0,
                        }}
                      />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <button
        className="btn"
        style={{ marginLeft: 4 }}
        title="Quick add candidate"
        onClick={() => router.push("/candidates?new=1")}
      >
        <IconBolt size={14} />
        <span>Quick add</span>
      </button>
    </div>
  );
}
