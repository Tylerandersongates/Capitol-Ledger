import { NextRequest, NextResponse } from "next/server";
import { getAccountSubscription, normalizeAccountSubscription } from "@/lib/account-subscription";
import { canUseDatabasePersistence, getAccountPersistenceUserId, readSubscriptionFromDatabase } from "@/lib/account-database";
import { withAccountPersistenceRoute } from "@/lib/account-persistence-safety";
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

async function openBillingPortal(request: NextRequest) {
  const guard = guardMutationRequest(request, "account-subscription-portal", { limit: 12, windowMs: 60 * 60 * 1000 });
  if (guard) return guard;

  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json(requireAuthMessage(), { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    returnPath?: string;
  };
  const accountUserId = await getAccountPersistenceUserId(session.user);
  const databaseSubscription = await readSubscriptionFromDatabase(accountUserId);
  const usesDatabase = canUseDatabasePersistence();
  const subscription = databaseSubscription ??
    (usesDatabase ? normalizeAccountSubscription() : getAccountSubscription(accountUserId));

  if (subscription.provider !== "stripe" || !hasStripeCustomerId(subscription.providerCustomerId)) {
    return NextResponse.json(
      {
        error: "Legacy Stripe billing management is available only after a Stripe subscription is connected.",
        mode: usesDatabase ? "database" : "account",
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
        mode: usesDatabase ? "database" : "account",
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

export const POST = withAccountPersistenceRoute(openBillingPortal);
