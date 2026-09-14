#!/usr/bin/env node

import assert from "node:assert/strict";
import {
  isPrivacyRequestMonitorEnabled,
  privacyRequestAgeBand,
  readPrivacyRequestMonitor,
  type PrivacyRequestMonitorDatabaseClient
} from "@/lib/privacy-request-monitor";

for (const value of [undefined, "", "false", "TRUE", "1", "true "]) {
  assert.equal(
    isPrivacyRequestMonitorEnabled({ PRIVACY_REQUEST_MONITOR_ENABLED: value }),
    false,
    `PRIVACY_REQUEST_MONITOR_ENABLED=${String(value)} must fail closed`
  );
}
assert.equal(isPrivacyRequestMonitorEnabled({ PRIVACY_REQUEST_MONITOR_ENABLED: "true" }), true);

assert.equal(privacyRequestAgeBand(null), "none");
assert.equal(privacyRequestAgeBand(-1), "under_24_hours");
assert.equal(privacyRequestAgeBand(24 * 60 * 60 - 1), "under_24_hours");
assert.equal(privacyRequestAgeBand(24 * 60 * 60), "one_to_three_days");
assert.equal(privacyRequestAgeBand(4 * 24 * 60 * 60), "four_to_seven_days");
assert.equal(privacyRequestAgeBand(8 * 24 * 60 * 60), "over_seven_days");

async function main() {
  const calls: Array<{ query: string; values: unknown[] }> = [];
  const database: PrivacyRequestMonitorDatabaseClient = {
    async $queryRawUnsafe<T>(query: string, ...values: unknown[]) {
      calls.push({ query, values });
      return [{
        deniedCount: "1",
        duplicateCount: "2",
        fulfilledCount: 3,
        newCount: "4",
        newOldestAgeSeconds: 2 * 60 * 60,
        noActionNeededCount: 5,
        partiallyFulfilledCount: 6,
        redirectedToAccountDeletionCount: 7,
        reviewingCount: 8,
        reviewingOldestAgeSeconds: 5 * 24 * 60 * 60,
        withdrawnCount: 9
      }] as unknown as T;
    }
  };

  const disabled = await readPrivacyRequestMonitor({ database, environment: {} });
  assert.deepEqual(disabled, { enabled: false, snapshot: null });
  assert.equal(calls.length, 0, "the disabled monitor must not read the database");

  const now = new Date("2026-09-14T19:00:00.000Z");
  const enabled = await readPrivacyRequestMonitor({
    database,
    environment: { PRIVACY_REQUEST_MONITOR_ENABLED: "true" },
    now
  });
  assert.equal(enabled.enabled, true);
  assert.equal(enabled.snapshot?.generatedAt, now.toISOString());
  assert.deepEqual(enabled.snapshot?.queue, {
    new: { count: 4, oldestAgeBand: "under_24_hours" },
    reviewing: { count: 8, oldestAgeBand: "four_to_seven_days" }
  });
  assert.deepEqual(enabled.snapshot?.resolvedByResolution, {
    denied: 1,
    duplicate: 2,
    fulfilled: 3,
    no_action_needed: 5,
    partially_fulfilled: 6,
    redirected_to_account_deletion: 7,
    withdrawn: 9
  });

  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0]?.values, [now]);
  assert.doesNotMatch(calls[0]?.query ?? "", /"id"|"userId"|"detail"|email|payload/i);
  assert.match(calls[0]?.query ?? "", /COUNT\(\*\) FILTER/);
}

main()
  .then(() => {
    console.log("Privacy-request aggregate monitor fixtures passed.");
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
