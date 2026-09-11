#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import { InAppOwnershipType, Status, Type, type JWSTransactionDecodedPayload } from "@apple/app-store-server-library";
import {
  appStoreTransactionDeliveryAcknowledgement,
  appStoreSyncResponsePayload,
  appStoreSyncTerminalResult,
  decideAppStoreAccountTokenAction,
  resolveAppStoreAccountToken,
  shouldRetryAppStoreRelinkConfirmation,
  type AppStoreRelinkDependencies,
  type AppStoreSyncSourceAction
} from "@/lib/billing/app-store-relink";
import {
  AppStoreServerVerificationError,
  isAppStoreLineageRelinkEligible,
  type CanonicalAppStoreSubscription
} from "@/lib/billing/app-store-server";
import {
  AppStoreStateConflictError,
  isPendingAppStoreLineageClaim,
  reserveAppStoreLineageClaim
} from "@/lib/billing/app-store-state";
import {
  syncNativeAppStoreResult,
  type NativeAppStoreSyncDependencies,
  type NativeStoreKitResult
} from "@/lib/native-storekit-sync";

const oldAccountToken = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const firstAccountToken = "11111111-2222-4333-8444-555555555555";
const secondAccountToken = "66666666-7777-4888-8999-000000000000";

function canonicalFixture(
  appAccountToken: string | undefined = oldAccountToken,
  overrides: Partial<CanonicalAppStoreSubscription> = {}
): CanonicalAppStoreSubscription {
  const originalTransactionId = overrides.originalTransactionId ?? "original-1";
  const productId = overrides.productId ?? "com.capitolwonk.pro.monthly";
  const transactionId = overrides.transactionId ?? "transaction-1";
  const transactionPurchasedAt = overrides.transactionPurchasedAt ?? new Date("2026-09-11T19:59:00.000Z");
  return {
    appleStatus: Status.ACTIVE,
    environment: "Sandbox",
    observedAt: new Date("2026-09-11T20:00:00.000Z"),
    observationVersion: BigInt(1),
    originalTransactionId,
    productId,
    snapshot: {
      cycle: "monthly",
      plan: "pro",
      provider: "app-store",
      providerCustomerId: "app-store-sandbox",
      providerEntitlementId: productId,
      providerSubscriptionId: originalTransactionId,
      status: "active",
      updatedAt: "2026-09-11T20:00:00.000Z"
    },
    transaction: {
      appAccountToken,
      inAppOwnershipType: InAppOwnershipType.PURCHASED,
      originalTransactionId,
      productId,
      purchaseDate: transactionPurchasedAt.getTime(),
      transactionId,
      type: Type.AUTO_RENEWABLE_SUBSCRIPTION
    } as JWSTransactionDecodedPayload,
    transactionId,
    transactionPurchasedAt,
    ...overrides
  };
}

function eligibilityFixture(input: {
  appleStatus?: number;
  inAppOwnershipType?: string;
  isUpgraded?: boolean;
  revocationDate?: number;
}) {
  return {
    appleStatus: input.appleStatus ?? Status.ACTIVE,
    transaction: {
      inAppOwnershipType: input.inAppOwnershipType ?? InAppOwnershipType.PURCHASED,
      isUpgraded: input.isUpgraded,
      revocationDate: input.revocationDate
    } as JWSTransactionDecodedPayload
  } satisfies Pick<CanonicalAppStoreSubscription, "appleStatus" | "transaction">;
}

function source(path: string) {
  return fs.readFileSync(path, "utf8");
}

function dependencies(overrides: Partial<AppStoreRelinkDependencies> = {}): AppStoreRelinkDependencies {
  return {
    findUserMapping: async () => ({ kind: "none" }),
    isRelinkEligible: () => true,
    reassignAccountToken: async () => undefined,
    reconcileSubscription: async () => {
      throw new Error("Unexpected reconciliation.");
    },
    releasePendingLineageClaim: async () => true,
    reserveLineageClaim: async () => ({} as never),
    upsertAccountTokenBinding: async () => ({} as never),
    ...overrides
  };
}

function resolutionInput(
  canonical: CanonicalAppStoreSubscription,
  sourceAction: AppStoreSyncSourceAction,
  accountUserId = "user-1",
  appAccountToken = firstAccountToken
) {
  return {
    accountUserId,
    appAccountToken,
    canonical,
    sourceAction
  };
}

function checkEligibilityBoundary() {
  for (const appleStatus of [Status.ACTIVE, Status.BILLING_RETRY, Status.BILLING_GRACE_PERIOD]) {
    assert.equal(
      isAppStoreLineageRelinkEligible(eligibilityFixture({ appleStatus })),
      true,
      `Apple status ${appleStatus} should remain eligible for an explicit account relink`
    );
  }

  for (const appleStatus of [Status.EXPIRED, Status.REVOKED]) {
    assert.equal(
      isAppStoreLineageRelinkEligible(eligibilityFixture({ appleStatus })),
      false,
      `Apple status ${appleStatus} must not reserve or relink an ended subscription`
    );
  }

  assert.equal(
    isAppStoreLineageRelinkEligible(eligibilityFixture({ inAppOwnershipType: InAppOwnershipType.FAMILY_SHARED })),
    false,
    "Family-shared purchases cannot use Apple's app-account-token reassignment endpoint"
  );
  assert.equal(
    isAppStoreLineageRelinkEligible(eligibilityFixture({ inAppOwnershipType: "" })),
    false,
    "A restore without direct-purchase ownership proof must fail closed"
  );
  assert.equal(
    isAppStoreLineageRelinkEligible(eligibilityFixture({ isUpgraded: true })),
    false,
    "An upgraded-away transaction must not be relinked"
  );
  assert.equal(
    isAppStoreLineageRelinkEligible(eligibilityFixture({ revocationDate: Date.now() })),
    false,
    "A revoked transaction must not be relinked"
  );
}

