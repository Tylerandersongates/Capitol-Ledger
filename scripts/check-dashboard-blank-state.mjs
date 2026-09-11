#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const dashboard = readFileSync("components/dashboard-client.tsx", "utf8");
const data = readFileSync("lib/data.ts", "utf8");

assert.ok(
  dashboard.includes('const liveCandidates = candidates.filter((candidate) => candidate.sourceKind !== "demo")'),
  "Dashboard vote selection must exclude seeded demo records."
);
assert.ok(
  dashboard.includes("No recent national votes available."),
  "Dashboard must explain when no live national vote is available."
);
assert.ok(
  dashboard.includes("Current congressional roll-call results will appear when live records are available."),
  "Dashboard blank state must set an honest expectation for live results."
);
assert.ok(
  !dashboard.includes('label: "Reference record"'),
  "Dashboard must not present seeded reference votes as customer activity."
);
assert.ok(
  dashboard.includes("Live bill data is unavailable"),
  "Dashboard must explain when no live bill data is available."
);
assert.ok(
  dashboard.includes("Bill totals will appear after the live congressional feed updates."),
  "Dashboard must not render placeholder bill totals."
);
assert.ok(
  data.includes("return buildDashboardData([], [], { sourceMembers: [], sourceUpdates: [] });"),
  "Customer dashboard fallback must be empty when live records are unavailable."
);
assert.ok(
  data.includes("votes: voteRows.map(mapDatabaseVote)"),
  "Customer dashboard must not merge seeded votes into live records."
);

console.log("Dashboard blank-state guard passed.");
