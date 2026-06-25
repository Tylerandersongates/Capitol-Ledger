#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

const status = read("lib/bill-status.ts");
const data = read("lib/data.ts");
const billDetail = read("app/bills/[billId]/page.tsx");
const policyEdgeFeed = read("components/policy-edge-feed.tsx");
const policyEdgeRanking = read("lib/policy-edge-ranking.ts");
const dashboard = read("components/dashboard-client.tsx");
const aiPolicyLens = read("lib/ai-policy-lens.ts");

assert.ok(status.includes("export function isBillLawActionText"), "Bill law detection should be shared");
assert.ok(status.includes('action.includes("public law")'), "Bill law detection should recognize Public Law actions");
assert.ok(status.includes('action.includes("private law")'), "Bill law detection should recognize Private Law actions");
assert.ok(status.includes('action.includes("signed by the president")'), "Bill law detection should recognize signed-by-president actions");
assert.ok(status.includes('return "Enacted"'), "Law actions should resolve to Enacted");

assert.ok(data.includes("resolveBillStatus(bill)"), "Data-layer status should delegate to shared status logic");
assert.ok(billDetail.includes("isBillLawActionText(action)"), "Bill detail timeline should use shared law detection");
assert.ok(billDetail.includes("status={status}"), "Bill detail key details should receive computed status");
assert.ok(billDetail.includes("resolveCommitteeDetail"), "Bill detail should resolve committee/status display through a helper");
assert.ok(billDetail.includes('if (status === "Enacted") return { label: "Status", value: "Enacted into law" };'), "Enacted bills should not render as committee pending");
assert.ok(!billDetail.includes('label="Committee" value={bill.committeeName ?? "Committee pending"}'), "Committee pending should not be hard-coded for all bills");

assert.ok(policyEdgeFeed.includes('from "@/lib/bill-status"'), "Policy Edge feed should use shared status logic");
assert.ok(policyEdgeRanking.includes("isBillLawActionText(action)"), "Policy Edge ranking should treat law as meaningful movement");
assert.ok(dashboard.includes("isBillLawActionText(action)"), "Dashboard tracker should use shared law detection");
assert.ok(aiPolicyLens.includes("this bill has become law"), "AI policy lens should explain law-stage practical impact");

console.log("Bill law status check passed.");