function checkAccountTokenDecisionBoundary() {
  assert.equal(
    decideAppStoreAccountTokenAction({
      appAccountToken: firstAccountToken,
      canonicalAppAccountToken: `  ${firstAccountToken.toUpperCase()}  `,
      sourceAction: "purchase"
    }),
    "same-token"
  );
  assert.equal(
    decideAppStoreAccountTokenAction({
      appAccountToken: firstAccountToken,
      canonicalAppAccountToken: oldAccountToken,
      sourceAction: "restore"
    }),
    "explicit-restore-mismatch"
  );
  for (const sourceAction of ["purchase", "entitlement", "transaction-update"] as const) {
    assert.equal(
      decideAppStoreAccountTokenAction({
        appAccountToken: firstAccountToken,
        canonicalAppAccountToken: oldAccountToken,
        sourceAction
      }),
      "purchase-or-entitlement-mismatch"
    );
  }
  assert.equal(
    shouldRetryAppStoreRelinkConfirmation({
      decision: "explicit-restore-mismatch",
      observationApplied: false,
      relinkPending: true
    }),
    true,
    "A stale post-Set observation must remain retryable while the lineage reservation is pending"
  );
  assert.equal(
    shouldRetryAppStoreRelinkConfirmation({
      decision: "explicit-restore-mismatch",
      observationApplied: false,
      relinkPending: false
    }),
    false,
    "A newer canonical writer that cleared the reservation makes the current projection authoritative"
  );
  assert.equal(
    shouldRetryAppStoreRelinkConfirmation({
      decision: "same-token",
      observationApplied: false,
      relinkPending: true
    }),
    false,
    "Ordinary stale entitlement sync must return its current projection rather than becoming a relink retry"
  );
}

function checkTerminalResultBoundary() {
  const active = canonicalFixture();
  const state = {
    appleStatus: active.appleStatus,
    originalTransactionId: active.originalTransactionId,
    productId: active.productId,
    relinkPending: false
  };

  assert.deepEqual(
    appStoreSyncTerminalResult(state, {
      canonicalSubscription: active.snapshot,
      observationApplied: true,
      sourceAction: "purchase",
      submittedProductId: active.productId
    }),
    {
      message: "Your App Store subscription is active and linked to CapitolWonk.",
      operationSucceeded: true,
      syncOutcome: "linked-active"
    },
    "An applied active canonical snapshot may complete a matching purchase"
  );

  const revokedSnapshot = {
    ...active.snapshot,
    plan: "free" as const,
    status: "canceled" as const
  };
  assert.equal(
    appStoreSyncTerminalResult(state, {
      canonicalSubscription: revokedSnapshot,
      observationApplied: true,
      sourceAction: "restore"
    }).operationSucceeded,
    false,
    "A revoked transaction must not succeed merely because Apple's status field says active"
  );

  assert.equal(
    appStoreSyncTerminalResult(state, {
      canonicalSubscription: active.snapshot,
      observationApplied: true,
      sourceAction: "purchase",
      submittedProductId: "com.capitolwonk.pro.annual"
    }).syncOutcome,
    "purchase-not-confirmed",
    "A purchase must confirm the exact signed product submitted by the device"
  );

  assert.equal(
    appStoreSyncTerminalResult(state, {
      canonicalSubscription: active.snapshot,
      observationApplied: true,
      sourceAction: "transaction-update",
      submittedProductId: "com.capitolwonk.team.5.monthly"
    }).syncOutcome,
    "purchase-not-confirmed",
    "A delayed product update must not report success while canonical state still contains the old product"
  );

  assert.equal(
    appStoreSyncTerminalResult(state, {
      canonicalSubscription: revokedSnapshot,
      observationApplied: false,
      persistedSubscription: active.snapshot,
      sourceAction: "entitlement"
    }).operationSucceeded,
    true,
    "A rejected stale observation must use the newer persisted App Store projection"
  );

  assert.equal(
    appStoreSyncTerminalResult(state, {
      canonicalSubscription: active.snapshot,
      observationApplied: false,
      persistedSubscription: {
        ...active.snapshot,
        provider: "demo",
        providerEntitlementId: "capitol-ledger-team-member"
      },
      sourceAction: "entitlement"
    }).operationSucceeded,
    false,
    "A Team member seat must not be mistaken for a confirmed personal App Store entitlement"
  );

  const teamEffectiveSubscription = {
    cycle: "monthly" as const,
    plan: "team" as const,
    provider: "demo" as const,
    providerCustomerId: "app-store-sandbox",
    providerEntitlementId: "capitol-ledger-team-member",
    providerSubscriptionId: "team-member-workspace-1",
    seatCount: 5,
    status: "active" as const,
    updatedAt: active.snapshot.updatedAt
  };
  const nativePayload = appStoreSyncResponsePayload({
    canonicalSubscription: active.snapshot,
    effectiveSubscription: teamEffectiveSubscription,
    observationApplied: true,
    personalSubscription: {
      ...active.snapshot,
      plan: "free",
      providerEntitlementId: "capitol-ledger-team-member"
    },
    sourceAction: "entitlement",
    state
  });
  assert.equal(nativePayload.operationSucceeded, true);
  assert.deepEqual(
    nativePayload.subscription,
    teamEffectiveSubscription,
    "A native App Store sync must publish the server-resolved Team effective entitlement, not paused personal Free"
  );
}

