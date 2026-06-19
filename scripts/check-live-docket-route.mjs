#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

const dashboard = read("components/dashboard-client.tsx");
const liveDocketPage = read("app/live-docket/page.tsx");

assert.ok(dashboard.includes('href="/live-docket"'), "Dashboard live docket total should route to the dedicated Live Docket page");
assert.ok(dashboard.includes('href="/live-docket?status=passed"'), "Passed status should route to the Live Docket page");
assert.ok(dashboard.includes('href="/live-docket?status=in-committee"'), "Committee status should route to the Live Docket page");
assert.ok(dashboard.includes('href="/live-docket?status=in-progress"'), "In-progress status should route to the Live Docket page");
assert.ok(
  !/Live docket[\s\S]{0,700}href="\/search\?type=bills&focus=results"/.test(dashboard),
  "Today in Congress should not open Discovery Search"
);
assert.ok(liveDocketPage.includes("Today in Congress"), "Live Docket page should render the promised Today in Congress title");
assert.ok(liveDocketPage.includes("getDashboardDataWithLiveData"), "Live Docket should use the same live source as the dashboard count");
assert.ok(liveDocketPage.includes("getBillStatus"), "Live Docket should use the shared bill status calculation");
assert.ok(liveDocketPage.includes("matchesLiveDocketStatus"), "Live Docket should support status-filtered dashboard links");
assert.ok(liveDocketPage.includes('href="/dashboard"'), "Live Docket should return to the dashboard");
assert.ok(!liveDocketPage.includes('redirect("/search'), "Live Docket should not redirect to Search Discovery");

console.log("Live docket route check passed.");
