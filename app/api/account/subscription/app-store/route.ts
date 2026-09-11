import { NextRequest, NextResponse } from "next/server";
import { normalizeAccountSubscription } from "@/lib/account-subscription";
import { getAccountPersistenceUserId } from "@/lib/account-database";
import { throwAccountPersistenceUnavailable, withAccountPersistenceRoute } from "@/lib/account-persistence-safety";
import { getCurrentSession, requireAuthMessage } from "@/lib/auth";
import { createAppStoreAccountToken, validateAppStoreTransaction } from "@/lib/billing/app-store";
import type { AppStoreTransactionLike } from "@/lib/billing/app-store-products";
import {
  AppStoreServerConfigurationError,
  AppStoreServerVerificationError,
  AppStoreSubscriptionConflictError,
  reconcileAppStoreSubscription,
  type CanonicalAppStoreSubscription
} from "@/lib/billing/app-store-server";
import {
  appStoreTransactionDeliveryAcknowledgement,
  appStoreSyncResponsePayload,
  resolveAppStoreAccountToken,
  shouldRetryAppStoreRelinkConfirmation,
  type AppStoreAccountTokenDecision,
  type AppStoreSyncSourceAction
} from "@/lib/billing/app-store-relink";
import { getEffectiveSubscriptionForAccountUser } from "@/lib/effective-account-subscription";
import {
  AppStoreStateConflictError,
  AppStoreStateValidationError,
  clearUnlinkedAppStoreSubscriptionProjection,
  findAppStoreUserMapping,
  persistCanonicalAppStoreState,
  readAppStoreSubscriptionState,
  upsertAppStoreAccountTokenBinding
} from "@/lib/billing/app-store-state";
import { publicBrandName } from "@/lib/brand";
import { guardMutationRequest } from "@/lib/request-security";

const maximumSyncRequestBytes = 64 * 1024;

function readSourceAction(value: unknown): AppStoreSyncSourceAction | null {
  if (value === undefined) return "entitlement";
  return value === "entitlement" ||
    value === "purchase" ||
    value === "restore" ||
    value === "transaction-update"
    ? value
    : null;
}

function appStoreErrorResponse(error: unknown) {
  if (error instanceof AppStoreServerConfigurationError) {
    return NextResponse.json(
      { error: "App Store Server API validation is not configured.", missing: error.missing },
      { status: 503 }
    );
  }
  if (error instanceof AppStoreServerVerificationError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.retryable ? 503 : 422 }
    );
  }
  if (error instanceof AppStoreSubscriptionConflictError || error instanceof AppStoreStateConflictError) {
    return NextResponse.json(
      { error: `This App Store subscription cannot be linked to this ${publicBrandName} account.` },
      { status: 409 }
    );
  }
  if (error instanceof AppStoreStateValidationError) {
    return NextResponse.json({ error: "App Store subscription state is invalid." }, { status: 400 });
  }
  throw error;
}

async function persistCanonicalSubscription(
  canonical: CanonicalAppStoreSubscription,
  accountUserId: string,
  appAccountToken: string
) {
  const mapping = await findAppStoreUserMapping({
    appAccountToken,
    originalTransactionId: canonical.originalTransactionId
  });
  if (mapping.kind === "conflict" || (mapping.kind === "matched" && mapping.userId !== accountUserId)) {
    throw new AppStoreStateConflictError("canonical_state_owned_by_another_account");
  }

  return persistCanonicalAppStoreState({
    appAccountToken,
    appleStatus: canonical.appleStatus,
    autoRenewProductId: canonical.autoRenewProductId,
    autoRenewStatus: canonical.autoRenewStatus,
    environment: canonical.environment,
    expiresAt: canonical.expiresAt,
    gracePeriodExpiresAt: canonical.gracePeriodExpiresAt,
    observedAt: canonical.observedAt,
    observationVersion: canonical.observationVersion,
    originalTransactionId: canonical.originalTransactionId,
    productId: canonical.productId,
    signedAt: canonical.signedAt,
    subscription: canonical.snapshot,
    transactionId: canonical.transactionId,
    transactionPurchasedAt: canonical.transactionPurchasedAt,
    transactionRevokedAt: canonical.transactionRevokedAt,
    userId: accountUserId
  });
}

