#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

const activation = read("lib/privacy-request-activation.ts");
const contract = read("lib/privacy-request-contract.ts");
const monitor = read("lib/privacy-request-monitor.ts");
const monitorReader = read("scripts/read-privacy-request-monitor.ts");
const service = read("lib/privacy-requests.ts");
const route = read("app/api/privacy/requests/route.ts");
const page = read("app/privacy/request/page.tsx");
const privacy = read("app/privacy/page.tsx");
const support = read("app/support/page.tsx");
const feedback = read("components/feedback-form.tsx");
const middleware = read("middleware.ts");
const schema = read("prisma/schema.prisma");
const migration = read("prisma/migrations/20260912120000_privacy_request_intake/migration.sql");
const accountDeletion = read("lib/account-deletion.ts");
const environment = read(".env.example");
const packageJson = read("package.json");

assert.ok(environment.includes('PRIVACY_REQUEST_INTAKE_ENABLED="false"'), "privacy intake must default off");
assert.ok(environment.includes('PRIVACY_REQUEST_EMAIL=""'), "fallback mailbox must be explicit and blank by default");
assert.ok(environment.includes('PRIVACY_REQUEST_MONITOR_ENABLED="false"'), "privacy monitor must default off");
assert.ok(activation.includes('=== "true"'), "only exact true may activate first-party privacy intake");
assert.ok(activation.includes("return null"), "an invalid or missing fallback mailbox must fail closed");

const getGate = route.indexOf("async function getPrivacyRequests");
const postGate = route.indexOf("async function createPrivacyRequest");
assert.ok(route.indexOf("if (!isPrivacyRequestIntakeEnabled())", getGate) < route.indexOf("getProductionSession", getGate), "GET must gate before account access");
assert.ok(route.indexOf("if (!isPrivacyRequestIntakeEnabled())", postGate) < route.indexOf("request.text()", postGate), "POST must gate before body parsing");
assert.ok(route.includes("includeUnverified: true"), "persisted sessions may use privacy intake before email verification completes");
assert.ok(route.includes("guardMutationRequest") && route.includes("24 * 60 * 60 * 1000"), "privacy intake needs origin and account rate limits");
assert.ok(route.includes("TextEncoder") && route.includes("privacyRequestBodyLimit"), "privacy request bodies must be bounded before JSON parsing");
assert.ok(!route.includes("Sentry"), "privacy requests must not be sent to Sentry");

assert.ok(contract.includes("z.enum(privacyRequestTypes)"), "request types must use a closed allowlist");
assert.ok(contract.includes(".strict()"), "unexpected privacy request fields must be rejected");
assert.ok(contract.includes("privacyRequestDetailMaxLength = 1000"), "free-form detail must be short and bounded");
assert.ok(service.includes('INSERT INTO "PrivacyRequest"'), "privacy requests need dedicated first-party storage");
assert.ok(service.includes('ON CONFLICT ("userId", "requestType")'), "active duplicate requests must be idempotent");
assert.ok(service.includes("runAccountPersistenceOperation"), "database errors must fail closed through account-persistence handling");
assert.ok(!service.includes("console."), "privacy-request service must not log request payloads");
assert.ok(monitor.includes('PRIVACY_REQUEST_MONITOR_ENABLED === "true"'), "privacy monitor must require exact opt-in");
assert.ok(monitor.includes('FROM "PrivacyRequest"'), "privacy monitor must read the dedicated queue");
assert.ok(monitor.includes("COUNT(*) FILTER"), "privacy monitor must expose aggregate counts only");
assert.ok(!monitor.includes('SELECT "id"') && !monitor.includes('"userId"') && !monitor.includes('"detail"'), "privacy monitor must not select request payload or identifiers");
assert.ok(monitorReader.includes("JSON.stringify(result"), "privacy monitor reader must emit only the aggregate result");

assert.ok(schema.includes("model PrivacyRequest"), "Prisma schema must include the privacy-request model");
assert.ok(migration.includes('ON DELETE CASCADE'), "account deletion must erase account-linked privacy requests");
assert.ok(migration.includes('PrivacyRequest_requestType_check'), "database request types must be constrained");
assert.ok(migration.includes('PrivacyRequest_detail_length_check'), "database detail length must be constrained");
assert.ok(migration.includes('PrivacyRequest_status_check'), "database statuses must be constrained");
assert.ok(migration.includes('PrivacyRequest_resolution_check'), "database resolution categories must be constrained");
assert.ok(migration.includes('PrivacyRequest_one_active_type_per_user_idx'), "database idempotency must be race-safe");
assert.ok(accountDeletion.includes('FROM "PrivacyRequest" WHERE "userId" = $1'), "account deletion must verify privacy-request erasure");

assert.ok(page.includes("PrivacyRequestForm") && page.includes("getProductionSession"), "the first-party page must be authenticated");
assert.ok(page.includes('dynamic = "force-dynamic"'), "the privacy page must not be frozen in its gate-off build state");
assert.ok(page.includes("does not send the request to Sentry"), "the first-party/Sentry boundary must be explicit");
assert.ok(page.includes("verified fallback privacy mailbox has not been published"), "an unconfigured fallback must be stated truthfully");
assert.ok(support.includes('href: "/privacy/request"'), "Support must route privacy rights to the dedicated page");
assert.ok(!support.includes("feedback?source=privacy-request"), "Support must not route privacy rights through Sentry");
assert.ok(!feedback.includes('"privacy-request": "Privacy request"'), "feedback must not present a privacy-request source");
assert.ok(privacy.includes('href="/privacy/request"'), "the policy must link the dedicated privacy-request page");
assert.ok(privacy.includes("does not currently promise deletion of one individual Sentry feedback item"), "Sentry retention copy must avoid an unsupported item-deletion promise");
assert.ok(middleware.includes('pathname === "/privacy/request"') && middleware.includes('pathname === "/api/privacy/requests"'), "pending-verification sessions must be able to reach the privacy lane");
assert.ok(packageJson.includes("check-privacy-request-intake-fixtures.ts"), "release checks must execute privacy fixtures");
assert.ok(packageJson.includes("check-privacy-request-monitor-fixtures.ts"), "release checks must execute privacy monitor fixtures");

console.log("Privacy-request intake readiness checks passed.");
