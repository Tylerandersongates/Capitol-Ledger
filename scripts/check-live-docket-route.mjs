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
  !/Bill activity[\s\S]{0,700}href="\/search\?type=bills&focus=results"/.test(dashboard),
  "Recent bill activity should not open Discovery Search"
);
assert.ok(liveDocketPage.includes("Recent activity"), "Live Docket page should use truthful recent-activity copy");
assert.ok(liveDocketPage.includes("getDashboardDataWithLiveData"), "Live Docket should use the same live source as the dashboard count");
assert.ok(liveDocketPage.includes("getBillStatus"), "Live Docket should use the shared bill status calculation");
assert.ok(liveDocketPage.includes("matchesLiveDocketStatus"), "Live Docket should support status-filtered dashboard links");
assert.ok(liveDocketPage.includes('href="/dashboard"'), "Live Docket should return to the dashboard");
assert.ok(!liveDocketPage.includes('redirect("/search'), "Live Docket should not redirect to Search Discovery");
assert.ok(liveDocketPage.includes("Stored bill data is unavailable"), "Live Docket should explain when stored records are unavailable");
assert.ok(liveDocketPage.includes("freshness.label"), "Live Docket should render persisted source-sync evidence instead of render time");
assert.ok(!liveDocketPage.includes("Updated {formatDate(data.generatedAt)}"), "Live Docket must not present render time as source freshness");
assert.ok(liveDocketPage.includes("Sponsor unavailable"), "Live Docket should expose an explicit missing-sponsor state");
assert.ok(liveDocketPage.includes("readCurrentSavedDocketBills"), "Live Docket should include saved bills outside the recent window");
assert.ok(liveDocketPage.includes("signed-in account-saved bills"), "Saved-bill copy should not promise anonymous local-only hydration");
assert.ok(liveDocketPage.includes("bypassCache: true"), "Live Docket rows must not lag successful sync evidence in the dashboard cache");

const docket = read("lib/congress-docket.ts");
assert.ok(docket.includes("CongressDocketSyncRun"), "Live Docket should read persisted source-sync evidence");
assert.ok(docket.includes("mergeRecentAndSavedDocketBills"), "Live Docket should merge saved bills independently of the recent ceiling");
assert.ok(docket.includes("buildDocketSponsorNames"), "Live Docket should map sponsors from live member records");
assert.ok(docket.includes('AND "congress" = ${congress}'), "Freshness evidence should be scoped to the displayed Congress");

const data = read("lib/data.ts");
assert.ok(data.includes("function dedupeDashboardBills"), "Dashboard data should dedupe live/demo bill records before rendering docket rows");
assert.ok(data.includes("const sortedDocketBills = dedupeDashboardBills(sourceBills)"), "Dashboard data should derive counts from deduped bills");
assert.ok(data.includes("billsInAction: dashboardBills.length"), "Live docket counts should derive from deduped live bill identities");
assert.ok(data.includes("bills: dashboardBills.map"), "Live docket favorite targets should render deduped live bill identities");
assert.ok(
  data.includes("return buildDashboardData([], [], { sourceMembers: [], sourceUpdates: [] });"),
  "Live docket should use an honest empty state when live records are unavailable"
);
assert.ok(data.includes("mergeBillsByRecordKey"), "Live+demo bill merges should use a stable bill identity key");
assert.ok(data.includes("const maximumDashboardBillResults = 50;"), "The live docket should have an explicit moving-bill ceiling");
assert.ok(data.includes("take: maximumDashboardBillResults"), "The dashboard should not load the full searchable bill catalog");
assert.ok(data.includes("sortedDocketBills.slice(0, maximumBillResults)"), "Vote-linked records must not expand the 50-row recent docket ceiling");
assert.ok(data.includes("? { ...mappedDatabaseBill, id: billId }"), "Stable live bill aliases should survive database detail resolution");

console.log("Live docket route check passed.");
