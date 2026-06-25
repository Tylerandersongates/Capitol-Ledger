import { NextRequest, NextResponse } from "next/server";
import { getAccountSubscription, setAccountSubscription } from "@/lib/account-subscription";
import {
  findSubscriptionUserIdByProvider,
  getAccountPersistenceUserId,
  readSubscriptionFromDatabase,
  writeSubscriptionToDatabase
} from "@/lib/account-database";
import { getCurrentSession, requireAuthMessage } from "@/lib/auth";
import { createAppStoreAccountToken, validateAppStoreTransaction } from "@/lib/billing/app-store";
import { guardMutationRequest } from "@/lib/request-security";

export async function POST(request: NextRequest) {
  const guard = guardMutationRequest(request, "account-subscription-app-store", { limit: 20, windowMs: 60 * 60 * 1000 });
  if (guard) return guard;

  const session = await getCurrentSession();
  if (!session?.user) {
    return NextResponse.json(requireAuthMessage(), { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { signedTransactionJWS?: string };
  const signedTransactionJWS = body.signedTransactionJWS?.trim();
  if (!signedTransactionJWS) {
    return NextResponse.json({ error: "App Store signed transaction is required." }, { status: 400 });
  }

  const accountUserId = await getAccountPersistenceUserId(session.user).catch(() => session.user.id);
  const validation = await validateAppStoreTransaction(signedTransactionJWS, {
    expectedAppAccountToken: createAppStoreAccountToken(accountUserId)
  }).catch((error: unknown) => ({
    error: error instanceof Error ? error.message : "App Store transaction validation failed."
  }));

  if ("error" in validation) {
    const databaseSubscription = await readSubscriptionFromDatabase(accountUserId).catch(() => null);
    const subscription = databaseSubscription ?? getAccountSubscription(accountUserId);

    return NextResponse.json(
      {
        error: validation.error,
        mode: databaseSubscription ? "database" : "account",
        subscription
      },
      { status: 422 }
    );
  }

  if (!validation.configured) {
    return NextResponse.json(
      {
        error: "App Store Server API validation is not configured.",
        missing: validation.missing
      },
      { status: 503 }
    );
  }

  const existingOwnerUserId = await findSubscriptionUserIdByProvider({
    subscriptionId: validation.subscription.providerSubscriptionId
  }).catch(() => null);

  if (existingOwnerUserId && existingOwnerUserId !== accountUserId) {
    return NextResponse.json(
      {
        error: "This App Store subscription is already linked to another Capitol Ledger CE account."
      },
      { status: 409 }
    );
  }

  const databaseSubscription = await writeSubscriptionToDatabase(accountUserId, validation.subscription).catch(() => null);
  const subscription = databaseSubscription ?? setAccountSubscription(accountUserId, validation.subscription);

  return NextResponse.json({
    environment: validation.environment,
    mode: databaseSubscription ? "database" : "account",
    subscription
  });
}
