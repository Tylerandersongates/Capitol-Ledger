import { NextRequest, NextResponse } from "next/server";
import { requestPasswordReset } from "@/lib/auth-database";
import { authEmailRequestBaseUrl, deliverAuthEmail } from "@/lib/auth-email";
import { accountPersistenceUnavailableMessage } from "@/lib/account-persistence-safety";
import { guardMutationRequest } from "@/lib/request-security";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    email?: string;
  };

  if (!body.email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const guard = await guardMutationRequest(request, "auth-password-reset", { key: body.email, limit: 5, windowMs: 60 * 60 * 1000 });
  if (guard) return guard;

  const result = await requestPasswordReset(body.email).catch(() => ({
    configured: true as const,
    error: accountPersistenceUnavailableMessage
  }));

  if (!result.configured) {
    return NextResponse.json(
      { configured: false, error: accountPersistenceUnavailableMessage },
      { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "30" } }
    );
  }

  if ("error" in result) {
    return NextResponse.json(
      { configured: true, error: result.error },
      { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "30" } }
    );
  }

  const emailDelivery =
    result.resetToken && body.email
      ? await deliverAuthEmail({
          kind: "password_reset",
          requestBaseUrl: authEmailRequestBaseUrl(request),
          token: result.resetToken,
          user: {
            email: body.email
          }
        }).catch(() => ({
          delivered: false as const,
          error: "Password reset email delivery failed.",
          mode: "manual_demo" as const
        }))
      : { delivered: false as const, mode: result.deliveryMode };

  return NextResponse.json({
    deliveryMode: emailDelivery.mode,
    message: "If an account exists, a password reset path has been prepared."
  });
}
