import { NextRequest, NextResponse } from "next/server";
import { signInWithPassword } from "@/lib/auth-database";
import { clearAuthCookies, setAuthSessionCookie, setPendingEmailVerificationCookie } from "@/lib/auth";
import { accountPersistenceUnavailableMessage } from "@/lib/account-persistence-safety";
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
  }).catch(() => ({
    configured: true as const,
    error: accountPersistenceUnavailableMessage,
    status: 503
  }));

  if (!result.configured) {
    return NextResponse.json(
      { configured: false, error: accountPersistenceUnavailableMessage },
      { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "30" } }
    );
  }

  if ("error" in result) {
    const response = NextResponse.json({ configured: true, error: result.error }, { status: result.status });
    if (result.status === 503) {
      response.headers.set("Cache-Control", "no-store");
      response.headers.set("Retry-After", "30");
    }
    return response;
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
