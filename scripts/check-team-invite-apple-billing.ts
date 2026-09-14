import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  appleSubscriptionManagementUrl,
  hasActivePersonalAppStorePro,
  openAppleSubscriptionManagement,
  requiresAppleTeamBillingAcknowledgement
} from "../lib/team-invite-billing";
import {
  acceptTeamInviteWithBillingGate,
  type TeamInviteAcceptanceDependencies
} from "../lib/team-invite-acceptance";
import type { AccountSubscriptionSnapshot } from "../types/capitol";

const testUser = { email: "tester@example.com", id: "auth-user", name: "Tester" };
const acceptedResult = {
  membership: { id: "member-1" },
  mode: "database" as const,
  workspace: { id: "workspace-1" }
} as never;

async function exerciseAcceptanceGate(input: {
  acknowledged?: boolean;
  state?: { appleStatus?: number; productId?: string } | null;
  stateError?: Error;
  subscription: AccountSubscriptionSnapshot;
}) {
  let acceptCalls = 0;
  const dependencies: TeamInviteAcceptanceDependencies = {
    acceptById: async () => {
      acceptCalls += 1;
      return acceptedResult;
    },
    acceptByToken: async () => {
      acceptCalls += 1;
      return acceptedResult;
    },
    getAccountUserId: async () => "account-user",
    getSubscription: async () => input.subscription,
    readAppStoreState: async () => {
      if (input.stateError) throw input.stateError;
      return input.state ?? null;
    }
  };
  const outcome = await acceptTeamInviteWithBillingGate(
    { appleBillingAcknowledged: input.acknowledged, inviteId: "invite-1" },
    testUser,
    dependencies
  );
  return { acceptCalls, outcome };
}

function subscription(provider: AccountSubscriptionSnapshot["provider"] = "app-store") {
  return {
    cycle: "monthly",
    plan: "pro",
    provider,
    providerEntitlementId: "com.capitolwonk.pro.monthly",
    status: "active",
    updatedAt: "2026-09-11T20:00:00.000Z"
  } satisfies AccountSubscriptionSnapshot;
}

