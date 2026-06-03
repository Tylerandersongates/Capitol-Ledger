import { NextRequest, NextResponse } from "next/server";
import { createCredentialAccount } from "@/lib/auth-database";
import { clearAuthCookies, setAuthSessionCookie } from "@/lib/auth";
import { deliverAuthEmail } from "@/lib/auth-email";
import { guardMutationRequest } from "@/lib/request-security";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    email?: string;
    firstName?: string;
    lastName?: string;
    name?: string;
    password?: string;
  };

  const firstName = body.firstName?.trim() ?? "";
  const lastName = body.lastName?.trim() ?? "";
  const name = body.name?.trim() || `${firstName} ${lastName}`.trim();

  if (!body.email || !firstName || !lastName || !body.password) {
    return NextResponse.json({ error: "First name, last name, email, and password are required." }, { status: 400 });
  }

  const guard = guardMutationRequest(request, "auth-register", { key: body.email, limit: 5, windowMs: 60 * 60 * 1000 });
  if (guard) return guard;

  const result = await createCredentialAccount({
    email: body.email,
    firstName,
    lastName,
    name,
    password: body.password
  }).catch((error: unknown) => ({
    configured: true as const,
    error: error instanceof Error ? error.message : "Account creation failed.",
    status: 500
  }));

  if (!result.configured) {
    return NextResponse.json(result, { status: 503 });
  }

  if ("error" in result) {
    return NextResponse.json({ configured: true, error: result.error }, { status: result.status });
  }

  const emailDelivery = await deliverAuthEmail({
    kind: "verify_email",
    token: result.verificationToken,
    user: result.user
  }).catch((error: unknown) => ({
    delivered: false as const,
    error: error instanceof Error ? error.message : "Verification email delivery failed.",
    mode: "manual_demo" as const
  }));
  const response = NextResponse.json({
    authenticated: true,
    emailDelivery: emailDelivery.mode,
    mode: "production",
    user: result.user,
    verificationLink: "actionUrl" in emailDelivery ? emailDelivery.actionUrl : undefined,
    verificationPrepared: true
  });
  clearAuthCookies(response);
  setAuthSessionCookie(response, result.sessionToken);

  return response;
}
