import { createHash } from "node:crypto";

// Temporary, exact compatibility boundary for the reviewed braces-exception CI.
// Pin the entire workflow, not command substrings: comments, disabled steps,
// continue-on-error, privilege changes and reordered gates must not count.
// The reviewed workflow runs production audit, both regression suites, braces
// preflight, release-source checks, Build, then the final raw-audit gate.
// Any workflow edit (even formatting) requires explicit review and a new pin.
const reviewedWorkflowSha256 = "61c4e0a3534e121176e494435578f3bdf8b1cf14ede7cdabe5a0acd5b561f66f";
const strictCandidate = "pnpm run audit:prod && pnpm run audit:full && BILLING_REQUIRE_APP_STORE=true TESTFLIGHT_REQUIRE_READY=true pnpm run release-source:check";

export function hasBillingCiCoverage(packageManifest, workflow) {
  if (typeof packageManifest !== "string" || typeof workflow !== "string") return false;

  let manifest;
  try {
    manifest = JSON.parse(packageManifest);
  } catch {
    return false;
  }
  const scripts = manifest?.scripts;
  if (!scripts || typeof scripts !== "object" || Array.isArray(scripts)) return false;

  // Preserve the independent raw production/full audits and strict candidate
  // wrapper. The temporary CI exception does not authorize a candidate release.
  return scripts["audit:prod"] === "pnpm audit --prod --audit-level high" &&
    scripts["audit:full"] === "pnpm audit --audit-level high" &&
    scripts["release-candidate:check"] === strictCandidate &&
    typeof scripts["release-source:check"] === "string" &&
    scripts["release-source:check"].split(" && ").includes("pnpm run billing:check") &&
    typeof scripts["billing:check"] === "string" &&
    scripts["billing:check"].startsWith("node scripts/check-billing-readiness.mjs && ") &&
    createHash("sha256").update(workflow, "utf8").digest("hex") === reviewedWorkflowSha256;
}
