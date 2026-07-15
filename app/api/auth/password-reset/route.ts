import { NextRequest, NextResponse } from "next/server";
import { requestPasswordReset } from "@/lib/auth-database";
import { authEmailRequestBaseUrl, deliverAuthEmail } from "@/lib/auth-email";
import { guardMutationRequest } from "@/lib/request-security";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    email?: string;
  };

  if (!body.email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const guard = guardMutationRequest(request, "auth-password-reset", { key: body.email, limit: 5, windowMs: 60 * 60 * 1000 });
  if (guard) return guard;

  const result = await requestPasswordReset(body.email).catch((error: unknown) => ({
    configured: true as const,
    error: error instanceof Error ? error.message : "Password reset failed."
  }));

  if (!result.configured) {
    return NextResponse.json(result, { status: 503 });
  }

  if ("error" in result) {
    return NextResponse.json({ configured: true, error: result.error }, { status: 500 });
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
        }).catch((error: unknown) => ({
          delivered: false as const,
          error: error instanceof Error ? error.message : "Password reset email delivery failed.",
          mode: "manual_demo" as const
        }))
      : { delivered: false as const, mode: result.deliveryMode };

  return NextResponse.json({
    deliveryMode: emailDelivery.mode,
    message: "If an account exists, a password reset path has been prepared."
  });
}
