#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, statSync } from "fs";

const launchFacingPaths = [
  "app/sign-in",
  "app/account",
  "app/dashboard",
  "app/settings",
  "app/privacy",
  "app/support",
  "app/upgrade",
  "app/onboarding",
  "app/petitions",
  "app/team",
  "app/feedback",
  "app/alerts",
  "app/brief",
  "app/search",
  "app/bills",
  "app/members",
  "app/api/account/subscription/app-store",
  "app/api/members",
  "components/auth-flow-client.tsx",
  "components/beta-feedback-form.tsx",
  "components/beta-feedback-review-queue.tsx",
  "components/dashboard-client.tsx",
  "components/demo-auth-controls.tsx",
  "components/member-email-action.tsx",
  "components/settings-account-sync-status.tsx",
  "components/subscription-controls.tsx",
  "lib/auth.ts",
  "lib/brand.ts",
  "lib/billing/app-store.ts",
  "lib/congress/normalizers.ts",
  "lib/data.ts",
  "lib/demo-data.ts",
  "lib/member-scoring.ts",
  "lib/senate-votes.ts",
  "lib/weekly-brief.ts"
];

const blockedPhrases = [
  "browser preview",
  "Demo-mode",
  "Demo mode",
  "demo mode",
  "Use demo mode",
  "Continue in demo mode",
  "captured in demo mode",
  "In-app beta",
  "This beta brief",
  "beta brief",
  "Premium Brief",
  "View Upgrade Options",
  "View Pro Options",
  "Demo fallback",
  "Locked preview",
  "Pro or Team",
  "coming soon",
  "Coming soon",
  "live app wording",
  "Annual upgrade",
  "Tap-only input issue",
  "Demo Citizen",
  "Preview report export",
  "Test checkout",
  "No real payment",
  "Stripe Checkout",
  "fake Stripe",
  "live Stripe checkout"
];

const legacyBrandName = ["Capitol", "Ledger"].join(" ");
const retiredPublicBrandName = `${legacyBrandName} CE`;

const blockedPatterns = [
  {
    label: "legacy brand without CE",
    pattern: new RegExp(`${legacyBrandName}(?! CE)`, "g")
  },
  {
    label: "retired public brand placeholder",
    pattern: new RegExp(retiredPublicBrandName, "g")
  }
];

const allowedHardcodedBrandFiles = new Set(["lib/brand.ts"]);

function listFiles(path) {
  if (!existsSync(path)) return [];

  const stat = statSync(path);
  if (stat.isFile()) return [path];

  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    const child = `${path}/${entry.name}`;
    if (entry.isDirectory()) return listFiles(child);
    if (/\.(tsx?|jsx?)$/.test(entry.name)) return [child];
    return [];
  });
}

const files = [...new Set(launchFacingPaths.flatMap(listFiles))];
const failures = [];

for (const file of files) {
  const source = readFileSync(file, "utf8");
  for (const phrase of blockedPhrases) {
    if (source.includes(phrase)) failures.push({ file, phrase });
  }
  for (const { label, pattern } of blockedPatterns) {
    if (label === "hardcoded public brand name" && allowedHardcodedBrandFiles.has(file)) {
      pattern.lastIndex = 0;
      continue;
    }
    if (pattern.test(source)) failures.push({ file, phrase: label });
    pattern.lastIndex = 0;
  }
}

if (failures.length) {
  console.error("Launch copy tone check failed.");
  for (const failure of failures) {
    console.error(`- ${failure.file}: remove '${failure.phrase}' from launch-facing copy`);
  }
  process.exit(1);
}

console.log("Launch copy tone check passed.");
