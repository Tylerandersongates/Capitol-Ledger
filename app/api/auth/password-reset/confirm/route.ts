import { NextRequest, NextResponse } from "next/server";
import { clearAuthCookies, setAuthSessionCookie } from "@/lib/auth";
import { resetPasswordWithToken } from "@/lib/auth-database";
import { guardMutationRequest } from "@/lib/request-security";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    password?: string;
    token?: string;
  };

  if (!body.token || !body.password) {
    return NextResponse.json({ error: "Reset token and new password are required." }, { status: 400 });
  }

  const guard = guardMutationRequest(request, "auth-password-reset-confirm", { key: body.token, limit: 8, windowMs: 15 * 60 * 1000 });
  if (guard) return guard;

  const result = await resetPasswordWithToken({
    password: body.password,
    token: body.token
  }).catch((error: unknown) => ({
    configured: true as const,
    error: error instanceof Error ? error.message : "Password reset failed.",
    status: 500
  }));

  if (!result.configured) {
    return NextResponse.json(result, { status: 503 });
  }

  if ("error" in result) {
    return NextResponse.json({ configured: true, error: result.error }, { status: result.status });
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
