import { publicBrandName } from "@/lib/brand";
import {
  AppStoreServerVerificationError,
  isAppStoreLineageRelinkEligible,
  reassignAppStoreAccountToken,
  reconcileAppStoreSubscription,
  type CanonicalAppStoreSubscription
} from "@/lib/billing/app-store-server";
import {
  AppStoreStateConflictError,
  findAppStoreUserMapping,
  releasePendingAppStoreLineageClaim,
  reserveAppStoreLineageClaim,
  upsertAppStoreAccountTokenBinding,
  type AppStoreSubscriptionState
} from "@/lib/billing/app-store-state";
import { getAppStoreProduct, type AppStoreTransactionLike } from "@/lib/billing/app-store-products";
import type { AccountSubscriptionSnapshot } from "@/types/capitol";

export type AppStoreSyncSourceAction = "entitlement" | "purchase" | "restore" | "transaction-update";

export type AppStoreAccountTokenDecision =
  | "same-token"
  | "explicit-restore-mismatch"
  | "purchase-or-entitlement-mismatch";

export type AppStoreAccountTokenResolution = {
  canonical: CanonicalAppStoreSubscription;
  decision: AppStoreAccountTokenDecision;
};

export function appStoreTransactionDeliveryAcknowledgement(input: {
  canonicalTransaction?: Pick<
    AppStoreTransactionLike,
    | "appAccountToken"
    | "expiresDate"
    | "inAppOwnershipType"
    | "isUpgraded"
    | "originalTransactionId"
    | "productId"
    | "purchaseDate"
    | "revocationDate"
    | "transactionId"
    | "type"
  > | null;
  observationApplied: boolean;
  persistedState: Pick<
    AppStoreSubscriptionState,
    | "originalTransactionId"
    | "productId"
    | "relinkPending"
    | "transactionId"
    | "transactionPurchasedAt"
    | "transactionRevokedAt"
  > | null;
  submittedTransaction?: Pick<
    AppStoreTransactionLike,
    | "appAccountToken"
    | "expiresDate"
    | "inAppOwnershipType"
    | "isUpgraded"
    | "originalTransactionId"
    | "productId"
    | "purchaseDate"
    | "revocationDate"
    | "transactionId"
    | "type"
  > | null;
}) {
  const rejected = { acceptedTransactionId: null, transactionAccepted: false } as const;
  const acceptedTransactionId =
    input.submittedTransaction?.transactionId?.trim() ||
    input.submittedTransaction?.originalTransactionId?.trim();
  const submittedOriginalTransactionId = input.submittedTransaction?.originalTransactionId?.trim();
  const persistedOriginalTransactionId = input.persistedState?.originalTransactionId?.trim();
  if (
    !acceptedTransactionId ||
    !submittedOriginalTransactionId ||
    !persistedOriginalTransactionId ||
    input.persistedState?.relinkPending ||
    submittedOriginalTransactionId !== persistedOriginalTransactionId
  ) {
    return rejected;
  }

  if (input.persistedState?.transactionId?.trim() === acceptedTransactionId) {
    const submitted = input.submittedTransaction;
    const canonical = input.canonicalTransaction;
    const sameOptionalNumber = (left?: number, right?: number) =>
      (left === undefined && right === undefined) ||
      (typeof left === "number" && Number.isFinite(left) && left === right);
    const sameOptionalText = (left?: string, right?: string) =>
      (left?.trim().toLowerCase() || undefined) === (right?.trim().toLowerCase() || undefined);
    const materialStateMatches = Boolean(
      input.observationApplied &&
      submitted &&
      canonical &&
      canonical.transactionId?.trim() === acceptedTransactionId &&
      canonical.originalTransactionId?.trim() === submittedOriginalTransactionId &&
      submitted.productId &&
      submitted.productId === input.persistedState.productId &&
      submitted.productId === canonical.productId &&
      typeof submitted.purchaseDate === "number" &&
      Number.isFinite(submitted.purchaseDate) &&
      submitted.purchaseDate === canonical.purchaseDate &&
      sameOptionalNumber(submitted.expiresDate, canonical.expiresDate) &&
      sameOptionalNumber(submitted.revocationDate, canonical.revocationDate) &&
      sameOptionalNumber(submitted.revocationDate, input.persistedState.transactionRevokedAt?.getTime()) &&
      Boolean(submitted.isUpgraded) === Boolean(canonical.isUpgraded) &&
      // A verified restore may submit the pre-relink token after Apple has durably
      // reassigned the same transaction to this account. Ownership is enforced by
      // resolveAppStoreAccountToken before this delivery proof is evaluated.
      sameOptionalText(submitted.inAppOwnershipType, canonical.inAppOwnershipType) &&
      sameOptionalText(submitted.type, canonical.type)
    );
    if (!materialStateMatches || !submitted || submitted.isUpgraded === true) return rejected;

    return { acceptedTransactionId, transactionAccepted: true } as const;
  }

  const submittedPurchaseDate = input.submittedTransaction?.purchaseDate;
  const persistedPurchaseDate = input.persistedState?.transactionPurchasedAt;
  if (
    typeof submittedPurchaseDate === "number" &&
    Number.isFinite(submittedPurchaseDate) &&
    persistedPurchaseDate instanceof Date &&
    Number.isFinite(persistedPurchaseDate.getTime()) &&
    Boolean(input.persistedState?.transactionId?.trim()) &&
    input.persistedState?.transactionId?.trim() !== acceptedTransactionId &&
    persistedPurchaseDate.getTime() > submittedPurchaseDate
  ) {
    return { acceptedTransactionId, transactionAccepted: true } as const;
  }

  return rejected;
}

