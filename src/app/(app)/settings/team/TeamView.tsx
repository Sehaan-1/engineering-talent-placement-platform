"use client";

import { useState } from "react";
import Avatar from "@/components/Avatar";
import Modal from "@/components/Modal";
import { pushToast } from "@/components/ToastHost";
import {
  IconUsers,
  IconPlus,
  IconTrash,
  IconMail,
  IconShield,
  IconBuilding,
  IconCheck,
  IconLink,
} from "@/components/Icon";

export type MemberItem = {
  id: number;
  userId: number;
  role: "owner" | "admin" | "member";
  createdAt: string;
  user: {
    id: number;
    name: string;
    email: string;
    avatarColor: string;
  };
};

export type InviteItem = {
  id: number;
  email: string;
  role: "owner" | "admin" | "member";
  expiresAt: string;
  createdAt: string;
  inviterName: string;
  inviteLink: string;
};

export default function TeamView({
  org,
  currentUserId,
  currentUserRole,
  initialMembers,
  initialInvites,
}: {
  org: { id: number; name: string; plan: string; logoColor: string };
  currentUserId: number;
  currentUserRole: string;
  initialMembers: MemberItem[];
  initialInvites: InviteItem[];
}) {
  const [members, setMembers] = useState<MemberItem[]>(initialMembers);
  const [invites, setInvites] = useState<InviteItem[]>(initialInvites);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [sendingInvite, setSendingInvite] = useState(false);
  const [updatingMemberId, setUpdatingMemberId] = useState<number | null>(null);

  const canManage = currentUserRole === "owner" || currentUserRole === "admin";
  const isOwner = currentUserRole === "owner";

  const ownerCount = members.filter((m) => m.role === "owner").length;

  async function handleSendInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setSendingInvite(true);
    try {
      const res = await fetch("/api/org/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: inviteRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to send invitation");
      }

      pushToast(`Invitation sent to ${inviteEmail.trim()}`, "success");
      setInvites((prev) => [data.invite, ...prev]);
      setShowInviteModal(false);
      setInviteEmail("");
      setInviteRole("member");
    } catch (err: unknown) {
      pushToast(err instanceof Error ? err.message : "Failed to invite", "error");
    } finally {
      setSendingInvite(false);
    }
  }

  async function handleRoleChange(memberId: number, newRole: "owner" | "admin" | "member") {
    setUpdatingMemberId(memberId);
    try {
      const res = await fetch(`/api/org/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to update role");
      }

      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
      );
      pushToast("Member role updated", "success");
    } catch (err: unknown) {
      pushToast(err instanceof Error ? err.message : "Role change failed", "error");
    } finally {
      setUpdatingMemberId(null);
    }
  }

  async function handleRemoveMember(member: MemberItem) {
    const isSelf = member.userId === currentUserId;
    const confirmMsg = isSelf
      ? "Are you sure you want to leave this workspace?"
      : `Remove ${member.user.name} (${member.user.email}) from ${org.name}?`;

    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/org/members/${member.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to remove member");
      }

      setMembers((prev) => prev.filter((m) => m.id !== member.id));
      pushToast(`${member.user.name} removed from workspace`, "success");

      if (isSelf) {
        window.location.href = "/dashboard";
      }
    } catch (err: unknown) {
      pushToast(err instanceof Error ? err.message : "Remove failed", "error");
    }
  }

  async function handleRevokeInvite(inviteId: number, email: string) {
    if (!confirm(`Revoke invitation for ${email}?`)) return;

    try {
      const res = await fetch(`/api/org/invites/${inviteId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to revoke invitation");

      setInvites((prev) => prev.filter((inv) => inv.id !== inviteId));
      pushToast(`Revoked invite for ${email}`, "success");
    } catch (err: unknown) {
      pushToast(err instanceof Error ? err.message : "Revoke failed", "error");
    }
  }

  function copyInviteLink(link: string) {
    navigator.clipboard.writeText(link);
    pushToast("Invitation link copied to clipboard", "success");
  }

  return (
    <main className="content fade-in">
      <header className="page-header">
        <div className="meta">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1>Team &amp; Workspace</h1>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                padding: "3px 8px",
                borderRadius: 6,
                background: "rgba(122, 18, 41, 0.12)",
                color: "var(--sangria)",
                border: "1px solid rgba(122, 18, 41, 0.2)",
              }}
            >
              {org.plan} Plan
            </span>
          </div>
          <p>
            Manage recruiters, admins, and permissions in <strong>{org.name}</strong>.
          </p>
        </div>

        {canManage && (
          <button
            className="btn primary"
            onClick={() => setShowInviteModal(true)}
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <IconPlus size={14} />
            Invite Member
          </button>
        )}
      </header>

      {/* Role Summary Banner */}
      <div
        className="card card-pad"
        style={{
          background: "linear-gradient(135deg, #fafbfb 0%, #f3f7f5 100%)",
          marginBottom: 24,
          border: "1px solid #e2ece7",
        }}
      >
        <div className="grid cols-3" style={{ gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "rgba(245, 158, 11, 0.15)",
                color: "#d97706",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <IconShield size={18} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>
                Owner Tier
              </div>
              <div style={{ fontSize: 11, color: "var(--ink-muted)" }}>
                Full workspace authority &amp; billing
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "rgba(59, 130, 246, 0.15)",
                color: "#2563eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <IconBuilding size={18} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>
                Admin Tier
              </div>
              <div style={{ fontSize: 11, color: "var(--ink-muted)" }}>
                Team invites &amp; audit logging
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "rgba(16, 185, 129, 0.15)",
                color: "#059669",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <IconUsers size={18} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>
                Member Tier
              </div>
              <div style={{ fontSize: 11, color: "var(--ink-muted)" }}>
                Candidates, placements, interviews
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Active Members Section */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 16, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
          <IconUsers size={16} />
          Active Members ({members.length})
        </h2>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Member</th>
                <th>Role</th>
                <th>Joined</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => {
                const isSoleOwner = m.role === "owner" && ownerCount <= 1;
                const isSelf = m.userId === currentUserId;

                return (
                  <tr key={m.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <Avatar
                          name={m.user.name}
                          color={m.user.avatarColor}
                          size="md"
                        />
                        <div>
                          <div style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                            <span>{m.user.name}</span>
                            {isSelf && (
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  background: "#f0fdf4",
                                  color: "#16a34a",
                                  padding: "1px 6px",
                                  borderRadius: 4,
                                  border: "1px solid #bbf7d0",
                                }}
                              >
                                You
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 12, color: "var(--ink-muted)" }}>
                            {m.user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      {canManage ? (
                        <select
                          value={m.role}
                          disabled={
                            updatingMemberId === m.id ||
                            isSoleOwner ||
                            (!isOwner && m.role === "owner")
                          }
                          onChange={(e) =>
                            handleRoleChange(
                              m.id,
                              e.target.value as "owner" | "admin" | "member"
                            )
                          }
                          title={isSoleOwner ? "Cannot demote the only owner" : undefined}
                          style={{
                            padding: "4px 8px",
                            borderRadius: 6,
                            border: "1px solid var(--border)",
                            fontSize: 12,
                            fontWeight: 600,
                            background:
                              m.role === "owner"
                                ? "#fef3c7"
                                : m.role === "admin"
                                ? "#eff6ff"
                                : "#f3f4f6",
                            color:
                              m.role === "owner"
                                ? "#92400e"
                                : m.role === "admin"
                                ? "#1e40af"
                                : "#374151",
                            cursor: isSoleOwner ? "not-allowed" : "pointer",
                          }}
                        >
                          {isOwner && <option value="owner">Owner</option>}
                          <option value="admin">Admin</option>
                          <option value="member">Member</option>
                        </select>
                      ) : (
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            padding: "3px 8px",
                            borderRadius: 6,
                            background:
                              m.role === "owner"
                                ? "#fef3c7"
                                : m.role === "admin"
                                ? "#eff6ff"
                                : "#f3f4f6",
                            color:
                              m.role === "owner"
                                ? "#92400e"
                                : m.role === "admin"
                                ? "#1e40af"
                                : "#374151",
                          }}
                        >
                          {m.role.toUpperCase()}
                        </span>
                      )}
                    </td>
                    <td>
                      <span style={{ fontSize: 13, color: "var(--ink-muted)" }}>
                        {new Date(m.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {canManage && (
                        <button
                          className="btn ghost sm"
                          disabled={isSoleOwner || (!isOwner && m.role === "owner")}
                          onClick={() => handleRemoveMember(m)}
                          title={
                            isSoleOwner
                              ? "Cannot remove sole workspace owner"
                              : isSelf
                              ? "Leave workspace"
                              : "Remove member"
                          }
                          style={{ color: isSoleOwner ? "var(--ink-muted)" : "var(--sangria)" }}
                        >
                          <IconTrash size={13} />
                          {isSelf ? "Leave" : "Remove"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Pending Invites Section */}
      {canManage && invites.length > 0 && (
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 16, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <IconMail size={16} />
            Pending Invitations ({invites.length})
          </h2>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Recipient Email</th>
                  <th>Assigned Role</th>
                  <th>Invited By</th>
                  <th>Expires</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invites.map((inv) => (
                  <tr key={inv.id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{inv.email}</div>
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "2px 6px",
                          borderRadius: 4,
                          textTransform: "uppercase",
                          background: inv.role === "admin" ? "#eff6ff" : "#f3f4f6",
                          color: inv.role === "admin" ? "#1e40af" : "#374151",
                        }}
                      >
                        {inv.role}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: 13, color: "var(--ink-muted)" }}>
                        {inv.inviterName}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: 13, color: "var(--ink-muted)" }}>
                        {new Date(inv.expiresAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: 6 }}>
                        <button
                          className="btn ghost sm"
                          onClick={() => copyInviteLink(inv.inviteLink)}
                          title="Copy Invitation URL"
                        >
                          <IconLink size={12} />
                          Copy Link
                        </button>
                        <button
                          className="btn ghost sm"
                          onClick={() => handleRevokeInvite(inv.id, inv.email)}
                          style={{ color: "var(--sangria)" }}
                          title="Revoke Invitation"
                        >
                          <IconTrash size={12} />
                          Revoke
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Invite Member Modal */}
      <Modal
        open={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        title={`Invite Teammate to ${org.name}`}
        footer={
          <>
            <button
              type="button"
              className="btn"
              onClick={() => setShowInviteModal(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="invite-team-form"
              className="btn primary"
              disabled={sendingInvite}
            >
              {sendingInvite ? "Sending Invite…" : "Send Invitation"}
            </button>
          </>
        }
      >
        <form id="invite-team-form" onSubmit={handleSendInvite}>
          <div className="field">
            <label>Teammate Email</label>
            <input
              type="email"
              required
              placeholder="e.g. sarah.recruiter@agency.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
          </div>

          <div className="field">
            <label>Workspace Role</label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as "admin" | "member")}
            >
              <option value="member">Member — Manage candidates, placements, clients</option>
              <option value="admin">Admin — Manage team, view audit logs &amp; exports</option>
            </select>
          </div>

          <p style={{ fontSize: 12, color: "var(--ink-muted)", marginTop: 8 }}>
            An invitation link will be dispatched via email (and printed in development console). The link will remain valid for 7 days.
          </p>
        </form>
      </Modal>
    </main>
  );
}
