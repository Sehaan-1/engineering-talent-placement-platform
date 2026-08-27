"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function CandidateNav() {
  const pathname = usePathname();

  const links = [
    { href: "/candidate/dashboard", label: "Pipeline & Interviews" },
    { href: "/candidate/profile", label: "My Profile & Skills" },
  ];

  return (
    <nav style={{ display: "flex", alignItems: "center", gap: 6 }}>
      {links.map((link) => {
        const isActive =
          pathname === link.href ||
          (link.href !== "/candidate/dashboard" &&
            pathname.startsWith(link.href));
        return (
          <Link
            key={link.href}
            href={link.href}
            style={{
              padding: "6px 14px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: isActive ? 600 : 500,
              color: isActive ? "var(--sangria)" : "var(--ink-muted)",
              background: isActive
                ? "rgba(122, 18, 41, 0.08)"
                : "transparent",
              textDecoration: "none",
              transition: "all 0.15s ease",
            }}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
