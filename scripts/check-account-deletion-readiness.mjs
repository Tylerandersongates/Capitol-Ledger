#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

const route = read("app/api/account/deletion-request/route.ts");
const service = read("lib/account-deletion.ts");
const control = read("components/account-deletion-control.tsx");
const settings = read("app/settings/page.tsx");
const privacy = read("app/privacy/page.tsx");

assert.ok(route.includes('body.confirmation !== "DELETE"'), "deletion requests should require explicit DELETE confirmation");
assert.ok(route.includes("subscriptionAcknowledged"), "deletion requests should require the Apple billing acknowledgement");
assert.ok(service.includes('requestType: accountDeletionRequestType'), "deletion requests should enter the durable account review queue");
assert.ok(service.includes("accountDeletionCompletionDays = 7"), "deletion requests should state a seven-day completion target");
assert.ok(control.includes("Request account deletion"), "settings should provide an in-app deletion request action");
assert.ok(control.includes("Deleting CapitolWonk does not cancel an Apple subscription"), "the flow should explain Apple billing continuity");
assert.ok(settings.includes("AccountDeletionControl"), "settings should expose the account deletion control");
assert.ok(privacy.includes("Settings > Your data"), "privacy copy should point users to the in-app deletion flow");

console.log("Account deletion readiness check passed.");
