import { NextRequest, NextResponse } from "next/server";
import { createCredentialAccount } from "@/lib/auth-database";
import { clearAuthCookies, setAuthSessionCookie, setPendingEmailVerificationCookie } from "@/lib/auth";
import { authEmailRequestBaseUrl, deliverAuthEmail } from "@/lib/auth-email";
import { accountPersistenceUnavailableMessage } from "@/lib/account-persistence-safety";
import { guardMutationRequest } from "@/lib/request-security";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    email?: string;
    firstName?: string;
    lastName?: string;
    name?: string;
    password?: string;
    returnTo?: string;
  };

  const firstName = body.firstName?.trim() ?? "";
  const lastName = body.lastName?.trim() ?? "";
  const name = body.name?.trim() || `${firstName} ${lastName}`.trim();

  if (!body.email || !firstName || !lastName || !body.password) {
    return NextResponse.json({ error: "First name, last name, email, and password are required." }, { status: 400 });
  }

  const guard = await guardMutationRequest(request, "auth-register", { key: body.email, limit: 5, windowMs: 60 * 60 * 1000 });
  if (guard) return guard;

  const result = await createCredentialAccount({
    email: body.email,
    firstName,
    lastName,
    name,
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

  const emailDelivery = await deliverAuthEmail({
    kind: "verify_email",
    requestBaseUrl: authEmailRequestBaseUrl(request),
    returnTo: safeAuthReturnPath(body.returnTo),
    token: result.verificationToken,
    user: result.user
  }).catch(() => ({
    delivered: false as const,
    mode: "failed" as const
  }));
  const response = NextResponse.json(
    {
      authenticated: true,
      emailDelivery: emailDelivery.mode,
      mode: "production",
      user: result.user,
      verificationLink: "actionUrl" in emailDelivery ? emailDelivery.actionUrl : undefined,
      verificationPrepared: true
    },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } }
  );
  clearAuthCookies(response);
  setAuthSessionCookie(response, result.sessionToken);
  setPendingEmailVerificationCookie(response);

  return response;
}

function safeAuthReturnPath(value?: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return undefined;
  return value;
}
