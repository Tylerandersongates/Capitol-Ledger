import { NextRequest, NextResponse } from "next/server";
import { setAccountSubscription } from "@/lib/account-subscription";
import { getAccountPersistenceUserId, writeSubscriptionToDatabase } from "@/lib/account-database";
import { createStripeCheckoutSession } from "@/lib/billing/stripe";
import { getCurrentSession, requireAuthMessage } from "@/lib/auth";
import { guardMutationRequest } from "@/lib/request-security";
import { normalizeTeamSeatCount } from "@/lib/subscription-seat-count";
import type { BillingCycle, SubscriptionPlanId } from "@/types/capitol";

function readPlan(value: unknown): SubscriptionPlanId | null {
  if (value === "free" || value === "pro" || value === "team") return value;
  return null;
}

function readCycle(value: unknown): BillingCycle {
  return value === "annual" ? "annual" : "monthly";
}

export async function POST(request: NextRequest) {
  const guard = guardMutationRequest(request, "account-subscription-checkout", { limit: 12, windowMs: 60 * 60 * 1000 });
  if (guard) return guard;

  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json(requireAuthMessage(), { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    cycle?: BillingCycle;
    plan?: SubscriptionPlanId;
    seatCount?: number;
  };
  const plan = readPlan(body.plan);
  const cycle = readCycle(body.cycle);
  const seatCount = plan === "team" ? normalizeTeamSeatCount(body.seatCount) : undefined;

  if (!plan) {
    return NextResponse.json({ error: "Invalid subscription plan." }, { status: 400 });
  }

  if (plan === "free") {
    const accountUserId = await getAccountPersistenceUserId(session.user).catch(() => session.user.id);
    const nextSubscription = {
      cycle,
      plan,
      provider: "demo",
      providerEntitlementId: "capitol-ledger-free",
      providerSubscriptionId: "demo-free",
      seatCount,
      status: "active"
    } as const;
    const databaseSubscription = await writeSubscriptionToDatabase(accountUserId, nextSubscription).catch(() => null);
    const subscription = databaseSubscription ?? setAccountSubscription(accountUserId, nextSubscription);

    return NextResponse.json({
      checkoutMode: "demo",
      mode: databaseSubscription ? "database" : "account",
      subscription
    });
  }

  const origin = request.nextUrl.origin;
  const successPath = plan === "team" ? "/team" : "/account";
  const checkout = await createStripeCheckoutSession({
    cancelUrl: `${origin}/upgrade?checkout=cancel`,
    cycle,
    plan,
    seatCount,
    successUrl: `${origin}${successPath}?checkout=success&plan=${plan}`,
    user: session.user
  }).catch((error: unknown) => ({
    configured: false as const,
    missing: [error instanceof Error ? error.message : "Stripe checkout failed."]
  }));

  if (!checkout.configured) {
    const accountUserId = await getAccountPersistenceUserId(session.user).catch(() => session.user.id);
    const nextSubscription = {
      cycle,
      plan,
      provider: "demo",
      providerEntitlementId: `capitol-ledger-${plan}`,
      providerSubscriptionId: `demo-${plan}-${cycle}`,
      seatCount,
      status: "active"
    } as const;
    const databaseSubscription = await writeSubscriptionToDatabase(accountUserId, nextSubscription).catch(() => null);
    const subscription = databaseSubscription ?? setAccountSubscription(accountUserId, nextSubscription);

    return NextResponse.json({
      checkoutMode: "demo",
      mode: databaseSubscription ? "database" : "account",
      missingConfiguration: checkout.missing,
      subscription
    });
  }

  return NextResponse.json({
    checkoutMode: "stripe",
    checkoutUrl: checkout.checkoutUrl,
    mode: "account",
    sessionId: checkout.sessionId
  });
}
