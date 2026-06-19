#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";

const ranking = fs.readFileSync("lib/policy-edge-ranking.ts", "utf8");
const feed = fs.readFileSync("components/policy-edge-feed.tsx", "utf8");

assert.ok(ranking.includes("export function rankPolicyEdgeBills"), "Policy Edge ranking should export the shared ranker");
assert.ok(ranking.includes("dedupePolicyEdgeBills(bills, mode).sort"), "Policy Edge ranking should dedupe before sorting");
assert.ok(ranking.includes("export function getPolicyEdgeBillKey"), "Policy Edge should expose public bill identity keys");
assert.ok(ranking.includes("${congress}:${billType}:${billNumber}"), "Policy Edge dedupe should key bills by congress, bill type, and bill number");
assert.ok(ranking.includes("currentIsDemo !== candidateIsDemo"), "Policy Edge dedupe should compare demo and live records");
assert.ok(ranking.includes("return candidateIsDemo ? current : candidate"), "Policy Edge dedupe should prefer the live bill over the demo duplicate");
assert.ok(feed.includes("filterPriorityFeedBills"), "Priority Feed component should use the shared priority filter");
assert.ok(ranking.includes("export function filterPriorityFeedBills"), "Policy Edge should expose the shared priority feed filter");
assert.ok(ranking.includes("export function countPriorityFeedBills"), "Policy Edge should expose the shared priority feed counter");
assert.ok(ranking.includes("supportedBillKeys.has(billKey)"), "Priority Feed should carry supported stance across public bill duplicates");
assert.ok(ranking.includes("savedBillKeys.has(billKey)"), "Priority Feed should carry saved bill relevance across public bill duplicates");
assert.ok(ranking.includes("isPriorityMovementBill(bill)"), "Priority Feed should require meaningful movement for non-supported inclusions");

console.log("Policy edge feed check passed.");