async function checkNativeTransactionDeliveryBoundary() {
  const submittedPurchaseDate = Date.parse("2026-09-11T20:01:00.000Z");
  const transactionId = "18446744073709551614";
  const submittedTransaction = {
    appAccountToken: firstAccountToken,
    expiresDate: Date.parse("2026-10-11T20:01:00.000Z"),
    inAppOwnershipType: InAppOwnershipType.PURCHASED,
    originalTransactionId: "original-1",
    productId: "com.capitolwonk.pro.monthly",
    purchaseDate: submittedPurchaseDate,
    transactionId,
    type: Type.AUTO_RENEWABLE_SUBSCRIPTION
  };
  const matchingPersistedState = {
    originalTransactionId: submittedTransaction.originalTransactionId,
    productId: submittedTransaction.productId,
    relinkPending: false,
    transactionId,
    transactionPurchasedAt: new Date(submittedPurchaseDate)
  };

  assert.deepEqual(appStoreTransactionDeliveryAcknowledgement({
    canonicalTransaction: null,
    observationApplied: false,
    persistedState: null,
    submittedTransaction: undefined
  }), {
    acceptedTransactionId: null,
    transactionAccepted: false
  });
  assert.deepEqual(appStoreTransactionDeliveryAcknowledgement({
    canonicalTransaction: submittedTransaction,
    observationApplied: true,
    persistedState: { ...matchingPersistedState, transactionId: ` ${transactionId} ` },
    submittedTransaction: {
      ...submittedTransaction,
      transactionId: ` ${transactionId} `
    }
  }), {
    acceptedTransactionId: "18446744073709551614",
    transactionAccepted: true
  }, "an exact persisted transaction may be acknowledged without comparing timestamps");

  assert.deepEqual(appStoreTransactionDeliveryAcknowledgement({
    canonicalTransaction: {
      ...submittedTransaction,
      productId: "com.capitolwonk.pro.monthly",
      purchaseDate: submittedPurchaseDate - 60_000,
      transactionId: "old-pro-transaction"
    },
    observationApplied: true,
    persistedState: {
      originalTransactionId: "original-1",
      productId: "com.capitolwonk.pro.monthly",
      relinkPending: false,
      transactionId: "old-pro-transaction",
      transactionPurchasedAt: new Date(submittedPurchaseDate - 60_000)
    },
    submittedTransaction
  }), {
    acceptedTransactionId: null,
    transactionAccepted: false
  }, "an older persisted Pro transaction must not acknowledge a newer pending Team update");

  assert.deepEqual(appStoreTransactionDeliveryAcknowledgement({
    canonicalTransaction: null,
    observationApplied: false,
    persistedState: {
      originalTransactionId: "original-1",
      productId: "com.capitolwonk.team.5.monthly",
      relinkPending: false,
      transactionId: "newer-lineage-transaction",
      transactionPurchasedAt: new Date(submittedPurchaseDate + 60_000)
    },
    submittedTransaction
  }), {
    acceptedTransactionId: transactionId,
    transactionAccepted: true
  }, "a demonstrably newer persisted transaction in the same lineage covers an older unfinished delivery");

  assert.deepEqual(appStoreTransactionDeliveryAcknowledgement({
    canonicalTransaction: submittedTransaction,
    observationApplied: true,
    persistedState: {
      originalTransactionId: "other-lineage",
      productId: submittedTransaction.productId,
      relinkPending: false,
      transactionId,
      transactionPurchasedAt: new Date(submittedPurchaseDate + 60_000)
    },
    submittedTransaction
  }), {
    acceptedTransactionId: null,
    transactionAccepted: false
  }, "transaction IDs never cross App Store lineages");

  assert.deepEqual(appStoreTransactionDeliveryAcknowledgement({
    canonicalTransaction: { ...submittedTransaction, productId: "com.capitolwonk.team.5.monthly" },
    observationApplied: true,
    persistedState: matchingPersistedState,
    submittedTransaction: { ...submittedTransaction, productId: "com.capitolwonk.team.5.monthly" }
  }), {
    acceptedTransactionId: null,
    transactionAccepted: false
  }, "an exact ID must not cover a different durable product");

  assert.deepEqual(appStoreTransactionDeliveryAcknowledgement({
    canonicalTransaction: submittedTransaction,
    observationApplied: true,
    persistedState: { ...matchingPersistedState, relinkPending: true },
    submittedTransaction
  }), {
    acceptedTransactionId: null,
    transactionAccepted: false
  }, "a pending account relink must never acknowledge StoreKit delivery");

  const revokedTransaction = { ...submittedTransaction, revocationDate: submittedPurchaseDate + 30_000 };
  assert.deepEqual(appStoreTransactionDeliveryAcknowledgement({
    canonicalTransaction: submittedTransaction,
    observationApplied: true,
    persistedState: matchingPersistedState,
    submittedTransaction: revokedTransaction
  }), {
    acceptedTransactionId: null,
    transactionAccepted: false
  }, "a stale active canonical representation must not acknowledge a same-ID revocation");

  assert.deepEqual(appStoreTransactionDeliveryAcknowledgement({
    canonicalTransaction: revokedTransaction,
    observationApplied: true,
    persistedState: {
      ...matchingPersistedState,
      transactionRevokedAt: new Date(revokedTransaction.revocationDate)
    },
    submittedTransaction: revokedTransaction
  }), {
    acceptedTransactionId: transactionId,
    transactionAccepted: true
  }, "an exact revocation may finish only after its revocation timestamp is durable");

  const upgradedTransaction = { ...submittedTransaction, isUpgraded: true };
  assert.deepEqual(appStoreTransactionDeliveryAcknowledgement({
    canonicalTransaction: upgradedTransaction,
    observationApplied: true,
    persistedState: matchingPersistedState,
    submittedTransaction: upgradedTransaction
  }), {
    acceptedTransactionId: null,
    transactionAccepted: false
  }, "an upgraded-away transaction requires a strictly newer durable transaction before finish");

  assert.deepEqual(appStoreTransactionDeliveryAcknowledgement({
    canonicalTransaction: { ...submittedTransaction, appAccountToken: secondAccountToken },
    observationApplied: true,
    persistedState: matchingPersistedState,
    submittedTransaction
  }), {
    acceptedTransactionId: transactionId,
    transactionAccepted: true
  }, "a verified explicit relink may retire the old-token JWS after the new-token canonical state is durable");

  const result: NativeStoreKitResult = {
    action: "transaction-update",
    ok: true,
    productId: "com.capitolwonk.pro.monthly",
    signedTransactionJWS: "signed-transaction",
    transactionId
  };
  const published: Array<NativeStoreKitResult & Record<string, unknown>> = [];
  const syncInputs: Array<{
    signedTransactionJWS: string | null;
    sourceAction: "entitlement" | "purchase" | "restore" | "transaction-update";
  }> = [];
  const baseDependencies: NativeAppStoreSyncDependencies = {
    accountDeletionFenceActive: () => false,
    publishResult: (nextResult) => {
      published.push(nextResult);
      return true;
    },
    readAuthoritativeSubscription: async () => canonicalFixture().snapshot,
    requestSync: async (input) => {
      syncInputs.push(input);
      return {
        data: {
          acceptedTransactionId: transactionId,
          message: "No active App Store subscription was found. No paid features were unlocked.",
          operationSucceeded: false,
          subscription: { ...canonicalFixture().snapshot, plan: "free", status: "canceled" },
          syncOutcome: "linked-inactive",
          transactionAccepted: true
        },
        ok: true
      };
    }
  };

  assert.deepEqual(await syncNativeAppStoreResult(result, baseDependencies), {
    acceptedTransactionId: transactionId,
    transactionAccepted: true
  }, "an exact persisted server acknowledgement may finish even when the entitlement is inactive");
  assert.equal(
    syncInputs[0]?.sourceAction,
    "transaction-update",
    "delayed updates must retain their fail-closed server action end to end"
  );
  assert.equal(published.at(-1)?.ok, false, "delivery acknowledgement must not manufacture paid access");

  assert.equal(
    (await syncNativeAppStoreResult(result, {
      ...baseDependencies,
      requestSync: async () => ({
        data: {
          acceptedTransactionId: "different-transaction",
          subscription: canonicalFixture().snapshot,
          transactionAccepted: true
        },
        ok: true
      })
    })).transactionAccepted,
    false,
    "a mismatched transaction acknowledgement must remain unfinished"
  );

  assert.equal(
    (await syncNativeAppStoreResult(result, {
      ...baseDependencies,
      requestSync: async () => { throw new Error("offline"); }
    })).transactionAccepted,
    false,
    "network failure must leave the StoreKit transaction unfinished"
  );

  let fenced = false;
  assert.equal(
    (await syncNativeAppStoreResult(result, {
      ...baseDependencies,
      accountDeletionFenceActive: () => fenced,
      requestSync: async () => {
        fenced = true;
        return {
          data: {
            acceptedTransactionId: transactionId,
            subscription: canonicalFixture().snapshot,
            transactionAccepted: true
          },
          ok: true
        };
      }
    })).transactionAccepted,
    false,
    "a deletion fence raised during reconciliation must prevent StoreKit finish"
  );

  let fencedCalls = 0;
  assert.equal(
    (await syncNativeAppStoreResult(result, {
      ...baseDependencies,
      accountDeletionFenceActive: () => true,
      publishResult: () => {
        fencedCalls += 1;
        return true;
      },
      requestSync: async () => {
        fencedCalls += 1;
        return { data: {}, ok: true };
      }
    })).transactionAccepted,
    false
  );
  assert.equal(fencedCalls, 0, "a pre-existing deletion fence must stop publication and network work");
}