export type AppStoreRelinkDependencies = {
  findUserMapping: typeof findAppStoreUserMapping;
  isRelinkEligible: typeof isAppStoreLineageRelinkEligible;
  reassignAccountToken: typeof reassignAppStoreAccountToken;
  reconcileSubscription: typeof reconcileAppStoreSubscription;
  releasePendingLineageClaim: typeof releasePendingAppStoreLineageClaim;
  reserveLineageClaim: typeof reserveAppStoreLineageClaim;
  upsertAccountTokenBinding: typeof upsertAppStoreAccountTokenBinding;
};

const defaultDependencies: AppStoreRelinkDependencies = {
  findUserMapping: findAppStoreUserMapping,
  isRelinkEligible: isAppStoreLineageRelinkEligible,
  reassignAccountToken: reassignAppStoreAccountToken,
  reconcileSubscription: reconcileAppStoreSubscription,
  releasePendingLineageClaim: releasePendingAppStoreLineageClaim,
  reserveLineageClaim: reserveAppStoreLineageClaim,
  upsertAccountTokenBinding: upsertAppStoreAccountTokenBinding
};

function normalizedAccountToken(value?: string | null) {
  const normalized = value?.trim().toLowerCase();
  return normalized || undefined;
}

export function decideAppStoreAccountTokenAction(input: {
  appAccountToken: string;
  canonicalAppAccountToken?: string | null;
  sourceAction: AppStoreSyncSourceAction;
}): AppStoreAccountTokenDecision {
  const canonicalToken = normalizedAccountToken(input.canonicalAppAccountToken);
  const expectedToken = normalizedAccountToken(input.appAccountToken);
  if (canonicalToken && canonicalToken === expectedToken) return "same-token";
  return input.sourceAction === "restore"
    ? "explicit-restore-mismatch"
    : "purchase-or-entitlement-mismatch";
}

export function shouldRetryAppStoreRelinkConfirmation(input: {
  decision: AppStoreAccountTokenDecision | null | undefined;
  observationApplied: boolean;
  relinkPending: boolean;
}) {
  return (
    input.decision === "explicit-restore-mismatch" &&
    !input.observationApplied &&
    input.relinkPending
  );
}

export function appStoreSyncTerminalResult(
  state: Pick<
    AppStoreSubscriptionState,
    "appleStatus" | "originalTransactionId" | "productId" | "relinkPending"
  > | null,
  operation: {
    canonicalSubscription?: AccountSubscriptionSnapshot | null;
    observationApplied: boolean;
    persistedSubscription?: AccountSubscriptionSnapshot | null;
    sourceAction: AppStoreSyncSourceAction;
    submittedProductId?: string;
  }
) {
  if (!state) {
    return {
      message: "No App Store subscription is linked to this CapitolWonk account.",
      operationSucceeded: false,
      syncOutcome: "not-linked" as const
    };
  }

  const authoritativeSubscription = operation.observationApplied
    ? operation.canonicalSubscription
    : operation.persistedSubscription;
  const product = getAppStoreProduct(state.productId);
  const entitlementActive = Boolean(
    !state.relinkPending &&
    product &&
    authoritativeSubscription?.provider === "app-store" &&
    authoritativeSubscription.providerEntitlementId === state.productId &&
    authoritativeSubscription.providerSubscriptionId === state.originalTransactionId &&
    authoritativeSubscription.plan === product.plan &&
    authoritativeSubscription.cycle === product.cycle &&
    (authoritativeSubscription.status === "active" ||
      authoritativeSubscription.status === "trialing" ||
      authoritativeSubscription.status === "past_due") &&
    (state.appleStatus === 1 || state.appleStatus === 4)
  );
  const submittedProductConfirmed =
    (operation.sourceAction !== "purchase" && operation.sourceAction !== "transaction-update") ||
    Boolean(operation.submittedProductId && operation.submittedProductId === state.productId);

  if (entitlementActive && submittedProductConfirmed) {
    return {
      message: "Your App Store subscription is active and linked to CapitolWonk.",
      operationSucceeded: true,
      syncOutcome: "linked-active" as const
    };
  }
  if (entitlementActive) {
    return {
      message: "Apple has not confirmed the selected product yet. Your existing subscription remains unchanged.",
      operationSucceeded: false,
      syncOutcome: "purchase-not-confirmed" as const
    };
  }
  return {
    message: "No active App Store subscription was found. No paid features were unlocked.",
    operationSucceeded: false,
    syncOutcome: "linked-inactive" as const
  };
}

