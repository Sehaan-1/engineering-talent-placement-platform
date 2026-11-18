import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import LoginForm from "./LoginForm";
import { seedDatabase } from "@/lib/seed";
import HireloopStageshowHero from "@/components/HireloopStageshowHero";
import {
  IconUsers,
  IconGlobe,
  IconPipeline,
  IconStar,
} from "@/components/Icon";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");
  try {
    await seedDatabase();
  } catch {
    // ignore
  }
  return (
    <div className="login-shell">
      <aside className="login-art">
        <div className="layer" style={{ display: "flex", flexDirection: "column", gap: 32, height: "100%", justifyContent: "space-between" }}>
          <div className="brand">
            <div className="logo">
              <svg
                viewBox="0 0 24 24"
                width="22"
                height="22"
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
            <div>
              <div className="name">Hireloop</div>
              <div className="tag">Talent Network</div>
            </div>
          </div>

          <div>
            <h1>Place vetted engineering talent without the noise.</h1>
            <p className="lead" style={{ marginBottom: 16 }}>
              Curated profiles, verified skill matrices, timezone overlap
              matching, and a coaching pipeline for every interview stage —
              built for boutique recruiting teams.
            </p>

            <HireloopStageshowHero />

            <div className="feature-grid">
              <div className="item">
                <div className="icon">
                  <IconUsers size={18} />
                </div>
                <h4>Skill matrix</h4>
                <p>
                  Multi-category skills &amp; proficiencies across engineering domains.
                </p>
              </div>
              <div className="item">
                <div className="icon">
                  <IconGlobe size={18} />
                </div>
                <h4>Timezone overlap</h4>
                <p>Filter talent by US, CA, UK overlap windows.</p>
              </div>
              <div className="item">
                <div className="icon">
                  <IconPipeline size={18} />
                </div>
                <h4>Placement pipeline</h4>
                <p>Sourced → Placed with milestone notes and value tracking.</p>
              </div>
              <div className="item">
                <div className="icon">
                  <IconStar size={18} />
                </div>
                <h4>Coaching</h4>
                <p>Score, feedback, and outcome history for every interview.</p>
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              fontSize: 12,
              color: "rgba(255, 255, 255, 0.6)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  display: "flex",
                  marginRight: 4,
                }}
              >
                {["#7a1229", "#479c73", "#c48a3a", "#5a8db0"].map((c, i) => (
                  <div
                    key={c}
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      background: c,
                      border: "2px solid var(--sangria)",
                      marginLeft: i === 0 ? 0 : -8,
                    }}
                  />
                ))}
              </div>
              <span style={{ fontWeight: 600 }}>40+ boutique agencies</span>
            </div>
            <div
              style={{
                height: 4,
                width: 4,
                borderRadius: "50%",
                background: "rgba(255, 255, 255, 0.3)",
              }}
            />
            <span>US · CA · UK</span>
          </div>
        </div>
      </aside>

      <main className="login-form">
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: -100,
            left: -100,
            width: 320,
            height: 320,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(71, 156, 115, 0.15), transparent 70%)",
            filter: "blur(40px)",
            pointerEvents: "none",
          }}
        />
        <div
          aria-hidden
          style={{
            position: "absolute",
            bottom: -100,
            right: -100,
            width: 320,
            height: 320,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(122, 18, 41, 0.12), transparent 70%)",
            filter: "blur(40px)",
            pointerEvents: "none",
          }}
        />
        <div className="inner">
          <h2>Welcome to Hireloop</h2>
          <p>Sign in to your recruiter workspace or candidate portal.</p>
          <LoginForm />
          <div className="demo">
            <strong>Demo Credentials & Accounts</strong>
            <br />
            Recruiter: <code>demo@arena.dev</code> / <code>demo1234</code>
            <br />
            Candidate Magic Link: <code>alex.chen@example.com</code> or <code>maya.okafor@example.com</code>
            <br />
            <span style={{ color: "var(--ink-muted)" }}>
              Pre-seeded with 8 candidates, 8 placements, 10 interview loops, and client portals.
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
