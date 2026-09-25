import { NextRequest, NextResponse } from "next/server";
import { clearAuthCookies, setAuthSessionCookie } from "@/lib/auth";
import { resetPasswordWithToken } from "@/lib/auth-database";
import { accountPersistenceUnavailableMessage } from "@/lib/account-persistence-safety";
import { guardMutationRequest } from "@/lib/request-security";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    password?: string;
    token?: string;
  };

  if (!body.token || !body.password) {
    return NextResponse.json({ error: "Reset token and new password are required." }, { status: 400 });
  }

  const guard = await guardMutationRequest(request, "auth-password-reset-confirm", { key: body.token, limit: 8, windowMs: 15 * 60 * 1000 });
  if (guard) return guard;

  const result = await resetPasswordWithToken({
    password: body.password,
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
    authenticated: true,
    mode: "production",
    passwordUpdated: true,
    user: result.user
  });
  clearAuthCookies(response);
  setAuthSessionCookie(response, result.sessionToken);

  return response;
}