export function appStoreSyncResponsePayload(input: {
  canonicalSubscription?: AccountSubscriptionSnapshot | null;
  effectiveSubscription: AccountSubscriptionSnapshot;
  observationApplied: boolean;
  personalSubscription?: AccountSubscriptionSnapshot | null;
  sourceAction: AppStoreSyncSourceAction;
  state: Pick<
    AppStoreSubscriptionState,
    "appleStatus" | "originalTransactionId" | "productId" | "relinkPending"
  > | null;
  submittedProductId?: string;
}) {
  return {
    subscription: input.effectiveSubscription,
    ...appStoreSyncTerminalResult(input.state, {
      canonicalSubscription: input.canonicalSubscription,
      observationApplied: input.observationApplied,
      persistedSubscription: input.personalSubscription,
      sourceAction: input.sourceAction,
      submittedProductId: input.submittedProductId
    })
  };
}

export async function resolveAppStoreAccountToken(
  input: {
    accountUserId: string;
    appAccountToken: string;
    canonical: CanonicalAppStoreSubscription;
    sourceAction: AppStoreSyncSourceAction;
  },
  dependencies: AppStoreRelinkDependencies = defaultDependencies
): Promise<AppStoreAccountTokenResolution> {
  const decision = decideAppStoreAccountTokenAction({
    appAccountToken: input.appAccountToken,
    canonicalAppAccountToken: input.canonical.transaction.appAccountToken,
    sourceAction: input.sourceAction
  });

  if (decision === "same-token") {
    await dependencies.upsertAccountTokenBinding({
      appAccountToken: input.appAccountToken,
      userId: input.accountUserId
    });
    return { canonical: input.canonical, decision };
  }

  if (decision === "purchase-or-entitlement-mismatch") {
    throw new AppStoreServerVerificationError(
      `App Store transaction is not linked to this ${publicBrandName} account.`
    );
  }

  if (!dependencies.isRelinkEligible(input.canonical)) {
    throw new AppStoreServerVerificationError(
      "Only a current, directly purchased App Store subscription can be restored to a new CapitolWonk account."
    );
  }

  const previousAppAccountToken = normalizedAccountToken(input.canonical.transaction.appAccountToken);
  const mapping = await dependencies.findUserMapping({
    appAccountToken: previousAppAccountToken,
    originalTransactionId: input.canonical.originalTransactionId
  });
  if (
    mapping.kind === "conflict" ||
    (mapping.kind === "matched" && mapping.userId !== input.accountUserId)
  ) {
    throw new AppStoreStateConflictError("relink_lineage_owned_by_another_account");
  }

  await dependencies.reserveLineageClaim({
    appAccountToken: input.appAccountToken,
    originalTransactionId: input.canonical.originalTransactionId,
    previousAppAccountToken,
    userId: input.accountUserId
  });

  try {
    await dependencies.reassignAccountToken({
      appAccountToken: input.appAccountToken,
      environment: input.canonical.environment,
      originalTransactionId: input.canonical.originalTransactionId
    });
  } catch (error) {
    if (error instanceof AppStoreServerVerificationError && !error.retryable) {
      await dependencies.releasePendingLineageClaim({
        appAccountToken: input.appAccountToken,
        originalTransactionId: input.canonical.originalTransactionId,
        userId: input.accountUserId
      });
    }
    throw error;
  }

  try {
    const canonical = await dependencies.reconcileSubscription({
      anyTransactionId: input.canonical.originalTransactionId,
      environment: input.canonical.environment,
      expectedAppAccountToken: input.appAccountToken,
      expectedOriginalTransactionId: input.canonical.originalTransactionId
    });
    return { canonical, decision };
  } catch (error) {
    throw new AppStoreServerVerificationError(
      "App Store account relinking is still being confirmed. Try Restore Purchases again.",
      true,
      error
    );
  }
}
