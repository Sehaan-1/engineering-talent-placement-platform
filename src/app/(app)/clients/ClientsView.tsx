"use client";

import { useState } from "react";
import Link from "next/link";
import Modal from "@/components/Modal";
import { pushToast } from "@/components/ToastHost";
import { formatTimeAgo } from "@/lib/format";
import {
  IconPlus,
  IconSearch,
  IconBuilding,
  IconBriefcase,
  IconGlobe,
  IconMail,
  IconLink,
  IconArrowRight,
  IconUsers,
  IconCheck,
} from "@/components/Icon";

export type ClientItem = {
  id: number;
  name: string;
  website?: string | null;
  industry?: string | null;
  contactName: string;
  contactEmail: string;
  logoColor: string;
  createdAt: string;
  updatedAt: string;
  placementCount: number;
  activePlacementCount: number;
};

export type PlacementOption = {
  id: number;
  roleTitle: string;
  clientName: string;
  candidateName: string;
};

const COLOR_OPTIONS = [
  "#6366f1", // Indigo
  "#059669", // Emerald
  "#3b82f6", // Blue
  "#8b5cf6", // Purple
  "#f59e0b", // Amber
  "#ec4899", // Pink
  "#7a1229", // Sangria
  "#0ea5e9", // Sky
];

export default function ClientsView({
  initialClients,
  allPlacements,
  activeShortlistsCount,
}: {
  initialClients: ClientItem[];
  allPlacements: PlacementOption[];
  activeShortlistsCount: number;
}) {
  const [clients, setClients] = useState<ClientItem[]>(initialClients);
  const [search, setSearch] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isShortlistModalOpen, setIsShortlistModalOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);

  // New Client Form State
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [industry, setIndustry] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [logoColor, setLogoColor] = useState("#6366f1");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Shortlist Form State
  const [shortlistPlacementId, setShortlistPlacementId] = useState<number>(
    allPlacements[0]?.id || 0
  );
  const [shortlistExpiresDays, setShortlistExpiresDays] = useState(30);
  const [generatedLink, setGeneratedLink] = useState<{
    url: string;
    token: string;
  } | null>(null);
  const [isShortlistGenerating, setIsShortlistGenerating] = useState(false);

  const filteredClients = clients.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.industry && c.industry.toLowerCase().includes(q)) ||
      c.contactName.toLowerCase().includes(q) ||
      c.contactEmail.toLowerCase().includes(q)
    );
  });

  const totalPlacements = clients.reduce((acc, c) => acc + c.placementCount, 0);
  const activePlacements = clients.reduce(
    (acc, c) => acc + c.activePlacementCount,
    0
  );

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !contactName.trim() || !contactEmail.trim()) {
      pushToast("Please fill in all required fields.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          website: website.trim() || null,
          industry: industry.trim() || null,
          contactName: contactName.trim(),
          contactEmail: contactEmail.trim(),
          logoColor,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create client");
      }

      const { client } = await res.json();
      setClients([
        {
          ...client,
          createdAt: client.createdAt,
          updatedAt: client.updatedAt,
          placementCount: 0,
          activePlacementCount: 0,
        },
        ...clients,
      ]);

      pushToast(`Client "${client.name}" created successfully!`, "success");
      setIsCreateModalOpen(false);
      // Reset
      setName("");
      setWebsite("");
      setIndustry("");
      setContactName("");
      setContactEmail("");
    } catch (err) {
      pushToast(
        err instanceof Error ? err.message : "Error creating client",
        "error"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateShortlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shortlistPlacementId) {
      pushToast("Please select a placement to share", "error");
      return;
    }

    setIsShortlistGenerating(true);
    try {
      const res = await fetch("/api/shortlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          placementId: shortlistPlacementId,
          clientId: selectedClientId || undefined,
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
      pushToast("Shareable shortlist link generated!", "success");
    } catch (err) {
      pushToast(
        err instanceof Error ? err.message : "Failed to generate shortlist",
        "error"
      );
    } finally {
      setIsShortlistGenerating(false);
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
      {/* Header & Controls */}
      <div className="page-header">
        <div className="meta">
          <h1>Client Management & Portal</h1>
          <p>
            Manage hiring partners, client contacts, placements, and generate
            token-gated shortlist review portals.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            className="btn sm"
            onClick={() => {
              setSelectedClientId(null);
              setGeneratedLink(null);
              setIsShortlistModalOpen(true);
            }}
          >
            <IconLink size={14} /> Quick Share Shortlist
          </button>
          <button
            type="button"
            className="btn primary sm"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <IconPlus size={14} /> Add Client
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid cols-3">
        <div className="card card-pad">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: "var(--sangria-soft)",
                color: "var(--sangria)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <IconBuilding size={20} />
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "var(--ink)" }}>
                {clients.length}
              </div>
              <div style={{ fontSize: 12, color: "var(--ink-muted)", fontWeight: 500 }}>
                Hiring Partner Companies
              </div>
            </div>
          </div>
        </div>

        <div className="card card-pad">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: "var(--jade-soft)",
                color: "var(--jade-deep)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <IconBriefcase size={20} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <span style={{ fontSize: 24, fontWeight: 800, color: "var(--ink)" }}>
                  {activePlacements}
                </span>
                <span style={{ fontSize: 13, color: "var(--ink-faint)" }}>
                  / {totalPlacements} total
                </span>
              </div>
              <div style={{ fontSize: 12, color: "var(--ink-muted)", fontWeight: 500 }}>
                Active Client Placements
              </div>
            </div>
          </div>
        </div>

        <div className="card card-pad">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: "var(--slate-soft)",
                color: "var(--slate)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <IconLink size={20} />
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "var(--ink)" }}>
                {activeShortlistsCount}
              </div>
              <div style={{ fontSize: 12, color: "var(--ink-muted)", fontWeight: 500 }}>
                Active Shortlist Links Shared
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="card card-pad-sm"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div className="topbar search" style={{ margin: 0, flex: 1, minWidth: 260 }}>
          <IconSearch size={15} />
          <input
            type="text"
            placeholder="Search by company, industry, or contact..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search ? (
            <button
              type="button"
              className="btn ghost sm"
              style={{ padding: "2px 6px" }}
              onClick={() => setSearch("")}
            >
              ✕
            </button>
          ) : null}
        </div>

        <div style={{ fontSize: 12, color: "var(--ink-muted)", fontWeight: 500 }}>
          Showing {filteredClients.length} of {clients.length} clients
        </div>
      </div>

      {/* Clients Grid */}
      {filteredClients.length === 0 ? (
        <div
          className="card card-pad"
          style={{ textAlign: "center", padding: "48px 24px" }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: "var(--pebble-soft)",
              color: "var(--ink-muted)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <IconBuilding size={24} />
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 6px" }}>
            No clients found
          </h3>
          <p style={{ fontSize: 13, color: "var(--ink-muted)", margin: "0 0 16px" }}>
            {search
              ? `No clients matched your search "${search}".`
              : "Get started by adding your first client company."}
          </p>
          <button
            type="button"
            className="btn primary sm"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <IconPlus size={14} /> Add New Client
          </button>
        </div>
      ) : (
        <div className="grid cols-2">
          {filteredClients.map((client) => (
            <div
              key={client.id}
              className="card card-pad"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 14,
                borderTop: `4px solid ${client.logoColor || "var(--sangria)"}`,
                transition: "transform 0.18s ease, box-shadow 0.18s ease",
              }}
            >
              {/* Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 10,
                      background: client.logoColor || "var(--sangria)",
                      color: "#fff",
                      fontWeight: 800,
                      fontSize: 16,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: `0 4px 12px -2px ${client.logoColor}40`,
                    }}
                  >
                    {client.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3
                      style={{
                        fontSize: 17,
                        fontWeight: 700,
                        margin: "0 0 2px",
                        color: "var(--ink)",
                      }}
                    >
                      <Link
                        href={`/clients/${client.id}`}
                        style={{ textDecoration: "none", color: "inherit" }}
                      >
                        {client.name}
                      </Link>
                    </h3>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--ink-muted)",
                        fontWeight: 500,
                      }}
                    >
                      {client.industry || "General Technology"}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 11,
                    background:
                      client.activePlacementCount > 0
                        ? "var(--jade-soft)"
                        : "var(--pebble-soft)",
                    color:
                      client.activePlacementCount > 0
                        ? "var(--jade-deep)"
                        : "var(--ink-muted)",
                    padding: "3px 8px",
                    borderRadius: 6,
                    fontWeight: 700,
                  }}
                >
                  <IconBriefcase size={12} />
                  <span>
                    {client.activePlacementCount} active placement
                    {client.activePlacementCount !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>

              {/* Primary Contact Info */}
              <div
                style={{
                  background: "var(--pebble-soft)",
                  padding: "10px 12px",
                  borderRadius: 8,
                  fontSize: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <IconUsers size={13} style={{ color: "var(--ink-muted)" }} />
                  <span style={{ fontWeight: 600, color: "var(--ink)" }}>
                    {client.contactName}
                  </span>
                </div>
                <a
                  href={`mailto:${client.contactEmail}`}
                  style={{
                    color: "var(--sangria)",
                    textDecoration: "none",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    fontWeight: 500,
                  }}
                >
                  <IconMail size={12} />
                  <span>{client.contactEmail}</span>
                </a>
              </div>

              {/* Footer row */}
              <div
                style={{
                  marginTop: "auto",
                  paddingTop: 10,
                  borderTop: "1px solid var(--pebble-soft)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: 12,
                }}
              >
                <span style={{ color: "var(--ink-faint)" }}>
                  Updated {formatTimeAgo(client.updatedAt)}
                </span>

                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <button
                    type="button"
                    className="btn ghost sm"
                    onClick={() => {
                      setSelectedClientId(client.id);
                      setGeneratedLink(null);
                      setIsShortlistModalOpen(true);
                    }}
                    title="Generate candidate shortlist link"
                  >
                    <IconLink size={13} /> Share Link
                  </button>
                  <Link href={`/clients/${client.id}`} className="btn sm">
                    Details <IconArrowRight size={13} />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Client Modal */}
      <Modal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Add New Hiring Client"
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button
              type="button"
              className="btn ghost sm"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn primary sm"
              onClick={handleCreateClient}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Save Client"}
            </button>
          </div>
        }
      >
        <form onSubmit={handleCreateClient} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
              Company Name <span style={{ color: "var(--ruby)" }}>*</span>
            </label>
            <input
              type="text"
              className="search"
              style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--pebble-deep)" }}
              placeholder="e.g. Acme Corp"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                Industry / Vertical
              </label>
              <input
                type="text"
                className="search"
                style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--pebble-deep)" }}
                placeholder="e.g. Fintech, HealthTech"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
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
                placeholder="https://example.com"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                Primary Contact Name <span style={{ color: "var(--ruby)" }}>*</span>
              </label>
              <input
                type="text"
                className="search"
                style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--pebble-deep)" }}
                placeholder="e.g. Sarah Connor"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                Primary Contact Email <span style={{ color: "var(--ruby)" }}>*</span>
              </label>
              <input
                type="email"
                className="search"
                style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--pebble-deep)" }}
                placeholder="s.connor@example.com"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
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
                  onClick={() => setLogoColor(c)}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: c,
                    border: logoColor === c ? "3px solid var(--ink)" : "2px solid #fff",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
                    cursor: "pointer",
                  }}
                />
              ))}
            </div>
          </div>
        </form>
      </Modal>

      {/* Quick Shortlist Generator Modal */}
      <Modal
        open={isShortlistModalOpen}
        onClose={() => {
          setIsShortlistModalOpen(false);
          setGeneratedLink(null);
        }}
        title="Generate Candidate Shortlist Portal Link"
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
                disabled={isShortlistGenerating || allPlacements.length === 0}
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
                Clients can access this link without a password to review candidate
                qualifications, submit decisions, or request interviews.
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
              <p style={{ fontSize: 13, color: "var(--ink-muted)", margin: 0 }}>
                Select an active candidate placement to create a secure, branded
                review link for your client.
              </p>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  Candidate Placement
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
                  {allPlacements.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.candidateName} — {p.roleTitle} ({p.clientName})
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
        </div>
      </Modal>
    </div>
  );
}