async function checkSuccessfulRelinkOrder() {
  const events: string[] = [];
  const canonical = canonicalFixture();
  const confirmed = canonicalFixture(firstAccountToken, {
    observedAt: new Date("2026-09-11T20:00:01.000Z"),
    transactionId: "transaction-2"
  });
  const result = await resolveAppStoreAccountToken(
    resolutionInput(canonical, "restore"),
    dependencies({
      findUserMapping: async (input) => {
        events.push("mapping");
        assert.equal(input.appAccountToken, oldAccountToken);
        assert.equal(input.originalTransactionId, canonical.originalTransactionId);
        return { kind: "none" };
      },
      isRelinkEligible: (candidate) => {
        events.push("eligibility");
        assert.equal(candidate, canonical);
        return true;
      },
      reassignAccountToken: async (input) => {
        events.push("set");
        assert.deepEqual(input, {
          appAccountToken: firstAccountToken,
          environment: "Sandbox",
          originalTransactionId: canonical.originalTransactionId
        });
      },
      reconcileSubscription: async (input) => {
        events.push("confirm");
        assert.deepEqual(input, {
          anyTransactionId: canonical.originalTransactionId,
          environment: "Sandbox",
          expectedAppAccountToken: firstAccountToken,
          expectedOriginalTransactionId: canonical.originalTransactionId
        });
        return confirmed;
      },
      reserveLineageClaim: async (input) => {
        events.push("reserve");
        assert.deepEqual(input, {
          appAccountToken: firstAccountToken,
          originalTransactionId: canonical.originalTransactionId,
          previousAppAccountToken: oldAccountToken,
          userId: "user-1"
        });
        return {} as never;
      }
    })
  );

  assert.equal(result.canonical, confirmed);
  assert.equal(result.decision, "explicit-restore-mismatch");
  assert.deepEqual(events, ["eligibility", "mapping", "reserve", "set", "confirm"]);
}

