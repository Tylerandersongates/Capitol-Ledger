import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { defaultPublicBrandName, getPublicBrandName } from "../lib/brand";

const originalName = process.env.NEXT_PUBLIC_APP_NAME;
try {
  for (const name of [undefined, "", "  ", "CapitolWonk", ["CapitolWonk", "CE"].join(" "), "  capitolwonk ce  "]) {
    if (name === undefined) delete process.env.NEXT_PUBLIC_APP_NAME;
    else process.env.NEXT_PUBLIC_APP_NAME = name;
    assert.equal(getPublicBrandName(), "CapitolWonk", "Default and legacy overrides must use the current public name.");
  }
  process.env.NEXT_PUBLIC_APP_NAME = "  Custom Brand  ";
  assert.equal(getPublicBrandName(), "Custom Brand", "Unrelated custom names should remain configurable.");
  assert.equal(defaultPublicBrandName, "CapitolWonk");
} finally {
  if (originalName === undefined) delete process.env.NEXT_PUBLIC_APP_NAME;
  else process.env.NEXT_PUBLIC_APP_NAME = originalName;
}

const files = [...new Set(execFileSync("git", ["ls-files", "-co", "--exclude-standard", "-z"], { encoding: "utf8" }).split("\0"))];
const textFile = /\.(?:tsx?|mjs|cjs|js|json|md|svg|py|pbxproj|plist|html|css|yml|yaml)$/;
const retiredName = /Capitol(?:Wonk| Wonk| Ledger)\s+CE\b/i;
const stale = files.filter((file) => {
  // Dated handoffs preserve what actually happened; binary exports are archived.
  if (!file || /^docs\/eod-handoff-\d/.test(file) || file === "scripts/check-public-brand.ts") return false;
  if (!textFile.test(file) && file !== ".env.example") return false;
  return retiredName.test(readFileSync(file, "utf8"));
});
assert.deepEqual(stale, [], "Active project text must not restore the retired public name.");

const project = readFileSync("ios/CapitolLedgerNative/CapitolLedgerNative.xcodeproj/project.pbxproj", "utf8");
const displayNames = [...project.matchAll(/APP_DISPLAY_NAME = "([^"]+)";/g)].map((match) => match[1]);
assert.deepEqual(displayNames, ["CapitolWonk", "CapitolWonk"], "Both native configurations must use the public name.");
assert.match(readFileSync(".env.example", "utf8"), /^NEXT_PUBLIC_APP_NAME="?CapitolWonk"?$/m);
for (const file of ["components/feedback-form.tsx", "app/global-error.tsx"]) {
  assert.ok(readFileSync(file, "utf8").includes('from "@/lib/brand"'), `${file} must use the shared brand.`);
}
console.log("Public brand check passed: current name, legacy override, active text, and native display names.");
