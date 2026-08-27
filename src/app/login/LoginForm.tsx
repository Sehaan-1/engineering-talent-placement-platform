"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const [tab, setTab] = useState<"recruiter" | "candidate">("recruiter");

  // Recruiter form state
  const [email, setEmail] = useState("demo@arena.dev");
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Candidate form state
  const [candidateEmail, setCandidateEmail] = useState("alex.chen@example.com");
  const [magicSent, setMagicSent] = useState(false);
  const [magicLinkUrl, setMagicLinkUrl] = useState<string | null>(null);
  const [magicMessage, setMagicMessage] = useState<string | null>(null);

  async function handleRecruiterSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error ?? "Could not sign in");
      }
      const data = await res.json().catch(() => null);
      if (data?.user?.role === "candidate") {
        router.replace("/candidate/dashboard");
      } else {
        router.replace("/dashboard");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in");
    } finally {
      setBusy(false);
    }
  }

  async function handleCandidateSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    setMagicSent(false);
    setMagicLinkUrl(null);
    try {
      const res = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: candidateEmail }),
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        message?: string;
        magicLink?: string;
        error?: string;
      } | null;

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error ?? "Could not send sign-in link");
      }

      setMagicSent(true);
      setMagicMessage(data.message || "Magic sign-in link dispatched!");
      if (data.magicLink) {
        setMagicLinkUrl(data.magicLink);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send sign-in link");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {/* Role Segmented Tabs */}
      <div
        style={{
          display: "flex",
          background: "var(--pebble-soft)",
          padding: 4,
          borderRadius: 10,
          marginBottom: 20,
          border: "1px solid var(--pebble-line)",
        }}
      >
        <button
          type="button"
          onClick={() => {
            setTab("recruiter");
            setError(null);
          }}
          style={{
            flex: 1,
            padding: "8px 12px",
            fontSize: 13,
            fontWeight: tab === "recruiter" ? 600 : 500,
            borderRadius: 7,
            border: "none",
            background: tab === "recruiter" ? "#ffffff" : "transparent",
            color: tab === "recruiter" ? "var(--ink)" : "var(--ink-muted)",
            boxShadow:
              tab === "recruiter" ? "0 1px 4px rgba(0,0,0,0.06)" : "none",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          Recruiter Sign In
        </button>
        <button
          type="button"
          onClick={() => {
            setTab("candidate");
            setError(null);
          }}
          style={{
            flex: 1,
            padding: "8px 12px",
            fontSize: 13,
            fontWeight: tab === "candidate" ? 600 : 500,
            borderRadius: 7,
            border: "none",
            background: tab === "candidate" ? "#ffffff" : "transparent",
            color: tab === "candidate" ? "var(--ink)" : "var(--ink-muted)",
            boxShadow:
              tab === "candidate" ? "0 1px 4px rgba(0,0,0,0.06)" : "none",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          Candidate Portal ✦
        </button>
      </div>

      {tab === "recruiter" ? (
        <form onSubmit={handleRecruiterSubmit}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error ? <div className="error-text">{error}</div> : null}
          <button
            type="submit"
            className="btn primary"
            style={{ width: "100%", justifyContent: "center", marginTop: 8 }}
            disabled={busy}
          >
            {busy ? "Signing in…" : "Sign in as Recruiter →"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleCandidateSubmit}>
          <div className="field">
            <label htmlFor="candidateEmail">Candidate Email</label>
            <input
              id="candidateEmail"
              type="email"
              autoComplete="email"
              placeholder="e.g. alex.chen@example.com"
              required
              value={candidateEmail}
              onChange={(e) => {
                setCandidateEmail(e.target.value);
                setMagicSent(false);
              }}
            />
            <p style={{ fontSize: 11, color: "var(--ink-muted)", marginTop: 4 }}>
              Enter the email attached to your candidate profile. We'll send you an instant login link.
            </p>
          </div>

          {error ? <div className="error-text">{error}</div> : null}

          {magicSent ? (
            <div
              style={{
                background: "rgba(71, 156, 115, 0.08)",
                border: "1px solid rgba(71, 156, 115, 0.3)",
                borderRadius: 8,
                padding: "14px 16px",
                margin: "12px 0",
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--jade)",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 4,
                }}
              >
                ✓ Magic Link Sent
              </div>
              <p style={{ fontSize: 12, color: "var(--ink-muted)", margin: 0 }}>
                {magicMessage}
              </p>
              {magicLinkUrl ? (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px dashed rgba(71, 156, 115, 0.2)" }}>
                  <span style={{ fontSize: 11, color: "var(--ink-muted)", display: "block", marginBottom: 4 }}>
                    Direct Demo Link:
                  </span>
                  <a
                    href={magicLinkUrl}
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--sangria)",
                      textDecoration: "underline",
                      wordBreak: "break-all",
                    }}
                  >
                    Click to Open Candidate Dashboard →
                  </a>
                </div>
              ) : null}
            </div>
          ) : null}

          <button
            type="submit"
            className="btn primary"
            style={{ width: "100%", justifyContent: "center", marginTop: 8 }}
            disabled={busy}
          >
            {busy ? "Sending link…" : "Email me a sign-in link ⚡"}
          </button>
        </form>
      )}
    </div>
  );
}
