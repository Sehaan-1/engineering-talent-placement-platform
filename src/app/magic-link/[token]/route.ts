import { NextResponse } from "next/server";
import { verifyCandidateToken, SESSION_COOKIE, SESSION_TTL_MS } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const result = await verifyCandidateToken(token);

  if (!result.success || !result.sessionToken) {
    const errorUrl = new URL("/login", request.url);
    errorUrl.searchParams.set(
      "error",
      "Your sign-in link is invalid or has expired. Please request a new magic link."
    );
    return NextResponse.redirect(errorUrl);
  }

  const destination = new URL("/candidate/dashboard", request.url);
  const response = NextResponse.redirect(destination);

  response.cookies.set(SESSION_COOKIE, result.sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });

  return response;
}
