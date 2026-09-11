#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import {
  accountDeletionCleanupKinds,
  executeAccountDeletionCleanupJob,
  type AccountDeletionCleanupDependencies
} from "@/lib/account-deletion-cleanup";
import {
  readStripeCustomerSubscriptionIds,
  StripeRequestError,
  verifyStripeWebhookSignature
} from "@/lib/billing/stripe";
import type { AccountSubscriptionSnapshot } from "@/types/capitol";

function fixtureDependencies(overrides: Partial<AccountDeletionCleanupDependencies> = {}) {
  const detached: string[] = [];
  const persisted: Array<{ subscription: AccountSubscriptionSnapshot; userId: string }> = [];
  const resumed: string[] = [];
  const dependencies: AccountDeletionCleanupDependencies = {
    accountExists: async () => true,
    detachStripeSubscription: async (subscriptionId) => {
      detached.push(subscriptionId);
    },
    persistMemberSubscription: async (userId, subscription) => {
      persisted.push({ subscription, userId });
    },
    readStripeCustomerSubscriptionIds: async () => ["sub_from_customer"],
    resumeStripeSubscription: async (subscriptionId) => {
      resumed.push(subscriptionId);
      return { cycle: "monthly", plan: "pro", status: "active" };
    },
    ...overrides
  };

  return { dependencies, detached, persisted, resumed };
}