async function main() {
  const activeStatuses = ["active", "trialing", "past_due"] as const;

  for (const status of activeStatuses) {
    assert.equal(
      hasActivePersonalAppStorePro({ plan: "pro", provider: "app-store", status }),
      true,
      `App Store Pro ${status} should require acknowledgement`
    );
  }

  assert.equal(
    hasActivePersonalAppStorePro({ plan: "pro", provider: "app-store", status: "canceled" }),
    false,
    "canceled App Store Pro should not require the active-subscription acknowledgement"
  );
  assert.equal(
    hasActivePersonalAppStorePro({ plan: "free", provider: "app-store", status: "active" }),
    false,
    "free App Store state should not require the Pro acknowledgement"
  );
  assert.equal(
    hasActivePersonalAppStorePro({ plan: "pro", provider: "stripe", status: "active" }),
    false,
    "legacy Stripe Pro should not be described as Apple billing"
  );
  assert.equal(hasActivePersonalAppStorePro(null), false, "missing subscription state should not be classified as active Apple Pro");
  assert.equal(appleSubscriptionManagementUrl, "https://apps.apple.com/account/subscriptions");
  assert.equal(openAppleSubscriptionManagement(), false, "server rendering must not attempt subscription management navigation");
  assert.equal(
    requiresAppleTeamBillingAcknowledgement(
      {
        plan: "free",
        provider: "app-store",
        providerEntitlementId: "com.capitolwonk.pro.monthly",
        status: "canceled"
      },
      { appleStatus: 3, productId: "com.capitolwonk.pro.monthly" }
    ),
    true,
    "Apple Pro in billing retry must require acknowledgement even when paid access is removed"
  );
  for (const appleStatus of [2, 5]) {
    assert.equal(
      requiresAppleTeamBillingAcknowledgement(
        {
          plan: "free",
          provider: "app-store",
          providerEntitlementId: "com.capitolwonk.pro.monthly",
          status: "canceled"
        },
        { appleStatus, productId: "com.capitolwonk.pro.monthly" }
      ),
      false,
      `terminal Apple status ${appleStatus} should not be described as continuing Pro billing`
    );
  }

  for (const appleStatus of [1, 3, 4]) {
    for (const acknowledged of [undefined, false]) {
      const blocked = await exerciseAcceptanceGate({
        acknowledged,
        state: { appleStatus, productId: "com.capitolwonk.pro.monthly" },
        subscription: subscription()
      });
      assert.equal(blocked.outcome.kind, "acknowledgement-required");
      assert.equal(blocked.acceptCalls, 0, `Apple status ${appleStatus} must not accept without acknowledgement`);
    }
    const accepted = await exerciseAcceptanceGate({
      acknowledged: true,
      state: { appleStatus, productId: "com.capitolwonk.pro.monthly" },
      subscription: subscription()
    });
    assert.equal(accepted.outcome.kind, "accepted");
    assert.equal(accepted.acceptCalls, 1, `Apple status ${appleStatus} should accept exactly once after acknowledgement`);
  }

  for (const appleStatus of [2, 5]) {
    const terminal = await exerciseAcceptanceGate({
      state: { appleStatus, productId: "com.capitolwonk.pro.monthly" },
      subscription: subscription()
    });
    assert.equal(terminal.outcome.kind, "accepted");
    assert.equal(terminal.acceptCalls, 1, `terminal Apple status ${appleStatus} should accept without acknowledgement`);
  }

  const nonApple = await exerciseAcceptanceGate({ subscription: subscription("stripe") });
  assert.equal(nonApple.outcome.kind, "accepted");
  assert.equal(nonApple.acceptCalls, 1, "non-Apple subscriptions should accept without Apple acknowledgement");

  const stateFailure = new Error("state unavailable");
  let failureAcceptCalls = 0;
  await assert.rejects(
    acceptTeamInviteWithBillingGate(
      { appleBillingAcknowledged: true, inviteId: "invite-1" },
      testUser,
      {
        acceptById: async () => {
          failureAcceptCalls += 1;
          return acceptedResult;
        },
        acceptByToken: async () => {
          failureAcceptCalls += 1;
          return acceptedResult;
        },
        getAccountUserId: async () => "account-user",
        getSubscription: async () => subscription(),
        readAppStoreState: async () => {
          throw stateFailure;
        }
      }
    ),
    stateFailure
  );
  assert.equal(failureAcceptCalls, 0, "state-read failure must fail closed before invite acceptance");

  const controls = await readFile(
    new URL("../components/team-invite-acceptance-controls.tsx", import.meta.url),
    "utf8"
  );
  const route = await readFile(
    new URL("../app/api/team/invites/accept/route.ts", import.meta.url),
    "utf8"
  );
  const alerts = await readFile(
    new URL("../components/alerts-inbox-client.tsx", import.meta.url),
    "utf8"
  );

  assert.match(
    controls,
    /Joining this Team does not pause or cancel your personal Apple subscription\./,
    "invite acceptance should truthfully explain Apple billing continuity"
  );
  assert.match(
    controls,
    /I understand joining this Team does not pause or cancel my Apple subscription\./,
    "active Apple Pro acceptance should require an explicit acknowledgement"
  );
  assert.match(
    controls,
    /needsAppleBillingAcknowledgement && !appleBillingAcknowledged/,
    "the accept action should remain gated until acknowledgement"
  );
  assert.match(
    controls,
    /appleBillingAcknowledged: needsAppleBillingAcknowledgement && appleBillingAcknowledged/,
    "the acceptance request should carry only an explicit acknowledgement"
  );
  assert.match(
    controls,
    /onClick=\{openAppleSubscriptionManagement\}/,
    "the warning should use native subscription management with a web fallback"
  );
  assert.doesNotMatch(controls, /target="_blank"/, "the native WebView must not depend on target-blank navigation");
  assert.doesNotMatch(
    controls,
    /\/api\/account\/subscription\/(?:app-store|portal)|pausePersonalProSubscription|cancelStripeSubscription/,
    "the client acceptance control must not call provider mutation or transition helpers"
  );
  assert.match(route, /acceptTeamInviteWithBillingGate\(body, session\.user\)/, "the API must use the executable server-side billing gate");
  assert.match(
    route,
    /APPLE_BILLING_ACKNOWLEDGEMENT_REQUIRED/,
    "the API should return a stable acknowledgement-required code"
  );
  assert.ok(
    route.indexOf("APPLE_BILLING_ACKNOWLEDGEMENT_REQUIRED") < route.indexOf("const result = outcome.result"),
    "the API acknowledgement gate must run before Team membership is accepted"
  );
  assert.match(
    alerts,
    /appleBillingAcknowledged: acknowledgementRequired && appleBillingAcknowledged/,
    "Alerts invite acceptance must send an explicit billing acknowledgement"
  );
  assert.match(
    alerts,
    /onClick=\{openAppleSubscriptionManagement\}/,
    "Alerts should use native subscription management with a web fallback"
  );
  assert.doesNotMatch(alerts, /target="_blank"/, "Alerts must not depend on unsupported target-blank navigation");
  assert.match(
    controls,
    /data\?\.code === "APPLE_BILLING_ACKNOWLEDGEMENT_REQUIRED"/,
    "the token invite flow must recover if Apple billing changes after its initial check"
  );
  assert.match(
    alerts,
    /data\?\.code === "APPLE_BILLING_ACKNOWLEDGEMENT_REQUIRED"/,
    "Alerts must recover when Apple billing becomes active after its initial state was rendered"
  );
  assert.match(
    alerts,
    /appleBillingAcknowledgementRequired && !appleBillingAcknowledged/,
    "Alerts must block acceptance until the acknowledgement is checked"
  );
  for (const caller of [controls, alerts]) {
    assert.doesNotMatch(
      caller,
      /JSON\.stringify\(\{\s*(?:inviteId|token)\s*:/,
      "every direct Team acceptance caller must include the Apple billing acknowledgement field"
    );
  }

  console.log("Team invite Apple billing acknowledgement checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
