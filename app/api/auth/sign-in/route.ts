import { NextRequest, NextResponse } from "next/server";
import { signInWithPassword } from "@/lib/auth-database";
import { clearAuthCookies, setAuthSessionCookie, setPendingEmailVerificationCookie } from "@/lib/auth";
import { guardMutationRequest } from "@/lib/request-security";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    email?: string;
    password?: string;
  };

  if (!body.email || !body.password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const guard = guardMutationRequest(request, "auth-sign-in", { key: body.email, limit: 8, windowMs: 15 * 60 * 1000 });
  if (guard) return guard;

  const result = await signInWithPassword({
    email: body.email,
    password: body.password
  }).catch((error: unknown) => ({
    configured: true as const,
    error: error instanceof Error ? error.message : "Sign-in failed.",
    status: 500
  }));

  if (!result.configured) {
    return NextResponse.json(result, { status: 503 });
  }

  if ("error" in result) {
    return NextResponse.json({ configured: true, error: result.error }, { status: result.status });
  }

  const requiresVerification = !result.user.emailVerifiedAt;
  const response = NextResponse.json({
    authenticated: true,
    mode: "production",
    requiresVerification,
    user: result.user
  });
  clearAuthCookies(response);
  setAuthSessionCookie(response, result.sessionToken);
  if (requiresVerification) setPendingEmailVerificationCookie(response);

  return response;
}
