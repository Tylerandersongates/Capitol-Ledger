import { NextRequest, NextResponse } from "next/server";
import { getProductionSession, requireAuthMessage } from "@/lib/auth";
import { requestEmailVerification } from "@/lib/auth-database";
import { accountPersistenceUnavailableMessage } from "@/lib/account-persistence-safety";
import { authEmailRequestBaseUrl, deliverAuthEmail } from "@/lib/auth-email";
import { guardMutationRequest } from "@/lib/request-security";

const noStoreHeaders = { "Cache-Control": "private, no-store, max-age=0" };

export async function POST(request: NextRequest) {
  const session = await getProductionSession({ includeUnverified: true });
  if (!session || session.mode !== "production") {
    return NextResponse.json(requireAuthMessage(), { headers: noStoreHeaders, status: 401 });
  }

  const guard = await guardMutationRequest(request, "auth-verification-email", {
    key: session.user.id,
    limit: 3,
    windowMs: 60 * 60 * 1000
  });
  if (guard) return guard;

  const result = await requestEmailVerification(session.user.id).catch(() => ({
    configured: true as const,
    error: accountPersistenceUnavailableMessage,
    status: 503
  }));

  if (!result.configured) {
    return NextResponse.json(
      { configured: false, error: accountPersistenceUnavailableMessage },
      { headers: { ...noStoreHeaders, "Retry-After": "30" }, status: 503 }
    );
  }

  if ("error" in result) {
    const headers = result.status === 503 ? { ...noStoreHeaders, "Retry-After": "30" } : noStoreHeaders;
    return NextResponse.json({ configured: true, error: result.error }, { headers, status: result.status });
  }

  const emailDelivery = await deliverAuthEmail({
    kind: "verify_email",
    requestBaseUrl: authEmailRequestBaseUrl(request),
    token: result.verificationToken,
    user: result.user
  }).catch(() => null);

  if (!emailDelivery) {
    return NextResponse.json(
      { error: "Verification email could not be sent. Please try again shortly." },
      { headers: { ...noStoreHeaders, "Retry-After": "30" }, status: 503 }
    );
  }

  return NextResponse.json(
    {
      emailDelivery: emailDelivery.mode,
      message: emailDelivery.delivered ? "Verification email sent." : "Verification link prepared.",
      verificationLink: "actionUrl" in emailDelivery ? emailDelivery.actionUrl : undefined
    },
    { headers: noStoreHeaders }
  );
}
