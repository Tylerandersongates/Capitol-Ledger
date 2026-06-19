#!/usr/bin/env node

import assert from "node:assert/strict";
import { createRequire } from "node:module";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
const source = fs.readFileSync("lib/policy-edge-ranking.ts", "utf8");
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020
  },
  fileName: "lib/policy-edge-ranking.ts",
  reportDiagnostics: true
});

assert.deepEqual(transpiled.diagnostics ?? [], [], "Policy Edge ranking module should transpile cleanly");

const rankingModule = { exports: {} };

vm.runInNewContext(transpiled.outputText, {
  Date,
  Map,
  Number,
  Object,
  String,
  console,
  exports: rankingModule.exports,
  module: rankingModule,
  require
});

const { rankPolicyEdgeBills } = rankingModule.exports;

function bill(overrides = {}) {
  return {
    billNumber: "22",
    billType: "HR",
    congress: 119,
    displayNumber: "H.R. 22",
    id: "bill",
    latestActionDate: "2026-06-18",
    latestActionText: "Received in the Senate.",
    policyArea: "Government Operations and Politics",
    shortTitle: "SAVE Act",
    sourceUrl: "https://www.congress.gov/bill/119th-congress/house-bill/22",
    summary: "Fixture summary.",
    title: "Safeguard American Voter Eligibility Act",
    ...overrides
  };
}

const rankedBills = rankPolicyEdgeBills(
  [
    bill({
      id: "demo-hr-22",
      latestActionText: "Received in the Senate after passing the House.",
      sourceUrl: "https://project-qosv1.vercel.app/bills/demo-hr-22"
    }),
    bill({ id: "cmpnmaga7001y39k4erk5qpgm" }),
    bill({
      billNumber: "28",
      displayNumber: "H.R. 28",
      id: "cmpnmag5r001u39k4gexpt2dp",
      shortTitle: "Protection of Women and Girls in Sports Act of 2025",
      sourceUrl: "https://www.congress.gov/bill/119th-congress/house-bill/28",
      title: "Protection of Women and Girls in Sports Act of 2025"
    })
  ],
  "risk"
);

assert.equal(rankedBills.filter((rankedBill) => rankedBill.displayNumber === "H.R. 22").length, 1, "Risk Watch should show one H.R. 22 entry");
assert.equal(rankedBills.find((rankedBill) => rankedBill.displayNumber === "H.R. 22")?.id, "cmpnmaga7001y39k4erk5qpgm", "Risk Watch should keep the live H.R. 22 record");
assert.equal(rankedBills.length, 2, "Policy Edge dedupe should only remove duplicate public bills");

console.log("Policy edge feed check passed.");
