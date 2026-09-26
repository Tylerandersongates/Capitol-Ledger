import { after, NextRequest, NextResponse } from "next/server";
import { requestPasswordReset } from "@/lib/auth-database";
import { authEmailRequestBaseUrl, deliverAuthEmail } from "@/lib/auth-email";
import { accountPersistenceUnavailableMessage, logAccountPersistenceFailure } from "@/lib/account-persistence-safety";
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

  const result = await requestPasswordReset(body.email).catch((error: unknown) => {
    logAccountPersistenceFailure("auth-password-reset", error);
    return {
      configured: true as const,
      error: accountPersistenceUnavailableMessage
    };
  });

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

  const requestBaseUrl = authEmailRequestBaseUrl(request);
  after(async () => {
    if (!result.resetToken || !body.email) return;
    await deliverAuthEmail({
      kind: "password_reset",
      requestBaseUrl,
      token: result.resetToken,
      user: {
        email: body.email
      }
    }).catch(() => undefined);
  });

  return NextResponse.json(
    { message: "If an account exists, password reset instructions are on the way." },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } }
  );
}