async function checkSameTokenBinding() {
  const events: string[] = [];
  const canonical = canonicalFixture(firstAccountToken.toUpperCase());
  const result = await resolveAppStoreAccountToken(
    resolutionInput(canonical, "entitlement"),
    dependencies({
      findUserMapping: async () => {
        events.push("unexpected-mapping");
        return { kind: "none" };
      },
      reassignAccountToken: async () => {
        events.push("unexpected-set");
      },
      upsertAccountTokenBinding: async (input) => {
        events.push("bind");
        assert.deepEqual(input, { appAccountToken: firstAccountToken, userId: "user-1" });
        return {} as never;
      }
    })
  );

  assert.equal(result.canonical, canonical);
  assert.equal(result.decision, "same-token");
  assert.deepEqual(events, ["bind"], "A matching token should bind locally without calling Apple's Set endpoint");
}

async function checkNonRestoreMismatchRejection() {
  for (const sourceAction of ["purchase", "entitlement", "transaction-update"] as const) {
    const events: string[] = [];
    await assert.rejects(
      resolveAppStoreAccountToken(
        resolutionInput(canonicalFixture(), sourceAction),
        dependencies({
          findUserMapping: async () => {
            events.push("unexpected-mapping");
            return { kind: "none" };
          },
          reassignAccountToken: async () => {
            events.push("unexpected-set");
          },
          reserveLineageClaim: async () => {
            events.push("unexpected-reserve");
            return {} as never;
          },
          upsertAccountTokenBinding: async () => {
            events.push("unexpected-bind");
            return {} as never;
          }
        })
      ),
      (error: unknown) => error instanceof AppStoreServerVerificationError && !error.retryable,
      `${sourceAction} must reject an account-token mismatch`
    );
    assert.deepEqual(events, [], `${sourceAction} mismatch must have no ownership or provider side effects`);
  }
}

async function checkOwnerConflictStopsBeforeSet() {
  const events: string[] = [];
  await assert.rejects(
    resolveAppStoreAccountToken(
      resolutionInput(canonicalFixture(), "restore"),
      dependencies({
        findUserMapping: async () => {
          events.push("mapping");
          return { kind: "matched", matchedBy: ["originalTransactionId"], userId: "other-user" };
        },
        isRelinkEligible: () => {
          events.push("eligibility");
          return true;
        },
        reassignAccountToken: async () => {
          events.push("unexpected-set");
        },
        reserveLineageClaim: async () => {
          events.push("unexpected-reserve");
          return {} as never;
        }
      })
    ),
    (error: unknown) =>
      error instanceof AppStoreStateConflictError && error.code === "relink_lineage_owned_by_another_account"
  );
  assert.deepEqual(events, ["eligibility", "mapping"]);
}

async function checkRetryableSetRetainsReservation() {
  const events: string[] = [];
  const retryable = new AppStoreServerVerificationError("Retry Set App Account Token.", true);
  await assert.rejects(
    resolveAppStoreAccountToken(
      resolutionInput(canonicalFixture(), "restore"),
      dependencies({
        findUserMapping: async () => {
          events.push("mapping");
          return { kind: "none" };
        },
        isRelinkEligible: () => {
          events.push("eligibility");
          return true;
        },
        reassignAccountToken: async () => {
          events.push("set");
          throw retryable;
        },
        releasePendingLineageClaim: async () => {
          events.push("unexpected-release");
          return true;
        },
        reserveLineageClaim: async () => {
          events.push("reserve");
          return {} as never;
        }
      })
    ),
    (error: unknown) => error === retryable
  );
  assert.deepEqual(events, ["eligibility", "mapping", "reserve", "set"]);
}