async function main() {
  {
    const originalSecretKey = process.env.STRIPE_SECRET_KEY;
    const originalFetch = globalThis.fetch;
    const cursors: Array<string | null> = [];

    try {
      process.env.STRIPE_SECRET_KEY = "sk_test_fixture";
      globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
        const rawUrl = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
        const url = new URL(rawUrl);
        const cursor = url.searchParams.get("starting_after");
        cursors.push(cursor);

        assert.equal(url.pathname, "/v1/subscriptions");
        assert.equal(url.searchParams.get("customer"), "cus_paginated");
        assert.equal(url.searchParams.get("limit"), "100");
        assert.equal(url.searchParams.get("status"), "all");
        assert.equal(new Headers(init?.headers).get("authorization"), "Bearer sk_test_fixture");

        const page = cursor
          ? {
              data: [{ id: "sub_page_2", metadata: { plan: "team" } }],
              has_more: false
            }
          : {
              data: [
                { id: "sub_page_1", metadata: { plan: "pro" } },
                { id: "sub_unrelated", metadata: { plan: "free" } }
              ],
              has_more: true
            };
        return new Response(JSON.stringify(page), {
          headers: { "Content-Type": "application/json" },
          status: 200
        });
      }) as typeof globalThis.fetch;

      assert.deepEqual(
        await readStripeCustomerSubscriptionIds("cus_paginated"),
        ["sub_page_1", "sub_page_2"],
        "deleted-account cleanup must traverse every Stripe subscription page and retain only CapitolWonk subscriptions"
      );
      assert.deepEqual(cursors, [null, "sub_unrelated"], "Stripe pagination must advance from the last raw page object");

      globalThis.fetch = (async () => new Response(
        JSON.stringify({ data: [], has_more: true }),
        { headers: { "Content-Type": "application/json" }, status: 200 }
      )) as typeof globalThis.fetch;
      await assert.rejects(
        readStripeCustomerSubscriptionIds("cus_invalid_cursor"),
        /pagination returned an invalid cursor/,
        "a malformed Stripe page must fail cleanup instead of looping or silently truncating results"
      );

      let disappearingCustomerRequests = 0;
      globalThis.fetch = (async (input: RequestInfo | URL) => {
        disappearingCustomerRequests += 1;
        const rawUrl = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
        const cursor = new URL(rawUrl).searchParams.get("starting_after");
        if (!cursor) {
          return new Response(JSON.stringify({
            data: [{ id: "sub_before_missing_page", metadata: { plan: "pro" } }],
            has_more: true
          }), {
            headers: { "Content-Type": "application/json" },
            status: 200
          });
        }

        return new Response(JSON.stringify({
          error: { code: "resource_missing", message: "Customer disappeared during pagination." }
        }), {
          headers: { "Content-Type": "application/json" },
          status: 404
        });
      }) as typeof globalThis.fetch;
      await assert.rejects(
        readStripeCustomerSubscriptionIds("cus_disappearing"),
        (error) => error instanceof StripeRequestError && error.code === "resource_missing",
        "a later-page resource_missing response must remain retryable instead of discarding earlier subscription IDs"
      );
      assert.equal(disappearingCustomerRequests, 2);
    } finally {
      globalThis.fetch = originalFetch;
      if (originalSecretKey === undefined) delete process.env.STRIPE_SECRET_KEY;
      else process.env.STRIPE_SECRET_KEY = originalSecretKey;
    }
  }

  {
    const payload = JSON.stringify({ id: "evt_fixture" });
    const secret = "whsec_fixture";
    const now = 2_000_000_000;
    const sign = (timestamp: number) =>
      `t=${timestamp},v1=${createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex")}`;
    assert.equal(verifyStripeWebhookSignature(payload, sign(now), secret, now), true);
    assert.equal(verifyStripeWebhookSignature(payload, sign(now - 301), secret, now), false);
    assert.equal(verifyStripeWebhookSignature(payload, sign(now + 301), secret, now), false);
  }

  {
    const fixture = fixtureDependencies();
    await executeAccountDeletionCleanupJob(
      {
        kind: accountDeletionCleanupKinds.cancelDeletedAccountStripeSubscription,
        payload: { customerId: "cus_target", subscriptionId: "sub_target" }
      },
      fixture.dependencies
    );
    assert.deepEqual(fixture.detached, ["sub_target", "sub_from_customer"]);
  }

  {
    const fixture = fixtureDependencies();
    await executeAccountDeletionCleanupJob(
      {
        kind: accountDeletionCleanupKinds.cancelDeletedAccountStripeSubscription,
        payload: { customerId: "cus_target" }
      },
      fixture.dependencies
    );
    assert.deepEqual(fixture.detached, ["sub_from_customer"]);
  }

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
    assert.equal(fixture.persisted[0]?.userId, "member-user");
    assert.equal(fixture.persisted[0]?.subscription.plan, "pro");
    assert.equal(fixture.persisted[0]?.subscription.provider, "app-store");
    assert.deepEqual(fixture.resumed, []);
  }

  {
    const fixture = fixtureDependencies();
    await executeAccountDeletionCleanupJob(
      {
        kind: accountDeletionCleanupKinds.restoreTeamMemberSubscription,
        payload: {
          previousSubscription: {
            cycle: "monthly",
            plan: "pro",
            provider: "stripe",
            providerSubscriptionId: "sub_member",
            status: "canceled"
          },
          userId: "member-user"
        }
      },
      fixture.dependencies
    );
    assert.deepEqual(fixture.resumed, ["sub_member"]);
    assert.equal(fixture.persisted[0]?.subscription.plan, "pro");
    assert.equal(fixture.persisted[0]?.subscription.status, "active");
  }

  {
    const fixture = fixtureDependencies({
      resumeStripeSubscription: async () => ({ cycle: "monthly", plan: "free", status: "canceled" })
    });
    await executeAccountDeletionCleanupJob(
      {
        kind: accountDeletionCleanupKinds.restoreTeamMemberSubscription,
        payload: {
          previousSubscription: {
            cycle: "monthly",
            plan: "pro",
            provider: "stripe",
            providerSubscriptionId: "sub_member",
            status: "canceled"
          },
          userId: "member-user"
        }
      },
      fixture.dependencies
    );
    assert.equal(fixture.persisted[0]?.subscription.plan, "free");
    assert.equal(fixture.persisted[0]?.subscription.providerEntitlementId, "capitol-ledger-free");
  }

  {
    const fixture = fixtureDependencies({
      resumeStripeSubscription: async () => {
        throw new StripeRequestError("No such subscription", 404, "resource_missing");
      }
    });
    await executeAccountDeletionCleanupJob(
      {
        kind: accountDeletionCleanupKinds.restoreTeamMemberSubscription,
        payload: {
          previousSubscription: {
            cycle: "monthly",
            plan: "pro",
            provider: "stripe",
            providerSubscriptionId: "sub_missing",
            status: "canceled"
          },
          userId: "member-user"
        }
      },
      fixture.dependencies
    );
    assert.equal(fixture.persisted[0]?.subscription.plan, "free");
    assert.equal(fixture.persisted[0]?.subscription.providerEntitlementId, "capitol-ledger-free");
  }

  {
    const fixture = fixtureDependencies({
      detachStripeSubscription: async () => {
        throw new StripeRequestError("No such subscription", 404, "resource_missing");
      }
    });
    await executeAccountDeletionCleanupJob(
      {
        kind: accountDeletionCleanupKinds.cancelDeletedAccountStripeSubscription,
        payload: { subscriptionId: "sub_already_gone" }
      },
      fixture.dependencies
    );
    assert.deepEqual(fixture.detached, []);
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
      executeAccountDeletionCleanupJob(
        {
          kind: accountDeletionCleanupKinds.cancelDeletedAccountStripeSubscription,
          payload: { subscriptionId: "invalid" }
        },
        fixture.dependencies
      ),
      /Invalid deleted-account Stripe cleanup payload/
    );
  }

  console.log("Account deletion cleanup fixtures passed.");
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
