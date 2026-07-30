#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";

loadLocalEnv();

const requireProduction = process.env.SENTRY_REQUIRE_PRODUCTION === "true" || process.env.NODE_ENV === "production";
const checks = [];

function loadLocalEnv() {
  if (!existsSync(".env.local")) return;

  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;

    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    const rawValue = trimmed.slice(index + 1).trim();
    if (!key || process.env[key] !== undefined) continue;
    process.env[key] = rawValue.replace(/^['"]|['"]$/g, "");
  }
}

function read(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function record(ok, name, detail = "", warning = false) {
  checks.push({ name, ok: ok || warning });
  console.log(`${warning ? "WARN" : ok ? "PASS" : "FAIL"} ${name}${detail ? ` - ${detail}` : ""}`);
}

function requireValue(name, value, detail) {
  const configured = typeof value === "string" && value.trim().length > 0 && value !== "replace_me";
  if (configured) {
    record(true, `${name} is configured`);
    return;
  }

  record(false, `${name} is not configured`, detail, !requireProduction);
}

function requireDsn(name, value, detail) {
  const candidate = typeof value === "string" ? value.trim() : "";
  let valid = false;

  try {
    const parsed = new URL(candidate);
    valid =
      parsed.protocol === "https:" &&
      parsed.username.length > 0 &&
      parsed.hostname.length > 0 &&
      parsed.pathname.split("/").filter(Boolean).length > 0;
  } catch {
    valid = false;
  }

  record(valid, `${name} is a valid Sentry DSN`, detail, !requireProduction);
}

function requireFile(path) {
  record(existsSync(path), `${path} exists`);
}

function main() {
  console.log("Checking CapitolWonk CE feedback and error-monitoring readiness");

  for (const path of [
    "instrumentation-client.ts",
    "instrumentation.ts",
    "sentry.server.config.ts",
    "sentry.edge.config.ts",
    "app/global-error.tsx",
    "app/feedback/page.tsx",
    "components/feedback-form.tsx",
    "prisma/migrations/20260718154000_account_deletion_requests/migration.sql"
  ]) {
    requireFile(path);
  }

  const packageJson = read("package.json");
  const clientConfig = read("instrumentation-client.ts");
  const feedbackForm = read("components/feedback-form.tsx");
  const nextConfig = read("next.config.mjs");
  const nativeApp = read("ios/CapitolLedgerNative/CapitolLedgerNative/CapitolLedgerApp.swift");
  const nativeProject = read("ios/CapitolLedgerNative/CapitolLedgerNative.xcodeproj/project.pbxproj");
  const deletionService = read("lib/account-deletion.ts");

  record(packageJson.includes('"@sentry/nextjs"'), "Sentry Next.js SDK is installed");
  record(nextConfig.includes("withSentryConfig") && nextConfig.includes("SENTRY_AUTH_TOKEN"), "Sentry build integration is configured");
  record(
    clientConfig.includes("sendDefaultPii: false") &&
      clientConfig.includes("replaysSessionSampleRate: 0") &&
      clientConfig.includes("replaysOnErrorSampleRate: 0"),
    "Client monitoring disables default PII and session replay"
  );
  record(feedbackForm.includes("Sentry.sendFeedback") && feedbackForm.includes("includeReplay: false"), "App feedback sends directly to Sentry without replay");
  record(nativeProject.includes("sentry-cocoa") && nativeProject.includes("minimumVersion = 9.6.0"), "Sentry Cocoa package is pinned");
  record(nativeApp.includes("SentrySDK.start") && nativeApp.includes("sendDefaultPii = false"), "Native crash monitoring disables default PII");
  record(deletionService.includes('INSERT INTO "AccountDeletionRequest"'), "Account deletion no longer uses the feedback queue");

  console.log("\nProtected configuration");
  requireDsn("NEXT_PUBLIC_SENTRY_DSN", process.env.NEXT_PUBLIC_SENTRY_DSN, "Required for browser and WKWebView feedback delivery.");
  requireDsn("SENTRY_DSN", process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN, "Required for server and edge error monitoring.");
  requireValue("SENTRY_ORG", process.env.SENTRY_ORG, "Required for source-map ownership.");
  requireValue("SENTRY_PROJECT", process.env.SENTRY_PROJECT, "Required for source-map ownership.");
  requireValue("SENTRY_AUTH_TOKEN", process.env.SENTRY_AUTH_TOKEN, "Required for protected source-map upload.");
  requireDsn("CAPITOL_LEDGER_SENTRY_DSN", process.env.CAPITOL_LEDGER_SENTRY_DSN, "Set as a protected Xcode build value for native crash delivery.");

  const failures = checks.filter((check) => !check.ok);
  if (failures.length) {
    console.error(`Feedback readiness has ${failures.length} blocking issue(s).`);
    process.exit(1);
  }

  console.log("\nFeedback readiness check completed.");
  if (!requireProduction) {
    console.log("Use SENTRY_REQUIRE_PRODUCTION=true pnpm feedback:check after protected Sentry values are configured.");
  }
}

main();
