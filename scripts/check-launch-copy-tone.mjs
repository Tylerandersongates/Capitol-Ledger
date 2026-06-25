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
  "app/feedback",
  "app/alerts",
  "app/brief",
  "app/search",
  "app/bills",
  "app/members",
  "components/auth-flow-client.tsx",
  "components/beta-feedback-form.tsx",
  "components/beta-feedback-review-queue.tsx",
  "components/dashboard-client.tsx",
  "components/demo-auth-controls.tsx",
  "components/settings-account-sync-status.tsx",
  "components/subscription-controls.tsx",
  "lib/auth.ts",
  "lib/billing/app-store.ts",
  "lib/data.ts",
  "lib/demo-data.ts",
  "lib/member-scoring.ts",
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

const blockedPatterns = [
  {
    label: "Capitol Ledger without CE",
    pattern: /Capitol Ledger(?! CE)/g
  }
];

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