async function checkTerminalSetReleasesReservation() {
  const events: string[] = [];
  const terminal = new AppStoreServerVerificationError("Terminal Set App Account Token.", false);
  await assert.rejects(
    resolveAppStoreAccountToken(
      resolutionInput(canonicalFixture(), "restore"),
      dependencies({
        findUserMapping: async () => {
          events.push("mapping");
          return { kind: "none" };
        },
        isRelinkEligible: () => {
          events.push("eligibility");
          return true;
        },
        reassignAccountToken: async () => {
          events.push("set");
          throw terminal;
        },
        releasePendingLineageClaim: async (input) => {
          events.push("release");
          assert.deepEqual(input, {
            appAccountToken: firstAccountToken,
            originalTransactionId: "original-1",
            userId: "user-1"
          });
          return true;
        },
        reserveLineageClaim: async () => {
          events.push("reserve");
          return {} as never;
        }
      })
    ),
    (error: unknown) => error === terminal
  );
  assert.deepEqual(events, ["eligibility", "mapping", "reserve", "set", "release"]);
}

async function checkPostSetConfirmationIsRetryable() {
  const events: string[] = [];
  const confirmationError = new Error("Apple status propagation delay.");
  let relinkPending = false;
  await assert.rejects(
    resolveAppStoreAccountToken(
      resolutionInput(canonicalFixture(), "restore"),
      dependencies({
        findUserMapping: async () => {
          events.push("mapping");
          return { kind: "none" };
        },
        isRelinkEligible: () => {
          events.push("eligibility");
          return true;
        },
        reassignAccountToken: async () => {
          events.push("set");
        },
        reconcileSubscription: async () => {
          events.push("confirm");
          throw confirmationError;
        },
        releasePendingLineageClaim: async () => {
          events.push("unexpected-release");
          relinkPending = false;
          return true;
        },
        reserveLineageClaim: async () => {
          events.push("reserve");
          relinkPending = true;
          return {} as never;
        }
      })
    ),
    (error: unknown) =>
      error instanceof AppStoreServerVerificationError &&
      error.retryable &&
      error.cause === confirmationError
  );
  assert.deepEqual(events, ["eligibility", "mapping", "reserve", "set", "confirm"]);
  assert.equal(relinkPending, true, "A post-Set retry must retain its non-entitling reservation");
  assert.equal(
    isPendingAppStoreLineageClaim({ originalTransactionId: "original-1", relinkPending }),
    true,
    "Notifications must recognize a retained post-Set reservation as pending"
  );
}

async function checkReconciledTokenRotationRequiresOperations() {
  const events: string[] = [];
  const reconciledAt = new Date("2026-09-10T20:00:00.000Z");
  const originalDatabaseUrl = process.env.DATABASE_URL;
  const originalPrisma = globalThis.__capitolLedgerPrisma;
  const queries: string[] = [];
  const storedState = {
    appAccountToken: oldAccountToken,
    appleStatus: Status.ACTIVE,
    autoRenewProductId: "com.capitolwonk.pro.monthly",
    autoRenewStatus: 1,
    createdAt: reconciledAt,
    environment: "Sandbox",
    expiresAt: new Date("2026-10-10T20:00:00.000Z"),
    gracePeriodExpiresAt: null,
    id: "state-1",
    originalTransactionId: "original-1",
    productId: "com.capitolwonk.pro.monthly",
    reconciledAt,
    relinkPending: false,
    signedAt: reconciledAt,
    transactionId: "reconciled-transaction",
    updatedAt: reconciledAt,
    userId: "user-1"
  };
  const transaction = {
    $queryRaw: async (strings: TemplateStringsArray) => {
      const sql = strings.join(" ");
      queries.push(sql);
      if (sql.includes("pg_advisory_xact_lock")) return [{ lock: "1" }];
      if (sql.includes('FROM "User"')) return [{ id: "user-1" }];
      if (sql.includes('FROM "AppStoreSubscriptionState"')) return [storedState];
      if (sql.includes('FROM "AccountSubscription"')) return [];
      throw new Error(`Unexpected relink reservation query: ${sql}`);
    }
  };
  const fakePrisma = {
    $transaction: async (operation: (client: typeof transaction) => Promise<unknown>) => operation(transaction)
  };

  try {
    process.env.DATABASE_URL = "postgresql://fixture.invalid/capitolwonk";
    globalThis.__capitolLedgerPrisma = fakePrisma as never;
    await assert.rejects(
      resolveAppStoreAccountToken(
        resolutionInput(canonicalFixture(), "restore"),
        dependencies({
          findUserMapping: async () => {
            events.push("mapping");
            return { kind: "matched", matchedBy: ["originalTransactionId"], userId: "user-1" };
          },
          isRelinkEligible: () => {
            events.push("eligibility");
            return true;
          },
          reassignAccountToken: async () => {
            events.push("unexpected-set");
          },
          reserveLineageClaim: async (input) => {
            events.push("reserve");
            return reserveAppStoreLineageClaim(input);
          }
        })
      ),
      (error: unknown) =>
        error instanceof AppStoreStateConflictError &&
        error.code === "reconciled_account_token_change_requires_ops"
    );
    assert.deepEqual(events, ["eligibility", "mapping", "reserve"]);
    assert.ok(
      queries.every((sql) => !sql.includes('UPDATE "AppStoreSubscriptionState"')),
      "A reconciled account-token rotation must not alter the claimant row"
    );
  } finally {
    if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalDatabaseUrl;
    if (originalPrisma === undefined) delete globalThis.__capitolLedgerPrisma;
    else globalThis.__capitolLedgerPrisma = originalPrisma;
  }
}

