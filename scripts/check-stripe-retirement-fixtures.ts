import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as seatHelpers from "@/lib/subscription-seat-count";
import { normalizeAccountSubscription } from "@/lib/account-subscription";
import { POST as portal } from "@/app/api/account/subscription/portal/route";
import { POST as webhook } from "@/app/api/billing/stripe/webhook/route";
import type { AccountSubscriptionSnapshot } from "@/types/capitol";


// Test-only module isolation: compile source text, never substitute its decision logic.
// Every dependency is explicitly stubbed; unknown imports fail instead of reaching services.
function loadFixtureModule<T>(relativePath: string, mocks: Record<string, unknown>, globals: Record<string, unknown> = {}, append = ""): T {
  const filename = new URL("../" + relativePath, import.meta.url);
  const source = readFileSync(filename, "utf8") + append;
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    fileName: relativePath
  }).outputText;
  const fixtureModule = { exports: {} };
  runInNewContext(output, {
    ...globals,
    module: fixtureModule,
    exports: fixtureModule.exports,
    require: (name: string) => {
      if (!Object.prototype.hasOwnProperty.call(mocks, name)) throw new Error("Unexpected fixture import: " + name);
      return mocks[name];
    }
  }, { filename: filename.pathname, timeout: 900 });
  return fixtureModule.exports as T;
}

async function checkSubscriptionApiRejection() {
  let writes = 0;
  const forbidden = () => { throw new Error("Unexpected fixture side effect"); };
  const stored = normalizeAccountSubscription({ provider: "app-store", plan: "pro", providerSubscriptionId: "original-api-fixture" });
  const api = loadFixtureModule<{ POST: (request: Request) => Promise<Response> }>("app/api/account/subscription/route.ts", {
    "next/server": { NextResponse: { json: (body: unknown, init?: ResponseInit) => Response.json(body, init) } },
    "@/lib/account-subscription": { normalizeAccountSubscription, getAccountSubscription: forbidden, setAccountSubscription: forbidden },
    "@/lib/account-database": {
      canUseDatabasePersistence: () => true,
      getAccountPersistenceUserId: async () => "fixture-user",
      readSubscriptionFromDatabase: async () => stored,
      writeSubscriptionToDatabase: async (_userId: string, value: Partial<AccountSubscriptionSnapshot>) => { writes += 1; return normalizeAccountSubscription(value); }
    },
    "@/lib/account-persistence-safety": {
      withAccountPersistenceRoute: (handler: unknown) => handler,
      fallbackUnlessAccountPersistenceUnavailable: forbidden,
      throwAccountPersistenceUnavailable: forbidden
    },
    "@/lib/auth": { getCurrentSession: async () => ({ user: { id: "fixture-user", email: "fixture@example.invalid" } }), requireAuthMessage: forbidden },
    "@/lib/billing/app-store-state": { readAppStoreSubscriptionState: forbidden },
    "@/lib/effective-account-subscription": { getEffectiveSubscriptionForAccountUser: forbidden },
    "@/lib/request-security": { guardMutationRequest: async () => null },
    "@/lib/team-invite-billing": { requiresAppleTeamBillingAcknowledgement: forbidden }
  }, { fetch: forbidden });
  for (const body of [
    { provider: "stripe", plan: "free" },
    { provider: "stripe", plan: "pro" },
    { provider: "unknown", plan: "free" },
    { provider: "", plan: "free" },
    { provider: "app-store", plan: "free" },
    { provider: "revenuecat", plan: "free" },
    { provider: "demo", plan: "pro" },
    { plan: "team" }
  ]) {
    const response = await api.POST(new Request("https://fixture.invalid/api/account/subscription", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body)
    }));
    assert.equal(response.status, 403, JSON.stringify(body));
    assert.equal(writes, 0);
    assert.equal(stored.provider, "app-store");
    assert.equal(stored.plan, "pro");
    assert.equal(stored.providerSubscriptionId, "original-api-fixture");
  }
  for (const body of [{ provider: "demo", plan: "free" }, { plan: "free" }]) {
    const previousWrites = writes;
    const response = await api.POST(new Request("https://fixture.invalid/api/account/subscription", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body)
    }));
    assert.equal(response.status, 200);
    assert.equal(writes, previousWrites + 1);
    assert.equal((await response.json()).subscription.plan, "free");
    assert.equal(stored.provider, "app-store");
    assert.equal(stored.plan, "pro");
  }
}

function checkStaleBrowserCache() {
  for (const provider of ["stripe", "unknown", "app-store"]) {
    for (const plan of ["pro", "team"]) {
      const reference = provider === "app-store" ? "original-browser-fixture" : "retired-browser-fixture";
      const cached = JSON.stringify({ provider, plan, cycle: "annual", status: "active", providerSubscriptionId: reference });
      let reads = 0;
      let writes = 0;
      let network = 0;
      const component = loadFixtureModule<{ __retirementReadSubscription: () => AccountSubscriptionSnapshot }>("components/subscription-controls.tsx", {
        "react": {}, "react/jsx-runtime": { jsx: () => null, jsxs: () => null }, "next/link": {}, "lucide-react": {},
        "@/lib/subscription-plans": {}, "@/lib/brand": { publicBrand: { name: "Fixture" } },
        "@/lib/browser-auth-state": { hasActiveBrowserSession: () => true, isBrowserAccountDeletionFenced: () => false },
        "@/lib/subscription-seat-count": seatHelpers
      }, {
        window: { localStorage: {
          getItem: (key: string) => { assert.equal(key, "capitol-ledger:subscription"); reads += 1; return cached; },
          setItem: () => { writes += 1; throw new Error("Unexpected cache rewrite"); }
        } },
        fetch: () => { network += 1; throw new Error("Unexpected browser network request"); }
      }, "\nexport const __retirementReadSubscription = readSubscription;\n");
      const snapshot = component.__retirementReadSubscription();
      assert.equal(reads, 1);
      assert.equal(snapshot.plan, provider === "app-store" ? plan : "free");
      assert.equal(snapshot.provider, provider === "app-store" ? "app-store" : "demo");
      if (provider === "app-store") assert.equal(snapshot.providerSubscriptionId, reference);
      else assert.notEqual(snapshot.providerSubscriptionId, reference);
      assert.equal(writes, 0);
      assert.equal(network, 0);
    }
  }
}

