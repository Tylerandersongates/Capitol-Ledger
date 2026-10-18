#!/usr/bin/env node

import assert from "node:assert/strict";
import {
  accountDeletionCleanupKinds,
  executeAccountDeletionCleanupJob,
  type AccountDeletionCleanupDependencies
} from "@/lib/account-deletion-cleanup";
import type { AccountSubscriptionSnapshot } from "@/types/capitol";

function fixtureDependencies(overrides: Partial<AccountDeletionCleanupDependencies> = {}) {
  const persisted: Array<{ subscription: AccountSubscriptionSnapshot; userId: string }> = [];
  const appStoreReconciliations: string[] = [];
  const dependencies: AccountDeletionCleanupDependencies = {
    accountExists: async () => true,
    persistMemberSubscription: async (userId, subscription) => {
      persisted.push({ subscription, userId });
    },
    reconcileAppStoreSubscriptionForMember: async (userId) => {
      appStoreReconciliations.push(userId);
    },
    ...overrides
  };

  return { appStoreReconciliations, dependencies, persisted };
}

async function main() {

  {
    const fixture = fixtureDependencies();
    await executeAccountDeletionCleanupJob(
      {
        kind: accountDeletionCleanupKinds.restoreTeamMemberSubscription,
        payload: {
          previousSubscription: {
            cycle: "annual",
            plan: "pro",
            provider: "app-store",
            providerSubscriptionId: "app-store-member",
            status: "active"
          },
          userId: "member-user"
        }
      },
      fixture.dependencies
    );
    assert.equal(fixture.persisted.length, 0, "App Store cleanup must not rewrite a fenced canonical projection generically");
    assert.deepEqual(fixture.appStoreReconciliations, ["member-user"]);
  }

  {
    const fixture = fixtureDependencies({
      reconcileAppStoreSubscriptionForMember: async () => undefined
    });
    await executeAccountDeletionCleanupJob(
      {
        kind: accountDeletionCleanupKinds.restoreTeamMemberSubscription,
        payload: {
          previousSubscription: {
            cycle: "annual",
            plan: "pro",
            provider: "app-store",
            providerSubscriptionId: "stale-apple-lineage",
            status: "active"
          },
          userId: "member-user"
        }
      },
      fixture.dependencies
    );
    assert.equal(fixture.persisted.length, 0, "Inactive App Store reconciliation must remain inside the fenced persistence path");
  }

  {
    const fixture = fixtureDependencies({
      reconcileAppStoreSubscriptionForMember: async () => {
        throw new Error("Apple reconciliation temporarily unavailable");
      }
    });
    await assert.rejects(
      executeAccountDeletionCleanupJob(
        {
          kind: accountDeletionCleanupKinds.restoreTeamMemberSubscription,
          payload: {
            previousSubscription: {
              cycle: "annual",
              plan: "pro",
              provider: "app-store",
              providerSubscriptionId: "stale-apple-lineage",
              status: "active"
            },
            userId: "member-user"
          }
        },
        fixture.dependencies
      ),
      /Apple reconciliation temporarily unavailable/,
      "Apple provider failures must leave the cleanup job retryable instead of restoring stale access"
    );
    assert.equal(fixture.persisted.length, 0);
  }

  for (const provider of ["demo", "revenuecat"] as const) {
    const fixture = fixtureDependencies();
    await executeAccountDeletionCleanupJob(
      {
        kind: accountDeletionCleanupKinds.restoreTeamMemberSubscription,
        payload: {
          previousSubscription: {
            cycle: "monthly",
            plan: "pro",
            provider,
            providerSubscriptionId: `${provider}-ended`,
            status: "canceled"
          },
          userId: "member-user"
        }
      },
      fixture.dependencies
    );
    assert.equal(
      fixture.persisted[0]?.subscription.plan,
      "free",
      `An unvalidated canceled ${provider} snapshot must not restore paid access`
    );
    assert.equal(fixture.persisted[0]?.subscription.providerEntitlementId, "capitol-ledger-free");
  }

  {
    const fixture = fixtureDependencies({ accountExists: async () => false });
    await executeAccountDeletionCleanupJob(
      {
        kind: accountDeletionCleanupKinds.restoreTeamMemberSubscription,
        payload: { previousSubscription: { plan: "pro" }, userId: "deleted-member" }
      },
      fixture.dependencies
    );
    assert.equal(fixture.persisted.length, 0);
  }

  {
    const fixture = fixtureDependencies();
    await assert.rejects(
      executeAccountDeletionCleanupJob({ kind: "cancel_deleted_account_stripe_subscription", payload: {} }, fixture.dependencies),
      /Unsupported account-deletion cleanup job/
    );
    assert.equal(fixture.persisted.length, 0);
    assert.deepEqual(fixture.appStoreReconciliations, []);
    await assert.rejects(
      executeAccountDeletionCleanupJob({
        kind: accountDeletionCleanupKinds.restoreTeamMemberSubscription,
        payload: { userId: "member-user", previousSubscription: { provider: "stripe", plan: "pro", status: "active" } }
      }, fixture.dependencies)
    );
    assert.equal(fixture.persisted.length, 0);
  }

  console.log("Account deletion cleanup fixtures passed.");
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
