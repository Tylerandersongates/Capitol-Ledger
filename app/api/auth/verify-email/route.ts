import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { authSessionCookie, clearAuthCookies, clearPendingEmailVerificationCookie, setAuthSessionCookie } from "@/lib/auth";
import { verifyEmailToken } from "@/lib/auth-database";
import { accountPersistenceUnavailableMessage } from "@/lib/account-persistence-safety";
import { guardMutationRequest } from "@/lib/request-security";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    code?: string;
    token?: string;
  };

  const guard = await guardMutationRequest(request, "auth-verify-email", { key: body.token ?? body.code, limit: 10, windowMs: 15 * 60 * 1000 });
  if (guard) return guard;

  const result = await verifyEmailToken({
    code: body.code,
    sessionToken: (await cookies()).get(authSessionCookie)?.value,
    token: body.token
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

  const response = NextResponse.json({
    verified: true,
    user: result.user
  });
  if (result.sessionToken) {
    clearAuthCookies(response);
    setAuthSessionCookie(response, result.sessionToken);
  } else {
    clearPendingEmailVerificationCookie(response);
  }

  return response;
}