async function checkUnsupportedWorkerJobRetention() {
  for (const input of [
    { kind: "cancel_deleted_account_stripe_subscription", payload: { subscriptionId: "sub_retired_worker_fixture" } },
    { kind: "restore_team_member_subscription", payload: { userId: "fixture-member", previousSubscription: { provider: "stripe", plan: "pro", status: "active" } } }
  ]) {
    const payloadBefore = JSON.stringify(input.payload);
    const row = { id: "fixture-job", deletionRequestId: "fixture-deletion", ...input, attempts: 0, status: "pending", lastError: "" };
    let retained = true;
    let deletes = 0;
    let retries = 0;
    let claims = 0;
    let providerCalls = 0;
    let errorLogs = 0;
    const forbiddenProvider = () => { providerCalls += 1; throw new Error("Unexpected provider operation"); };
    const database = {
      $transaction: async (operation: (transaction: unknown) => unknown) => operation({
        $queryRawUnsafe: async (query: string, ...values: unknown[]) => {
          assert.ok(query.includes('FOR UPDATE SKIP LOCKED') && query.includes('RETURNING job."id"'));
          assert.deepEqual(values, [1, "fixture-deletion"]);
          claims += 1; row.status = "processing"; row.attempts += 1;
          return [{ ...row }];
        }
      }),
      $queryRaw: async (strings: TemplateStringsArray, ...values: unknown[]) => {
        assert.ok(strings.join("?").includes('SELECT EXISTS(SELECT 1 FROM "User"'));
        assert.deepEqual(values, ["fixture-member"]);
        return [{ exists: true }];
      },
      $executeRaw: async (strings: TemplateStringsArray, ...values: unknown[]) => {
        const query = strings.join("?");
        assert.deepEqual(values, ["fixture-job"]);
        if (query.includes('DELETE FROM "AccountDeletionCleanupJob"')) { retained = false; deletes += 1; return 1; }
        assert.ok(query.includes('UPDATE "AccountDeletionCleanupJob"') && query.includes('"status" = \'pending\''));
        retries += 1; row.status = "pending"; row.lastError = "Cleanup attempt failed; automatic retry remains pending.";
        return 1;
      }
    };
    const worker = loadFixtureModule<{ processAccountDeletionCleanupJobs: (options: { deletionRequestId: string; limit: number }) => Promise<{ claimed: number; completed: number; failed: number }> }>("lib/account-deletion-cleanup.ts", {
      "@/lib/account-subscription": { normalizeAccountSubscription, clearAccountSubscriptionMemory: forbiddenProvider },
      "@/lib/billing/app-store-server": { reconcileAppStoreSubscription: forbiddenProvider },
      "@/lib/billing/app-store": { createAppStoreAccountToken: forbiddenProvider },
      "@/lib/billing/app-store-state": { clearUnlinkedAppStoreSubscriptionProjection: forbiddenProvider, persistCanonicalAppStoreState: forbiddenProvider, readAppStoreSubscriptionState: forbiddenProvider },
      "@/lib/prisma": { getPrisma: () => database, hasDatabaseUrl: () => true },
      "@/lib/privacy-retention": { runPrivacyRetentionSweep: forbiddenProvider }
    }, { console: { error: () => { errorLogs += 1; } }, fetch: forbiddenProvider });
    const result = await worker.processAccountDeletionCleanupJobs({ deletionRequestId: "fixture-deletion", limit: 1 });
    assert.equal(result.claimed, 1);
    assert.equal(result.completed, 0);
    assert.equal(result.failed, 1);
    assert.equal(claims, 1);
    assert.equal(retries, 1);
    assert.equal(deletes, 0);
    assert.equal(retained, true);
    assert.equal(row.status, "pending");
    assert.equal(row.attempts, 1);
    assert.ok(row.lastError);
    assert.equal(JSON.stringify(row.payload), payloadBefore);
    assert.equal(providerCalls, 0);
    assert.equal(errorLogs, 1);
  }
}

async function main() {
  for (const provider of ["stripe", "unrecognized", ""]) {
    assert.throws(() => normalizeAccountSubscription({ provider, plan: "pro", status: "active" } as unknown as Partial<AccountSubscriptionSnapshot>));
  }
  for (const provider of ["demo", "app-store", "revenuecat"] as const) {
    assert.equal(normalizeAccountSubscription({ provider, plan: "pro" }).provider, provider);
  }
  assert.equal(normalizeAccountSubscription().plan, "free");
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;
  globalThis.fetch = async () => { fetchCalls += 1; throw new Error("Unexpected network request"); };
  try {
    for (const handler of [portal, webhook]) {
      const response = await handler();
      assert.equal(response.status, 410);
      assert.deepEqual(await response.json(), { code: "BILLING_ENDPOINT_RETIRED", error: "This billing endpoint is no longer available." });
    }
    assert.equal(fetchCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
  await checkSubscriptionApiRejection();
  checkStaleBrowserCache();
  await checkUnsupportedWorkerJobRetention();
  console.log("Stripe retirement fixtures passed.");
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