async function syncAppStoreSubscription(request: NextRequest) {
  const guard = guardMutationRequest(request, "account-subscription-app-store", { limit: 20, windowMs: 60 * 60 * 1000 });
  if (guard) return guard;

  const session = await getCurrentSession();
  if (!session?.user) {
    return NextResponse.json(requireAuthMessage(), { status: 401 });
  }

  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maximumSyncRequestBytes) {
    return NextResponse.json({ error: "App Store sync request is too large." }, { status: 413 });
  }
  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > maximumSyncRequestBytes) {
    return NextResponse.json({ error: "App Store sync request is too large." }, { status: 413 });
  }

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid App Store sync request." }, { status: 400 });
  }
  if (!parsedBody || typeof parsedBody !== "object" || Array.isArray(parsedBody)) {
    return NextResponse.json({ error: "Invalid App Store sync request." }, { status: 400 });
  }
  const body = parsedBody as { signedTransactionJWS?: unknown; sourceAction?: unknown };
  if (
    body.signedTransactionJWS !== undefined &&
    body.signedTransactionJWS !== null &&
    typeof body.signedTransactionJWS !== "string"
  ) {
    return NextResponse.json({ error: "Invalid App Store signed transaction." }, { status: 400 });
  }
  const signedTransactionJWS = typeof body.signedTransactionJWS === "string"
    ? body.signedTransactionJWS.trim()
    : undefined;
  const sourceAction = readSourceAction(body.sourceAction);
  if (!sourceAction) {
    return NextResponse.json({ error: "Invalid App Store sync source." }, { status: 400 });
  }
  if ((sourceAction === "purchase" || sourceAction === "transaction-update") && !signedTransactionJWS) {
    return NextResponse.json(
      { error: "An App Store purchase must include a signed transaction before it can be linked." },
      { status: 400 }
    );
  }

  const accountUserId = await getAccountPersistenceUserId(session.user);
  const appAccountToken = createAppStoreAccountToken(accountUserId);

  try {
    let canonical: CanonicalAppStoreSubscription | null = null;
    let accountTokenDecision: AppStoreAccountTokenDecision | null = null;
    let submittedProductId: string | undefined;
    let submittedTransaction: AppStoreTransactionLike | undefined;
    if (signedTransactionJWS) {
      const validation = await validateAppStoreTransaction(signedTransactionJWS);
      if (!validation.configured) {
        throw new AppStoreServerConfigurationError(validation.missing);
      }
      canonical = validation.canonical;
      submittedProductId = validation.payload.productId;
      submittedTransaction = validation.payload;
      const resolution = await resolveAppStoreAccountToken({
        accountUserId,
        appAccountToken,
        canonical,
        sourceAction
      });
      canonical = resolution.canonical;
      accountTokenDecision = resolution.decision;
    } else {
      await upsertAppStoreAccountTokenBinding({ appAccountToken, userId: accountUserId });
      const state = await readAppStoreSubscriptionState(accountUserId);
      if (state?.originalTransactionId && state.environment) {
        canonical = await reconcileAppStoreSubscription({
          anyTransactionId: state.originalTransactionId,
          environment: state.environment,
          expectedAppAccountToken: appAccountToken,
          expectedOriginalTransactionId: state.originalTransactionId
        });
      }
    }

    if (canonical) {
      const persisted = await persistCanonicalSubscription(canonical, accountUserId, appAccountToken);
      if (
        shouldRetryAppStoreRelinkConfirmation({
          decision: accountTokenDecision,
          observationApplied: persisted.observationApplied,
          relinkPending: persisted.state.relinkPending
        })
      ) {
        throw new AppStoreServerVerificationError(
          "App Store account relinking is still being confirmed. Try Restore Purchases again.",
          true
        );
      }
      const personalSubscription = persisted.accountSubscription;
      if (!personalSubscription) throwAccountPersistenceUnavailable("syncAppStoreSubscriptionProjection");
      const subscription = await getEffectiveSubscriptionForAccountUser(session.user, personalSubscription);
      return NextResponse.json({
        environment: canonical.environment,
        mode: "database",
        ...appStoreSyncResponsePayload({
          canonicalSubscription: canonical.snapshot,
          effectiveSubscription: subscription,
          observationApplied: persisted.observationApplied,
          personalSubscription,
          sourceAction,
          state: persisted.state,
          submittedProductId
        }),
        ...appStoreTransactionDeliveryAcknowledgement({
          canonicalTransaction: canonical.transaction,
          observationApplied: persisted.observationApplied,
          persistedState: persisted.state,
          submittedTransaction
        })
      });
    }

    const unlinked = await clearUnlinkedAppStoreSubscriptionProjection({
      appAccountToken,
      userId: accountUserId
    });
    const personalSubscription = unlinked.subscription ?? normalizeAccountSubscription();
    const subscription = await getEffectiveSubscriptionForAccountUser(session.user, personalSubscription);
    if (!subscription) throwAccountPersistenceUnavailable("syncAppStoreSubscription");

    return NextResponse.json({
      mode: "database",
      ...appStoreSyncResponsePayload({
        effectiveSubscription: subscription,
        observationApplied: false,
        personalSubscription,
        sourceAction,
        state: null,
        submittedProductId
      }),
      ...appStoreTransactionDeliveryAcknowledgement({
        canonicalTransaction: null,
        observationApplied: false,
        persistedState: null,
        submittedTransaction
      })
    });
  } catch (error) {
    return appStoreErrorResponse(error);
  }
}

export const POST = withAccountPersistenceRoute(syncAppStoreSubscription);
