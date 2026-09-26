import { NextRequest, NextResponse } from "next/server";
import { getAccountSubscription, normalizeAccountSubscription, setAccountSubscription } from "@/lib/account-subscription";
import { canUseDatabasePersistence, getAccountPersistenceUserId, readSubscriptionFromDatabase, writeSubscriptionToDatabase } from "@/lib/account-database";
import { fallbackUnlessAccountPersistenceUnavailable, throwAccountPersistenceUnavailable, withAccountPersistenceRoute } from "@/lib/account-persistence-safety";
import { getCurrentSession, requireAuthMessage } from "@/lib/auth";
import { readAppStoreSubscriptionState } from "@/lib/billing/app-store-state";
import { getEffectiveSubscriptionForAccountUser } from "@/lib/effective-account-subscription";
import { guardMutationRequest } from "@/lib/request-security";
import { requiresAppleTeamBillingAcknowledgement } from "@/lib/team-invite-billing";
import type { AccountSubscriptionSnapshot } from "@/types/capitol";

async function readSession() {
  const session = await getCurrentSession();
  return session?.user ?? null;
}

function isClientWritableSubscription(value: Partial<AccountSubscriptionSnapshot>) {
  const plan = value.plan === "pro" || value.plan === "team" ? value.plan : "free";
  const provider = value.provider === "stripe" || value.provider === "revenuecat" || value.provider === "app-store" ? value.provider : "demo";

  return plan === "free" && provider === "demo";
}

async function getSubscription(request: NextRequest) {
  const user = await readSession();

  if (!user) {
    return NextResponse.json(requireAuthMessage(), { status: 401 });
  }

  const accountUserId = await getAccountPersistenceUserId(user);
  const databaseSubscription = await readSubscriptionFromDatabase(accountUserId);
  const usesDatabase = canUseDatabasePersistence();

  const personalSubscription = databaseSubscription ??
    (usesDatabase ? normalizeAccountSubscription() : getAccountSubscription(accountUserId));
  const appStoreState = personalSubscription.provider === "app-store"
    ? await readAppStoreSubscriptionState(accountUserId)
    : null;
  const effective = request.nextUrl.searchParams.get("scope") === "effective";
  const subscription = effective
    ? await getEffectiveSubscriptionForAccountUser(user, personalSubscription).catch((error) =>
        fallbackUnlessAccountPersistenceUnavailable(error, personalSubscription)
      )
    : personalSubscription;

  return NextResponse.json({
    appleTeamBillingAcknowledgementRequired: requiresAppleTeamBillingAcknowledgement(
      personalSubscription,
      appStoreState
    ),
    mode: effective ? "effective" : usesDatabase ? "database" : "account",
    user,
    subscription
  });
}

async function updateSubscription(request: NextRequest) {
  const guard = await guardMutationRequest(request, "account-subscription");
  if (guard) return guard;

  const user = await readSession();

  if (!user) {
    return NextResponse.json(requireAuthMessage(), { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as Partial<AccountSubscriptionSnapshot>;
  const accountUserId = await getAccountPersistenceUserId(user);
  const usesDatabase = canUseDatabasePersistence();

  if (!isClientWritableSubscription(body)) {
    const databaseSubscription = await readSubscriptionFromDatabase(accountUserId);
    const subscription = databaseSubscription ??
      (usesDatabase ? normalizeAccountSubscription() : getAccountSubscription(accountUserId));

    return NextResponse.json(
      {
        error: "Paid subscriptions must be changed through App Store purchase or billing management.",
        mode: usesDatabase ? "database" : "account",
        user,
        subscription
      },
      { status: 403 }
    );
  }

  const subscription = usesDatabase
    ? await writeSubscriptionToDatabase(accountUserId, body)
    : setAccountSubscription(accountUserId, body);
  if (!subscription) throwAccountPersistenceUnavailable("updateSubscription");

  return NextResponse.json({
    mode: usesDatabase ? "database" : "account",
    user,
    subscription
  });
}

export const GET = withAccountPersistenceRoute(getSubscription);
export const POST = withAccountPersistenceRoute(updateSubscription);
