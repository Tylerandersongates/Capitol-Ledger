import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { authSessionCookie, clearAuthCookies, setAuthSessionCookie } from "@/lib/auth";
import { verifyEmailToken } from "@/lib/auth-database";
import { guardMutationRequest } from "@/lib/request-security";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    code?: string;
    token?: string;
  };

  const guard = guardMutationRequest(request, "auth-verify-email", { key: body.token ?? body.code, limit: 10, windowMs: 15 * 60 * 1000 });
  if (guard) return guard;

  const result = await verifyEmailToken({
    code: body.code,
    sessionToken: cookies().get(authSessionCookie)?.value,
    token: body.token
  }).catch((error: unknown) => ({
    configured: true as const,
    error: error instanceof Error ? error.message : "Email verification failed.",
    status: 500
  }));

  if (!result.configured) {
    return NextResponse.json(result, { status: 503 });
  }

  if ("error" in result) {
    return NextResponse.json({ configured: true, error: result.error }, { status: result.status });
  }

  const response = NextResponse.json({
    verified: true,
    user: result.user
  });
  if (result.sessionToken) {
    clearAuthCookies(response);
    setAuthSessionCookie(response, result.sessionToken);
  }

  return response;
}
