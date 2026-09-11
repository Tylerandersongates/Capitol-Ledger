import type { AccountSubscriptionSnapshot } from "@/types/capitol";

export type NativeStoreKitResult = {
  action: "entitlement" | "manage" | "purchase" | "restore" | "transaction-update" | string;
  message?: string;
  ok: boolean;
  pendingApproval?: boolean;
  productId?: string;
  signedTransactionJWS?: string;
  transactionId?: string;
  subscription?: AccountSubscriptionSnapshot;
};

export type NativeAppStoreDeliveryAcknowledgement = {
  acceptedTransactionId: string | null;
  transactionAccepted: boolean;
};

export type NativeAppStoreSyncDependencies = {
  accountDeletionFenceActive(): boolean;
  publishResult(result: NativeStoreKitResult & Record<string, unknown>): boolean;
  readAuthoritativeSubscription(): Promise<AccountSubscriptionSnapshot>;
  requestSync(input: {
    signedTransactionJWS: string | null;
    sourceAction: "entitlement" | "purchase" | "restore" | "transaction-update";
  }): Promise<{ data: Record<string, unknown>; ok: boolean }>;
};

const rejectedDelivery: NativeAppStoreDeliveryAcknowledgement = {
  acceptedTransactionId: null,
  transactionAccepted: false
};

export async function syncNativeAppStoreResult(
  result: NativeStoreKitResult,
  dependencies: NativeAppStoreSyncDependencies
): Promise<NativeAppStoreDeliveryAcknowledgement> {
  if (dependencies.accountDeletionFenceActive()) return rejectedDelivery;

  const shouldSyncAppStoreState = ["purchase", "restore", "entitlement", "transaction-update"].includes(result.action);
  if (!shouldSyncAppStoreState) {
    dependencies.publishResult({ ...result, subscription: undefined });
    return rejectedDelivery;
  }

  if ((result.action === "purchase" || result.action === "transaction-update") && !result.signedTransactionJWS) {
    const authoritativeSubscription = await dependencies.readAuthoritativeSubscription();
    dependencies.publishResult({
      ...result,
      ok: false,
      serverSyncPending: false,
      serverSynced: false,
      subscription: authoritativeSubscription
    });
    return rejectedDelivery;
  }

  if (!dependencies.publishResult({
    ...result,
    message: "Confirming this App Store purchase with CapitolWonk.",
    ok: false,
    serverSyncPending: true,
    subscription: undefined
  })) {
    return rejectedDelivery;
  }

  try {
    const sourceAction = result.action;
    if (
      sourceAction !== "entitlement" &&
      sourceAction !== "purchase" &&
      sourceAction !== "restore" &&
      sourceAction !== "transaction-update"
    ) {
      return rejectedDelivery;
    }
    const response = await dependencies.requestSync({
      signedTransactionJWS: result.signedTransactionJWS ?? null,
      sourceAction
    });
    const syncAccepted = response.ok && Boolean(response.data.subscription);
    const authoritativeSubscription = syncAccepted
      ? response.data.subscription as AccountSubscriptionSnapshot
      : await dependencies.readAuthoritativeSubscription();
    const operationSucceeded = syncAccepted && response.data.operationSucceeded === true;

    if (dependencies.accountDeletionFenceActive()) return rejectedDelivery;
    const published = dependencies.publishResult({
      ...result,
      linkedButInactive: syncAccepted && response.data.syncOutcome === "linked-inactive",
      message: syncAccepted
        ? typeof response.data.message === "string"
          ? response.data.message
          : operationSucceeded
            ? "Your App Store subscription is active and linked to CapitolWonk."
            : "No active App Store subscription was found. No paid features were unlocked."
        : typeof response.data.error === "string"
          ? response.data.error
          : "The App Store purchase was found, but CapitolWonk did not link it to this account. No paid features were unlocked.",
      ok: operationSucceeded,
      serverSyncPending: false,
      serverSynced: syncAccepted,
      subscription: authoritativeSubscription,
      syncOutcome: response.data.syncOutcome
    });
    if (!published || dependencies.accountDeletionFenceActive()) return rejectedDelivery;

    const acceptedTransactionId = typeof response.data.acceptedTransactionId === "string"
      ? response.data.acceptedTransactionId
      : null;
    const transactionAccepted = Boolean(
      syncAccepted &&
      result.transactionId &&
      response.data.transactionAccepted === true &&
      acceptedTransactionId === result.transactionId
    );
    return transactionAccepted
      ? { acceptedTransactionId, transactionAccepted: true }
      : rejectedDelivery;
  } catch {
    const authoritativeSubscription = await dependencies.readAuthoritativeSubscription();
    if (!dependencies.accountDeletionFenceActive()) {
      dependencies.publishResult({
        ...result,
        message: "The App Store purchase was found, but account verification could not be reached. No new paid features were unlocked.",
        ok: false,
        serverSyncPending: false,
        serverSynced: false,
        subscription: authoritativeSubscription
      });
    }
    return rejectedDelivery;
  }
}

type NativeStoreKitMessageHandler = {
  postMessage(message: { action: "sync-pending" }): void;
};

export function requestNativePendingStoreKitSync() {
  if (typeof window === "undefined") return false;
  const nativeWindow = window as typeof window & {
    capitolLedgerPurchase?: NativeStoreKitMessageHandler;
    webkit?: { messageHandlers?: { capitolLedgerPurchase?: NativeStoreKitMessageHandler } };
  };
  const handler = nativeWindow.webkit?.messageHandlers?.capitolLedgerPurchase ?? nativeWindow.capitolLedgerPurchase;
  if (!handler) return false;
  handler.postMessage({ action: "sync-pending" });
  return true;
}
