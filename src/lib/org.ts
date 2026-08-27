import { cookies } from "next/headers";
import { db } from "@/db";
import {
  organizations,
  orgMembers,
  type Organization,
  type OrgMember,
  type User,
} from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { ensureUserHasOrg } from "@/lib/seed";

export const ORG_COOKIE = "etn_active_org";

export type OrgContext = {
  user: User;
  org: Organization;
  membership: OrgMember;
  /** All orgs the user belongs to, for the workspace switcher. */
  allOrgs: Array<Organization & { role: string }>;
};

/**
 * Resolves the active organisation context for the current request.
 * - Reads `etn_active_org` cookie for explicit workspace selection.
 * - Falls back to the user's first (owner) org.
 * - Auto-provisions a default org if none exists.
 *
 * Throws "UNAUTHORIZED" if no session, "FORBIDDEN" if the user is not
 * a member of the requested org.
 */
export async function getOrgContext(requestedOrgId?: number): Promise<OrgContext> {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");

  // Auto-provision org if user has none
  await ensureUserHasOrg(user.id, user.name);

  // Determine active org ID from: explicit arg -> cookie -> first membership
  const jar = await cookies();
  const cookieOrgId = jar.get(ORG_COOKIE)?.value;
  const targetOrgId =
    requestedOrgId ??
    (cookieOrgId && !isNaN(Number(cookieOrgId)) ? Number(cookieOrgId) : undefined);

  // Fetch all memberships for this user
  const memberships = await db
    .select({ org: organizations, membership: orgMembers })
    .from(orgMembers)
    .innerJoin(organizations, eq(organizations.id, orgMembers.orgId))
    .where(eq(orgMembers.userId, user.id));

  if (memberships.length === 0) {
    throw new Error("NO_ORG");
  }

  const allOrgs = memberships.map((m) => ({ ...m.org, role: m.membership.role }));

  // Resolve active membership
  let active = targetOrgId
    ? memberships.find((m) => m.org.id === targetOrgId)
    : memberships.find((m) => m.membership.role === "owner") ?? memberships[0];

  if (!active) {
    // If targeted org cookie was invalid or user lost membership, fallback to first available
    active = memberships.find((m) => m.membership.role === "owner") ?? memberships[0];
  }

  if (!active) {
    throw new Error("FORBIDDEN");
  }

  return { user, org: active.org, membership: active.membership, allOrgs };
}

/**
 * Convenience wrapper for API routes.
 * Returns a structured error Response instead of throwing.
 */
export async function requireOrgContext(minRole?: "owner" | "admin" | "member") {
  try {
    const ctx = await getOrgContext();

    if (minRole) {
      const hierarchy = { owner: 3, admin: 2, member: 1 };
      const actual = hierarchy[ctx.membership.role as keyof typeof hierarchy] ?? 0;
      const required = hierarchy[minRole] ?? 0;
      if (actual < required) {
        return {
          ctx: null,
          error: Response.json({ error: "Forbidden: insufficient role" }, { status: 403 }),
        } as const;
      }
    }

    return { ctx, error: null } as const;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown";
    if (msg === "UNAUTHORIZED") {
      return { ctx: null, error: Response.json({ error: "Unauthorized" }, { status: 401 }) } as const;
    }
    if (msg === "FORBIDDEN") {
      return { ctx: null, error: Response.json({ error: "Forbidden" }, { status: 403 }) } as const;
    }
    return { ctx: null, error: Response.json({ error: "Server error" }, { status: 500 }) } as const;
  }
}

/** Sets the active org cookie (called from the workspace-switch route). */
export async function setActiveOrgCookie(orgId: number) {
  const jar = await cookies();
  jar.set(ORG_COOKIE, String(orgId), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

/**
 * Helper to verify the operation won't leave an org without an owner.
 * Call BEFORE any DELETE or role-demote on org_members.
 */
export async function wouldOrphanOrg(orgId: number, userIdBeingAffected: number): Promise<boolean> {
  const owners = await db
    .select({ id: orgMembers.id })
    .from(orgMembers)
    .where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.role, "owner")));

  const targetMember = await db
    .select({ role: orgMembers.role })
    .from(orgMembers)
    .where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.userId, userIdBeingAffected)))
    .limit(1);

  const isCurrentlyOwner = targetMember[0]?.role === "owner";
  return isCurrentlyOwner && owners.length <= 1;
}
