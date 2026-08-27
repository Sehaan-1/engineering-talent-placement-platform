import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { organizations, orgMembers } from "@/db/schema";
import { getJsonBody, jsonError } from "@/lib/types";
import { setActiveOrgCookie } from "@/lib/org";
import { logAudit } from "@/lib/audit";
import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await getJsonBody<{ name?: string; logoColor?: string }>(req);
  if (!body || !body.name?.trim()) return jsonError("Workspace name is required");

  const orgName = body.name.trim();
  const baseSlug = orgName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 40) || "workspace";

  let slug = baseSlug;
  const [slugConflict] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.slug, slug))
    .limit(1);

  if (slugConflict) {
    const suffix = Math.random().toString(36).slice(2, 6);
    slug = `${baseSlug}-${suffix}`;
  }

  const [created] = await db
    .insert(organizations)
    .values({
      name: orgName,
      slug,
      plan: "pro",
      logoColor: body.logoColor?.trim() || "#6366f1",
    })
    .returning();

  await db.insert(orgMembers).values({
    orgId: created.id,
    userId: user.id,
    role: "owner",
  });

  await setActiveOrgCookie(created.id);

  logAudit({
    orgId: created.id,
    actorId: user.id,
    actorName: user.name,
    actorEmail: user.email,
    targetType: "organization",
    targetId: created.id,
    targetTitle: created.name,
    action: "create",
  });

  return Response.json({ org: created }, { status: 201 });
}