async function checkConcurrentReservationAllowsOneSet() {
  let reservationOwner: string | null = null;
  let setCalls = 0;
  const canonical = canonicalFixture();
  const concurrentDependencies = dependencies({
    findUserMapping: async () => {
      await Promise.resolve();
      return { kind: "none" };
    },
    isRelinkEligible: () => true,
    reassignAccountToken: async () => {
      setCalls += 1;
    },
    reconcileSubscription: async (input) =>
      canonicalFixture(input.expectedAppAccountToken, {
        observedAt: new Date("2026-09-11T20:00:01.000Z"),
        transactionId: "confirmed-transaction"
      }),
    reserveLineageClaim: async (input) => {
      if (reservationOwner === null) {
        reservationOwner = input.userId;
        await Promise.resolve();
        return {} as never;
      }
      throw new AppStoreStateConflictError("lineage_claim_owned_by_another_account");
    }
  });

  const results = await Promise.allSettled([
    resolveAppStoreAccountToken(
      resolutionInput(canonical, "restore", "user-1", firstAccountToken),
      concurrentDependencies
    ),
    resolveAppStoreAccountToken(
      resolutionInput(canonical, "restore", "user-2", secondAccountToken),
      concurrentDependencies
    )
  ]);
  const fulfilled = results.filter((result) => result.status === "fulfilled");
  const rejected = results.filter((result) => result.status === "rejected");

  assert.equal(fulfilled.length, 1);
  assert.equal(rejected.length, 1);
  assert.equal(setCalls, 1, "Only the serialized lineage-claim winner may call Set App Account Token");
  assert.ok(
    rejected[0]?.status === "rejected" &&
      rejected[0].reason instanceof AppStoreStateConflictError &&
      rejected[0].reason.code === "lineage_claim_owned_by_another_account"
  );
}

