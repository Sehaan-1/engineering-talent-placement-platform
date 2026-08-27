"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Modal from "@/components/Modal";
import Avatar from "@/components/Avatar";
import StatusBadge from "@/components/StatusBadge";
import { pushToast } from "@/components/ToastHost";
import { formatCurrency, formatTimeAgo } from "@/lib/format";
import {
  IconArrowLeft,
  IconBuilding,
  IconBriefcase,
  IconGlobe,
  IconMail,
  IconLink,
  IconEdit,
  IconPlus,
  IconCheck,
  IconTrash,
  IconUsers,
  IconCalendar,
} from "@/components/Icon";

type ClientType = {
  id: number;
  name: string;
  website?: string | null;
  industry?: string | null;
  contactName: string;
  contactEmail: string;
  logoColor: string;
  createdAt: string;
  updatedAt: string;
};

type ContactType = {
  id: number;
  clientId: number;
  name: string;
  email: string;
  title?: string | null;
  isPrimary: boolean;
  createdAt: string;
};

type PlacementItem = {
  id: number;
  candidateId: number;
  clientId?: number | null;
  clientName: string;
  roleTitle: string;
  status: string;
  valueUsd: number;
  startDate?: string | null;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  candidate: {
    id: number;
    fullName: string;
    headline: string;
    avatarColor: string;
    seniority: string;
    hourlyRateUsd: number;
  };
};

type ShortlistItem = {
  id: number;
  placementId: number;
  accessToken: string;
  sharedAt: string;
  expiresAt: string;
  placement: {
    id: number;
    roleTitle: string;
    status: string;
  };
  candidate: {
    id: number;
    fullName: string;
    avatarColor: string;
  };
};

type LinkablePlacement = {
  id: number;
  roleTitle: string;
  clientName: string;
  candidateName: string;
};

const COLOR_OPTIONS = [
  "#6366f1",
  "#059669",
  "#3b82f6",
  "#8b5cf6",
  "#f59e0b",
  "#ec4899",
  "#7a1229",
  "#0ea5e9",
];

