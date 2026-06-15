import { NextRequest, NextResponse } from "next/server";
import { getAccountSubscription } from "@/lib/account-subscription";
import { getAccountPersistenceUserId, readSubscriptionFromDatabase } from "@/lib/account-database";
import { getCurrentSession, requireAuthMessage } from "@/lib/auth";
import { createStripeBillingPortalSession } from "@/lib/billing/stripe";
import { guardMutationRequest } from "@/lib/request-security";

function readReturnPath(value: unknown) {
  if (typeof value !== "string") return "/account";
  if (!value.startsWith("/") || value.startsWith("//")) return "/account";
  return value;
}

function hasStripeCustomerId(value?: string) {
  return Boolean(value?.startsWith("cus_"));
}

export async function POST(request: NextRequest) {
  const guard = guardMutationRequest(request, "account-subscription-portal", { limit: 12, windowMs: 60 * 60 * 1000 });
  if (guard) return guard;

  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json(requireAuthMessage(), { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    returnPath?: string;
  };
  const accountUserId = await getAccountPersistenceUserId(session.user).catch(() => session.user.id);
  const databaseSubscription = await readSubscriptionFromDatabase(accountUserId).catch(() => null);
  const subscription = databaseSubscription ?? getAccountSubscription(accountUserId);

  if (subscription.provider !== "stripe" || !hasStripeCustomerId(subscription.providerCustomerId)) {
    return NextResponse.json(
      {
        error: "Stripe billing management is available after a Stripe checkout subscription is connected.",
        mode: databaseSubscription ? "database" : "account",
        subscription
      },
      { status: 409 }
    );
  }

  const portal = await createStripeBillingPortalSession({
    customerId: subscription.providerCustomerId,
    returnUrl: `${request.nextUrl.origin}${readReturnPath(body.returnPath)}`
  }).catch((error: unknown) => ({
    configured: false as const,
    missing: [error instanceof Error ? error.message : "Stripe billing portal failed."]
  }));

  if (!portal.configured) {
    return NextResponse.json(
      {
        error: "Stripe billing portal is not ready.",
        missingConfiguration: portal.missing,
        mode: databaseSubscription ? "database" : "account",
        subscription
      },
      { status: 503 }
    );
  }

  return NextResponse.json({
    mode: "stripe",
    portalUrl: portal.portalUrl,
    sessionId: portal.sessionId,
    subscription
  });
}