function checkRelinkWiring() {
  const route = source("app/api/account/subscription/app-store/route.ts");
  const relinkLibrary = source("lib/billing/app-store-relink.ts");
  const server = source("lib/billing/app-store-server.ts");
  const state = source("lib/billing/app-store-state.ts");
  const notificationRoute = source("app/api/billing/app-store/notifications/route.ts");
  const nativeSync = source("lib/native-storekit-sync.ts");
  const nativeWebBridge = source("components/native-storekit-sync-bridge.tsx");
  const nativePurchaseBridge = source("ios/CapitolLedgerNative/CapitolLedgerNative/CapitolLedgerPurchaseBridge.swift");
  const storeKitService = source("ios/CapitolLedgerNative/CapitolLedgerNative/CapitolLedgerStoreKitService.swift");
  const webControls = source("components/subscription-controls.tsx");

  const relink = relinkLibrary.slice(
    relinkLibrary.indexOf("export async function resolveAppStoreAccountToken"),
    relinkLibrary.length
  );
  const reserve = state.slice(
    state.indexOf("export async function reserveAppStoreLineageClaim"),
    state.indexOf("export async function releasePendingAppStoreLineageClaim")
  );

  assert.ok(
    route.includes("const resolution = await resolveAppStoreAccountToken({") &&
      route.includes("accountTokenDecision = resolution.decision") &&
      route.includes("sourceAction") &&
      !route.includes("async function relinkCanonicalSubscription"),
    "The account route must delegate every signed transaction's token decision to the tested helper"
  );
  assert.ok(
    route.includes("validateAppStoreTransaction(signedTransactionJWS)") &&
      !route.includes('sourceAction === "restore" ? {} : { expectedAppAccountToken'),
    "Verified canonical state must reach the pure decision for restore and non-restore actions alike"
  );
  assert.ok(
    relink.indexOf("decideAppStoreAccountTokenAction") < relink.indexOf("isRelinkEligible") &&
      relink.indexOf("isRelinkEligible") < relink.indexOf("findUserMapping") &&
      relink.indexOf("findUserMapping") < relink.indexOf("reserveLineageClaim") &&
      relink.indexOf("reserveLineageClaim") < relink.indexOf("reassignAccountToken") &&
      relink.indexOf("reassignAccountToken") < relink.indexOf("reconcileSubscription"),
    "Restore relinking must decide, verify eligibility, check ownership, reserve, update Apple, then reverify"
  );
  assert.ok(
    server.includes("setAppAccountToken(input.originalTransactionId") &&
      server.includes("isAppStoreLineageRelinkEligible"),
    "The official Apple Set App Account Token endpoint and strict relink eligibility policy must be wired"
  );
  assert.ok(
    reserve.includes("pg_advisory_xact_lock") &&
      reserve.includes('"relinkPending" = TRUE') &&
      reserve.includes("lineage_claim_owned_by_another_account") &&
      reserve.includes("account_has_different_app_store_lineage") &&
      reserve.includes("reconciled_account_token_change_requires_ops") &&
      reserve.includes("lineage_claim_owned_by_legacy_subscription") &&
      !reserve.includes('INSERT INTO "AccountSubscription"') &&
      !reserve.includes('UPDATE "AccountSubscription"'),
    "A serialized lineage reservation must reject every other owner without granting an entitlement"
  );
  assert.ok(
    relink.includes("releasePendingLineageClaim") &&
      relink.includes("!error.retryable"),
    "A terminal Apple reassignment failure must release only the non-entitling pending claim"
  );
  assert.ok(
    notificationRoute.includes("isPendingAppStoreLineageClaim") &&
      notificationRoute.includes("pendingLineageClaim = isPendingAppStoreLineageClaim(storedState)") &&
      notificationRoute.includes('errorCode: pendingLineageClaim ? "relink_pending"') &&
      notificationRoute.includes("error.retryable || pendingLineageClaim"),
    "Notifications that race a pending relink must retry without granting from the old token"
  );
  assert.ok(
    route.includes('sourceAction === "purchase" || sourceAction === "transaction-update"') &&
      route.includes("!signedTransactionJWS") &&
      route.includes("shouldRetryAppStoreRelinkConfirmation({") &&
      route.includes("observationApplied: persisted.observationApplied") &&
      route.includes("relinkPending: persisted.state.relinkPending"),
    "The route must reject unsigned purchases and keep stale post-Set confirmations retryable"
  );
  assert.ok(
    relinkLibrary.includes("operationSucceeded") &&
      relinkLibrary.includes('"linked-active"') &&
      relinkLibrary.includes('"linked-inactive"') &&
      relinkLibrary.includes("message:") &&
      route.includes("...appStoreSyncResponsePayload({") &&
      route.includes("canonicalSubscription: canonical.snapshot") &&
      route.includes("personalSubscription") &&
      route.includes("effectiveSubscription: subscription") &&
      route.includes("state: persisted.state"),
    "Every accepted sync must return an explicit server-derived outcome and terminal message"
  );
  assert.ok(
    route.includes("submittedTransaction = validation.payload") &&
      route.includes("persistedState: persisted.state") &&
      relinkLibrary.includes("persistedPurchaseDate.getTime() > submittedPurchaseDate") &&
      relinkLibrary.includes("submittedOriginalTransactionId !== persistedOriginalTransactionId") &&
      server.includes("transactionPurchasedAt: toDate(transaction.purchaseDate)") &&
      state.includes('"transactionPurchasedAt" = EXCLUDED."transactionPurchasedAt"'),
    "A finish acknowledgement must prove exact or newer durable canonical coverage in the same Apple lineage"
  );

  assert.ok(
    nativeSync.includes("const sourceAction = result.action") &&
      nativeSync.includes('(result.action === "purchase" || result.action === "transaction-update")') &&
      nativeSync.includes('sourceAction !== "transaction-update"') &&
      nativeSync.includes("serverSyncPending: true") &&
      nativeSync.includes("subscription: authoritativeSubscription") &&
      nativeSync.includes("readAuthoritativeSubscription") &&
      nativeSync.includes("response.data.operationSucceeded === true") &&
      nativeSync.includes('response.data.syncOutcome === "linked-inactive"') &&
      nativeSync.includes("ok: operationSucceeded") &&
      !nativeSync.includes("data.subscription || result.subscription") &&
      !nativeSync.includes("data.subscription.plan"),
    "Native outcomes must come only from the server operation result, never a local snapshot or unrelated plan"
  );
  assert.ok(
    storeKitService.includes("Transaction.unfinished") &&
      storeKitService.includes("pendingTransactionUpdates") &&
      storeKitService.includes("stillPending.signedTransactionJWS == update.signedTransactionJWS") &&
      storeKitService.match(/\.finish\(\)/g)?.length === 1 &&
      !nativePurchaseBridge.includes("finishPendingTransaction") &&
      nativePurchaseBridge.includes("callAsyncJavaScript") &&
      nativePurchaseBridge.includes('arguments: ["resultJSON": json]') &&
      nativePurchaseBridge.includes("acceptedTransactionId == transactionId") &&
      nativePurchaseBridge.includes("accountDeletionFenceIsClear"),
    "Only the exact queued JWS may finish, after an awaited exact server acknowledgement and deletion-fence recheck"
  );
  assert.ok(
    nativeWebBridge.includes("window.__capitolWonkSyncAppStoreResult = sync") &&
      nativeWebBridge.includes("delete publicResult.signedTransactionJWS") &&
      nativeWebBridge.includes('window.addEventListener("online", requestPendingSync)'),
    "The root page bridge must own authenticated server sync, strip JWS data, and retry when connectivity returns"
  );
  assert.ok(
    !webControls.includes("shouldPreferNativeStoreKitSubscription") &&
      webControls.includes("if (result.serverSyncPending)") &&
      webControls.includes("Confirming this App Store purchase with CapitolWonk"),
    "Client controls must wait for server confirmation and never prefer an unaccepted device snapshot"
  );
}

async function main() {
  checkEligibilityBoundary();
  checkAccountTokenDecisionBoundary();
  checkTerminalResultBoundary();
  await checkNativeTransactionDeliveryBoundary();
  await checkSuccessfulRelinkOrder();
  await checkSameTokenBinding();
  await checkNonRestoreMismatchRejection();
  await checkOwnerConflictStopsBeforeSet();
  await checkRetryableSetRetainsReservation();
  await checkTerminalSetReleasesReservation();
  await checkPostSetConfirmationIsRetryable();
  await checkReconciledTokenRotationRequiresOperations();
  await checkConcurrentReservationAllowsOneSet();
  checkRelinkWiring();
  console.log("App Store relink orchestration and server-authority fixture check passed.");
  console.log("OPEN QA: real PostgreSQL advisory-lock concurrency and Apple Sandbox relink confirmation.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