export default function ClientDetailView({
  client: initialClient,
  contacts: initialContacts,
  placements: initialPlacements,
  shortlists: initialShortlists,
  linkablePlacements,
}: {
  client: ClientType;
  contacts: ContactType[];
  placements: PlacementItem[];
  shortlists: ShortlistItem[];
  linkablePlacements: LinkablePlacement[];
}) {
  const router = useRouter();
  const [client, setClient] = useState<ClientType>(initialClient);
  const [contacts, setContacts] = useState<ContactType[]>(initialContacts);
  const [placements, setPlacements] = useState<PlacementItem[]>(initialPlacements);
  const [shortlists, setShortlists] = useState<ShortlistItem[]>(initialShortlists);
  const [activeTab, setActiveTab] = useState<"overview" | "placements" | "shortlists">("overview");

  // Edit Client Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState(client.name);
  const [editWebsite, setEditWebsite] = useState(client.website || "");
  const [editIndustry, setEditIndustry] = useState(client.industry || "");
  const [editContactName, setEditContactName] = useState(client.contactName);
  const [editContactEmail, setEditContactEmail] = useState(client.contactEmail);
  const [editLogoColor, setEditLogoColor] = useState(client.logoColor);
  const [isSavingClient, setIsSavingClient] = useState(false);

  // Add Contact Modal
  const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false);
  const [newContactName, setNewContactName] = useState("");
  const [newContactEmail, setNewContactEmail] = useState("");
  const [newContactTitle, setNewContactTitle] = useState("");
  const [newContactIsPrimary, setNewContactIsPrimary] = useState(false);
  const [isSavingContact, setIsSavingContact] = useState(false);

  // Link Placement Modal
  const [isLinkPlacementModalOpen, setIsLinkPlacementModalOpen] = useState(false);
  const [selectedPlacementToLink, setSelectedPlacementToLink] = useState<number>(
    linkablePlacements[0]?.id || 0
  );
  const [isLinkingPlacement, setIsLinkingPlacement] = useState(false);

  // Share Shortlist Modal
  const [isShortlistModalOpen, setIsShortlistModalOpen] = useState(false);
  const [shortlistPlacementId, setShortlistPlacementId] = useState<number>(
    placements[0]?.id || 0
  );
  const [shortlistExpiresDays, setShortlistExpiresDays] = useState(30);
  const [generatedLink, setGeneratedLink] = useState<{
    url: string;
    token: string;
  } | null>(null);
  const [isShortlistGenerating, setIsShortlistGenerating] = useState(false);

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim() || !editContactName.trim() || !editContactEmail.trim()) {
      pushToast("Please fill in required fields", "error");
      return;
    }

    setIsSavingClient(true);
    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          website: editWebsite.trim() || null,
          industry: editIndustry.trim() || null,
          contactName: editContactName.trim(),
          contactEmail: editContactEmail.trim(),
          logoColor: editLogoColor,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update client");
      }

      const { client: updated } = await res.json();
      setClient(updated);
      pushToast("Client profile updated successfully", "success");
      setIsEditModalOpen(false);
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Update failed", "error");
    } finally {
      setIsSavingClient(false);
    }
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactName.trim() || !newContactEmail.trim()) {
      pushToast("Contact name and email are required", "error");
      return;
    }

    setIsSavingContact(true);
    try {
      const res = await fetch(`/api/clients/${client.id}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newContactName.trim(),
          email: newContactEmail.trim(),
          title: newContactTitle.trim() || null,
          isPrimary: newContactIsPrimary,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to add contact");
      }

      const { contact } = await res.json();
      if (newContactIsPrimary) {
        setContacts([
          contact,
          ...contacts.map((c) => ({ ...c, isPrimary: false })),
        ]);
      } else {
        setContacts([...contacts, contact]);
      }

      pushToast(`Added contact ${contact.name}`, "success");
      setIsAddContactModalOpen(false);
      setNewContactName("");
      setNewContactEmail("");
      setNewContactTitle("");
      setNewContactIsPrimary(false);
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Failed to add contact", "error");
    } finally {
      setIsSavingContact(false);
    }
  };

  const handleLinkPlacement = async () => {
    if (!selectedPlacementToLink) return;
    setIsLinkingPlacement(true);
    try {
      const res = await fetch(`/api/placements/${selectedPlacementToLink}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: client.id,
          clientName: client.name,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to link placement");
      }

      pushToast("Placement associated with client!", "success");
      setIsLinkPlacementModalOpen(false);
      router.refresh();
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Link failed", "error");
    } finally {
      setIsLinkingPlacement(false);
    }
  };

  const handleGenerateShortlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shortlistPlacementId) {
      pushToast("Please select a placement", "error");
      return;
    }

    setIsShortlistGenerating(true);
    try {
      const res = await fetch("/api/shortlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          placementId: shortlistPlacementId,
          clientId: client.id,
          expiresInDays: shortlistExpiresDays,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to generate shortlist");
      }

      const result = await res.json();
      const fullUrl = `${window.location.origin}${result.url}`;
      setGeneratedLink({ url: fullUrl, token: result.accessToken });

      // Add to list
      const matchedPlacement = placements.find((p) => p.id === shortlistPlacementId);
      if (matchedPlacement) {
        setShortlists([
          {
            id: result.shortlist.id,
            placementId: shortlistPlacementId,
            accessToken: result.accessToken,
            sharedAt: result.shortlist.sharedAt,
            expiresAt: result.shortlist.expiresAt,
            placement: {
              id: matchedPlacement.id,
              roleTitle: matchedPlacement.roleTitle,
              status: matchedPlacement.status,
            },
            candidate: {
              id: matchedPlacement.candidate.id,
              fullName: matchedPlacement.candidate.fullName,
              avatarColor: matchedPlacement.candidate.avatarColor,
            },
          },
          ...shortlists,
        ]);
      }

      pushToast("Shortlist link created successfully!", "success");
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Generation failed", "error");
    } finally {
      setIsShortlistGenerating(false);
    }
  };

  const handlePlacementStatusChange = async (
    placementId: number,
    newStatus: string
  ) => {
    try {
      const res = await fetch(`/api/placements/${placementId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error("Status update failed");

      setPlacements((prev) =>
        prev.map((p) =>
          p.id === placementId ? { ...p, status: newStatus } : p
        )
      );
      pushToast("Placement stage updated", "success");
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Update failed", "error");
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      pushToast("Link copied to clipboard!", "success");
    } catch {
      pushToast("Failed to copy link", "error");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Top Breadcrumb & Actions */}
      <div>
        <Link
          href="/clients"
          className="btn ghost sm"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 12 }}
        >
          <IconArrowLeft size={14} /> Back to Clients
        </Link>

        {/* Client Profile Header Banner */}
        <div
          className="card card-pad"
          style={{
            background:
              "linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(245, 248, 247, 0.9))",
            borderLeft: `5px solid ${client.logoColor || "var(--sangria)"}`,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 12,
                  background: client.logoColor || "var(--sangria)",
                  color: "#fff",
                  fontWeight: 800,
                  fontSize: 20,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: `0 6px 16px -4px ${client.logoColor}50`,
                }}
              >
                {client.name.substring(0, 2).toUpperCase()}
              </div>

              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <h1
                    style={{
                      fontSize: 24,
                      fontWeight: 800,
                      color: "var(--ink)",
                      margin: 0,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {client.name}
                  </h1>
                  {client.industry ? (
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "var(--ink-muted)",
                        background: "var(--pebble-soft)",
                        padding: "2px 8px",
                        borderRadius: 6,
                      }}
                    >
                      {client.industry}
                    </span>
                  ) : null}
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    fontSize: 13,
                    color: "var(--ink-muted)",
                    marginTop: 4,
                    flexWrap: "wrap",
                  }}
                >
                  {client.website ? (
                    <a
                      href={client.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: "var(--sangria)",
                        textDecoration: "none",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        fontWeight: 500,
                      }}
                    >
                      <IconGlobe size={13} />
                      <span>{client.website.replace(/^https?:\/\//, "")}</span>
                    </a>
                  ) : null}
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <IconMail size={13} />
                    <span>{client.contactEmail}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                type="button"
                className="btn sm"
                onClick={() => setIsEditModalOpen(true)}
              >
                <IconEdit size={14} /> Edit Client
              </button>
              <button
                type="button"
                className="btn primary sm"
                onClick={() => {
                  setGeneratedLink(null);
                  if (placements.length > 0) {
                    setShortlistPlacementId(placements[0].id);
                  }
                  setIsShortlistModalOpen(true);
                }}
              >
                <IconLink size={14} /> Share Shortlist
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid var(--pebble-deep)",
          gap: 24,
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab("overview")}
          style={{
            padding: "10px 4px",
            background: "transparent",
            border: "none",
            borderBottom:
              activeTab === "overview"
                ? "2px solid var(--sangria)"
                : "2px solid transparent",
            color: activeTab === "overview" ? "var(--sangria)" : "var(--ink-muted)",
            fontWeight: 700,
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          Overview & Contacts ({contacts.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("placements")}
          style={{
            padding: "10px 4px",
            background: "transparent",
            border: "none",
            borderBottom:
              activeTab === "placements"
                ? "2px solid var(--sangria)"
                : "2px solid transparent",
            color:
              activeTab === "placements" ? "var(--sangria)" : "var(--ink-muted)",
            fontWeight: 700,
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          Active Placements ({placements.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("shortlists")}
          style={{
            padding: "10px 4px",
            background: "transparent",
            border: "none",
            borderBottom:
              activeTab === "shortlists"
                ? "2px solid var(--sangria)"
                : "2px solid transparent",
            color:
              activeTab === "shortlists" ? "var(--sangria)" : "var(--ink-muted)",
            fontWeight: 700,
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          Shortlist Links ({shortlists.length})
        </button>
      </div>

      {/* TAB 1: OVERVIEW & CONTACTS */}
      {activeTab === "overview" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div className="card card-pad">
            <div className="section-title">
              <h2>Client Contact Roster</h2>
              <button
                type="button"
                className="btn primary sm"
                onClick={() => setIsAddContactModalOpen(true)}
              >
                <IconPlus size={13} /> Add Contact
              </button>
            </div>

            {contacts.length === 0 ? (
              <div style={{ padding: "24px", textAlign: "center", color: "var(--ink-muted)" }}>
                No extra contacts added yet.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {contacts.map((contact) => (
                  <div
                    key={contact.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 16px",
                      background: "var(--pebble-soft)",
                      borderRadius: 10,
                      fontSize: 13,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: "50%",
                          background: contact.isPrimary
                            ? "var(--jade-soft)"
                            : "var(--pebble-deep)",
                          color: contact.isPrimary
                            ? "var(--jade-deep)"
                            : "var(--ink-soft)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 700,
                          fontSize: 13,
                        }}
                      >
                        {contact.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <strong style={{ color: "var(--ink)" }}>{contact.name}</strong>
                          {contact.isPrimary ? (
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                color: "var(--jade-deep)",
                                background: "var(--jade-soft)",
                                padding: "2px 6px",
                                borderRadius: 4,
                                textTransform: "uppercase",
                              }}
                            >
                              Primary Contact
                            </span>
                          ) : null}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--ink-muted)" }}>
                          {contact.title || "Hiring Team Member"}
                        </div>
                      </div>
                    </div>

                    <a
                      href={`mailto:${contact.email}`}
                      className="btn ghost sm"
                      style={{ color: "var(--sangria)", fontWeight: 600 }}
                    >
                      <IconMail size={13} /> {contact.email}
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* TAB 2: PLACEMENTS */}
      {activeTab === "placements" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div className="card card-pad">
            <div className="section-title">
              <h2>Associated Candidates & Placements</h2>
              {linkablePlacements.length > 0 ? (
                <button
                  type="button"
                  className="btn sm"
                  onClick={() => setIsLinkPlacementModalOpen(true)}
                >
                  <IconPlus size={13} /> Link Existing Placement
                </button>
              ) : null}
            </div>

            {placements.length === 0 ? (
              <div style={{ padding: "32px", textAlign: "center", color: "var(--ink-muted)" }}>
                <p style={{ margin: "0 0 12px" }}>No candidate placements associated with {client.name} yet.</p>
                {linkablePlacements.length > 0 ? (
                  <button
                    type="button"
                    className="btn primary sm"
                    onClick={() => setIsLinkPlacementModalOpen(true)}
                  >
                    Link Candidate Placement
                  </button>
                ) : null}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {placements.map((pl) => (
                  <div
                    key={pl.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "16px",
                      background: "var(--pebble-soft)",
                      borderRadius: 12,
                      gap: 16,
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <Avatar
                        name={pl.candidate.fullName}
                        color={pl.candidate.avatarColor}
                        size="md"
                      />
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <Link
                            href={`/candidates/${pl.candidate.id}`}
                            style={{
                              fontWeight: 700,
                              fontSize: 15,
                              color: "var(--ink)",
                              textDecoration: "none",
                            }}
                          >
                            {pl.candidate.fullName}
                          </Link>
                          <StatusBadge kind="seniority" value={pl.candidate.seniority} size="sm" />
                        </div>
                        <div style={{ fontSize: 13, color: "var(--ink-muted)", marginTop: 2 }}>
                          Role: <strong>{pl.roleTitle}</strong> · ${pl.candidate.hourlyRateUsd}/hr
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <select
                        className="search"
                        style={{
                          padding: "6px 10px",
                          borderRadius: 8,
                          fontSize: 12,
                          border: "1px solid var(--pebble-deep)",
                          background: "#fff",
                        }}
                        value={pl.status}
                        onChange={(e) => handlePlacementStatusChange(pl.id, e.target.value)}
                      >
                        <option value="sourced">Sourced</option>
                        <option value="screening">Screening</option>
                        <option value="submitted">Submitted</option>
                        <option value="interviewing">Interviewing</option>
                        <option value="offer">Offer</option>
                        <option value="placed">Placed</option>
                        <option value="archived">Archived</option>
                      </select>

                      <button
                        type="button"
                        className="btn sm"
                        onClick={() => {
                          setShortlistPlacementId(pl.id);
                          setGeneratedLink(null);
                          setIsShortlistModalOpen(true);
                        }}
                        title="Generate client review link"
                      >
                        <IconLink size={13} /> Share Link
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* TAB 3: SHORTLISTS */}
      {activeTab === "shortlists" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div className="card card-pad">
            <div className="section-title">
              <h2>Shared Candidate Review Links</h2>
              <button
                type="button"
                className="btn primary sm"
                onClick={() => {
                  setGeneratedLink(null);
                  if (placements.length > 0) {
                    setShortlistPlacementId(placements[0].id);
                  }
                  setIsShortlistModalOpen(true);
                }}
              >
                <IconPlus size={13} /> Generate New Shortlist Link
              </button>
            </div>

            {shortlists.length === 0 ? (
              <div style={{ padding: "32px", textAlign: "center", color: "var(--ink-muted)" }}>
                No shortlist review links generated for {client.name} yet.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {shortlists.map((sl) => {
                  const isExpired = new Date(sl.expiresAt) < new Date();
                  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/shortlist/${sl.accessToken}` : `/shortlist/${sl.accessToken}`;
                  return (
                    <div
                      key={sl.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "16px",
                        background: isExpired ? "var(--ruby-soft)" : "var(--pebble-soft)",
                        borderRadius: 12,
                        gap: 16,
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        <Avatar
                          name={sl.candidate.fullName}
                          color={sl.candidate.avatarColor}
                          size="sm"
                        />
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <strong style={{ fontSize: 14, color: "var(--ink)" }}>
                              {sl.candidate.fullName}
                            </strong>
                            <span>— {sl.placement.roleTitle}</span>
                            <StatusBadge kind="milestone" value={sl.placement.status} size="sm" />
                          </div>
                          <div style={{ fontSize: 12, color: "var(--ink-muted)", marginTop: 2 }}>
                            Shared {formatTimeAgo(sl.sharedAt)} ·{" "}
                            {isExpired ? (
                              <span style={{ color: "var(--ruby)", fontWeight: 600 }}>
                                Expired {new Date(sl.expiresAt).toLocaleDateString()}
                              </span>
                            ) : (
                              <span>
                                Valid until {new Date(sl.expiresAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <button
                          type="button"
                          className="btn sm"
                          onClick={() => copyToClipboard(shareUrl)}
                        >
                          <IconLink size={13} /> Copy Link
                        </button>
                        <a
                          href={`/shortlist/${sl.accessToken}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn ghost sm"
                        >
                          Open Portal ↗
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Edit Client Modal */}
      <Modal
        open={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Client Profile"
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button
              type="button"
              className="btn ghost sm"
              onClick={() => setIsEditModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn primary sm"
              onClick={handleUpdateClient}
              disabled={isSavingClient}
            >
              {isSavingClient ? "Saving..." : "Save Changes"}
            </button>
          </div>
        }
      >
        <form onSubmit={handleUpdateClient} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
              Company Name
            </label>
            <input
              type="text"
              className="search"
              style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--pebble-deep)" }}
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              required
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                Industry
              </label>
              <input
                type="text"
                className="search"
                style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--pebble-deep)" }}
                value={editIndustry}
                onChange={(e) => setEditIndustry(e.target.value)}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                Website
              </label>
              <input
                type="url"
                className="search"
                style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--pebble-deep)" }}
                value={editWebsite}
                onChange={(e) => setEditWebsite(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                Primary Contact Name
              </label>
              <input
                type="text"
                className="search"
                style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--pebble-deep)" }}
                value={editContactName}
                onChange={(e) => setEditContactName(e.target.value)}
                required
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                Primary Contact Email
              </label>
              <input
                type="email"
                className="search"
                style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--pebble-deep)" }}
                value={editContactEmail}
                onChange={(e) => setEditContactEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
              Brand Accent Color
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setEditLogoColor(c)}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: c,
                    border: editLogoColor === c ? "3px solid var(--ink)" : "2px solid #fff",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
                    cursor: "pointer",
                  }}
                />
              ))}
            </div>
          </div>
        </form>
      </Modal>

      {/* Add Contact Modal */}
      <Modal
        open={isAddContactModalOpen}
        onClose={() => setIsAddContactModalOpen(false)}
        title="Add Client Contact"
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button
              type="button"
              className="btn ghost sm"
              onClick={() => setIsAddContactModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn primary sm"
              onClick={handleAddContact}
              disabled={isSavingContact}
            >
              {isSavingContact ? "Saving..." : "Save Contact"}
            </button>
          </div>
        }
      >
        <form onSubmit={handleAddContact} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
              Full Name <span style={{ color: "var(--ruby)" }}>*</span>
            </label>
            <input
              type="text"
              className="search"
              style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--pebble-deep)" }}
              value={newContactName}
              onChange={(e) => setNewContactName(e.target.value)}
              placeholder="e.g. John Doe"
              required
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
              Email Address <span style={{ color: "var(--ruby)" }}>*</span>
            </label>
            <input
              type="email"
              className="search"
              style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--pebble-deep)" }}
              value={newContactEmail}
              onChange={(e) => setNewContactEmail(e.target.value)}
              placeholder="j.doe@company.com"
              required
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
              Job Title / Function
            </label>
            <input
              type="text"
              className="search"
              style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--pebble-deep)" }}
              value={newContactTitle}
              onChange={(e) => setNewContactTitle(e.target.value)}
              placeholder="e.g. Engineering Manager, Tech Recruiter"
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
            <input
              type="checkbox"
              id="isPrimaryContact"
              checked={newContactIsPrimary}
              onChange={(e) => setNewContactIsPrimary(e.target.checked)}
            />
            <label htmlFor="isPrimaryContact" style={{ fontSize: 13, color: "var(--ink)" }}>
              Set as primary hiring contact
            </label>
          </div>
        </form>
      </Modal>

      {/* Link Existing Placement Modal */}
      <Modal
        open={isLinkPlacementModalOpen}
        onClose={() => setIsLinkPlacementModalOpen(false)}
        title="Associate Existing Placement with Client"
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button
              type="button"
              className="btn ghost sm"
              onClick={() => setIsLinkPlacementModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn primary sm"
              onClick={handleLinkPlacement}
              disabled={isLinkingPlacement || linkablePlacements.length === 0}
            >
              {isLinkingPlacement ? "Linking..." : "Associate Placement"}
            </button>
          </div>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <p style={{ fontSize: 13, color: "var(--ink-muted)", margin: 0 }}>
            Select an existing candidate placement to associate with{" "}
            <strong>{client.name}</strong>.
          </p>

          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
              Placement
            </label>
            <select
              className="search"
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid var(--pebble-deep)",
                background: "#fff",
                color: "var(--ink)",
              }}
              value={selectedPlacementToLink}
              onChange={(e) => setSelectedPlacementToLink(Number(e.target.value))}
            >
              {linkablePlacements.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.candidateName} — {p.roleTitle} (Currently: {p.clientName})
                </option>
              ))}
            </select>
          </div>
        </div>
      </Modal>

      {/* Generate Shortlist Modal */}
      <Modal
        open={isShortlistModalOpen}
        onClose={() => {
          setIsShortlistModalOpen(false);
          setGeneratedLink(null);
        }}
        title={`Generate Candidate Shortlist for ${client.name}`}
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button
              type="button"
              className="btn ghost sm"
              onClick={() => setIsShortlistModalOpen(false)}
            >
              Close
            </button>
            {!generatedLink ? (
              <button
                type="button"
                className="btn primary sm"
                onClick={handleGenerateShortlist}
                disabled={isShortlistGenerating || placements.length === 0}
              >
                {isShortlistGenerating ? "Generating..." : "Generate Portal Link"}
              </button>
            ) : (
              <button
                type="button"
                className="btn primary sm"
                onClick={() => copyToClipboard(generatedLink.url)}
              >
                <IconLink size={14} /> Copy Link
              </button>
            )}
          </div>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {generatedLink ? (
            <div
              style={{
                background: "var(--jade-soft)",
                border: "1px solid var(--jade)",
                padding: 16,
                borderRadius: 10,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--jade-deep)", fontWeight: 700 }}>
                <IconCheck size={16} /> Shortlist Portal Link Ready!
              </div>
              <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: 0 }}>
                Your client can review the candidate profile and submit decisions
                at this link:
              </p>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "#fff",
                  padding: "8px 12px",
                  borderRadius: 6,
                  border: "1px solid var(--pebble-deep)",
                }}
              >
                <input
                  type="text"
                  readOnly
                  value={generatedLink.url}
                  style={{
                    flex: 1,
                    border: "none",
                    outline: "none",
                    fontSize: 12,
                    fontFamily: "monospace",
                    color: "var(--ink)",
                    background: "transparent",
                  }}
                />
                <button
                  type="button"
                  className="btn sm primary"
                  onClick={() => copyToClipboard(generatedLink.url)}
                  style={{ padding: "4px 8px", fontSize: 11 }}
                >
                  Copy
                </button>
              </div>
            </div>
          ) : (
            <>
              {placements.length === 0 ? (
                <div style={{ padding: "16px", background: "var(--pebble-soft)", borderRadius: 8, fontSize: 13 }}>
                  Please link at least one candidate placement to {client.name} first.
                </div>
              ) : (
                <>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                      Select Candidate Placement
                    </label>
                    <select
                      className="search"
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: 8,
                        border: "1px solid var(--pebble-deep)",
                        background: "#fff",
                        color: "var(--ink)",
                      }}
                      value={shortlistPlacementId}
                      onChange={(e) => setShortlistPlacementId(Number(e.target.value))}
                    >
                      {placements.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.candidate.fullName} — {p.roleTitle}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                      Link Expiry
                    </label>
                    <select
                      className="search"
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: 8,
                        border: "1px solid var(--pebble-deep)",
                        background: "#fff",
                        color: "var(--ink)",
                      }}
                      value={shortlistExpiresDays}
                      onChange={(e) => setShortlistExpiresDays(Number(e.target.value))}
                    >
                      <option value={7}>7 Days</option>
                      <option value={14}>14 Days</option>
                      <option value={30}>30 Days (Recommended)</option>
                      <option value={90}>90 Days</option>
                    </select>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
