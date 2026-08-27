import type { NextRequest } from "next/server";
import { getCurrentUser } from "./auth";

export async function requireAuthJson() {
  const user = await getCurrentUser();
  if (!user) {
    return {
      user: null,
      error: Response.json({ error: "Unauthorized" }, { status: 401 }),
    } as const;
  }
  return { user, error: null } as const;
}

export async function getJsonBody<T>(req: NextRequest): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}

export function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}
