import { getOrgContext, setActiveOrgCookie } from "@/lib/org";
import { getJsonBody, jsonError } from "@/lib/types";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await getJsonBody<{ orgId?: number }>(req);
  if (!body || !body.orgId) return jsonError("orgId required");

  try {
    const ctx = await getOrgContext(Number(body.orgId));
    await setActiveOrgCookie(ctx.org.id);
    return Response.json({ success: true, orgId: ctx.org.id, orgName: ctx.org.name });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    return Response.json({ error: "Forbidden or org not found" }, { status: 403 });
  }
}
