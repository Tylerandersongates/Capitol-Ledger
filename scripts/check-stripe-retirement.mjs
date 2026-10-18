import assert from "node:assert/strict";
import { lstatSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const retired = ["lib/billing/stripe.ts", "lib/billing/subscription-event-guards.ts", "scripts/audit-legacy-billing-state.ts", "scripts/check-pre-migration-stripe-compatibility.mjs", "scripts/check-pre-migration-stripe-compatibility-fixtures.ts"];
for (const file of retired) {
  try { lstatSync(file); } catch (error) {
    if (error.code === "ENOENT") continue;
    throw error;
  }
  assert.fail("Retired source must be absent: " + file);
}
function inspect(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    assert.equal(entry.isSymbolicLink(), false, "Unexpected source symlink: " + file);
    if (entry.isDirectory()) inspect(file);
    else if (/\.(?:[cm]?js|jsx|tsx?)$/.test(file)) {
      assert.ok(lstatSync(file).size <= 1048576, "Oversized source: " + file);
      assert.doesNotMatch(readFileSync(file, "utf8"), /stripe/i, "Retired provider code remains: " + file);
    }
  }
}
for (const directory of ["app", "components", "lib", "types"]) inspect(directory);
for (const file of ["app/api/account/subscription/portal/route.ts", "app/api/billing/stripe/webhook/route.ts"]) {
  assert.equal(readFileSync(file, "utf8"), "import { NextResponse } from \"next/server\";\n\nexport async function POST() {\n  return NextResponse.json(\n    {\n      code: \"BILLING_ENDPOINT_RETIRED\",\n      error: \"This billing endpoint is no longer available.\"\n    },\n    { status: 410 }\n  );\n}\n", "Retired endpoint must be exactly inert: " + file);
}
const manifest = JSON.parse(readFileSync("package.json", "utf8"));
assert.equal(manifest.scripts["pre-migration-stripe-compatibility:check"], undefined);
assert.equal(manifest.scripts["billing-legacy:audit"], undefined);
assert.ok(manifest.scripts["billing:check"].includes("pnpm run stripe-retirement:check"));
const api = readFileSync("app/api/account/subscription/route.ts", "utf8");
assert.ok(api.includes('const provider = value.provider;') && api.includes('return plan === "free" && (provider === undefined || provider === "demo");'), "Unknown client providers must be rejected");
const client = readFileSync("components/subscription-controls.tsx", "utf8");
assert.ok(client.includes('value.provider !== "app-store") {\n    return { ...defaultSubscription };'), "Unsupported cached providers must not retain paid access");
console.log("Stripe retirement source checks passed.");
