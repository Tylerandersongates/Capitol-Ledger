#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

const dashboard = read("components/dashboard-client.tsx");
const data = read("lib/data.ts");
const priorityPage = read("app/priority-feed/page.tsx");
const riskPage = read("app/risk-watch/page.tsx");
const sharedFeed = read("components/policy-edge-feed.tsx");
const scrollFrame = read("components/mobile-glass-scroll-frame.tsx");
const ranking = read("lib/policy-edge-ranking.ts");

assert.ok(dashboard.includes('href="/priority-feed"'), "Open Priority Feed should route to the dedicated Priority Feed page");
assert.ok(dashboard.includes('href="/risk-watch"'), "Open Risk Watch should route to the dedicated Risk Watch page");
assert.ok(/href="\/priority-feed"[\s\S]*?View Priority Bills/.test(dashboard), "Priority Feed CTA should use the dedicated route");
assert.ok(/href="\/risk-watch"[\s\S]*?View Bills to Watch/.test(dashboard), "Risk Watch CTA should use the dedicated route");
assert.ok(!/href="\/search\?[^"]*"[\s\S]{0,260}View Priority Bills/.test(dashboard), "Priority Feed should not open Search Discovery");
assert.ok(!/href="\/search\?[^"]*"[\s\S]{0,260}View Bills to Watch/.test(dashboard), "Risk Watch should not open Search Discovery");

assert.ok(priorityPage.includes('mode="priority"'), "Priority Feed page should render the priority mode");
assert.ok(priorityPage.includes("personalPriorityOnly"), "Priority Feed should filter to personal positive/actionable bills");
assert.ok(priorityPage.includes('searchRecordsWithLiveData({ type: "bills" })'), "Priority Feed should consider all bills before applying personal priority rules");
assert.ok(!priorityPage.includes('status: "in-committee"'), "Priority Feed should not be only a generic in-committee feed");
assert.ok(riskPage.includes('mode="risk"'), "Risk Watch page should render the risk mode");
assert.ok(riskPage.includes('searchRecordsWithLiveData({ type: "bills" })'), "Risk Watch should consider all bills before applying personal stance filters");
assert.ok(riskPage.includes("personalRiskOnly"), "Risk Watch should filter to personal opposed/watching bills");
assert.ok(!riskPage.includes('status: "in-progress"'), "Risk Watch should not be triggered by generic in-progress status");
assert.ok(sharedFeed.includes("isRiskWatchBillStance"), "Risk Watch feed should read opposed/watching bill stances");
assert.ok(sharedFeed.includes("filterPriorityFeedBills"), "Priority Feed should use shared personal inclusion rules");
assert.ok(ranking.includes("isPriorityFeedBill"), "Priority Feed should use explicit personal inclusion rules");
assert.ok(ranking.includes('input.billStance === "support"'), "Priority Feed should include supported bills");
assert.ok(ranking.includes("input.riskBillKeys.has(billKey)"), "Priority Feed should exclude bills already owned by Risk Watch");
assert.ok(ranking.includes("matchesIssueInterests"), "Priority Feed should include active issue-aligned bills");
assert.ok(ranking.includes("savedMemberIds"), "Priority Feed should include active saved-official sponsored bills");
assert.ok(dashboard.includes("priorityQueueCount"), "Dashboard Priority Queue count should use the personal priority feed count");
assert.ok(dashboard.includes("countPriorityFeedBills"), "Dashboard should compute Priority Queue from the shared rules");
assert.ok(!dashboard.includes('<ProStatPill label="Priority Queue" value={data.statusCounts.inCommittee}'), "Dashboard Priority Queue should not use generic in-committee count");
assert.ok(!dashboard.includes('<LockedStatPill label="Priority Queue" value={`${data.statusCounts.inCommittee}`}'), "Locked dashboard Priority Queue should not use generic in-committee count");
assert.ok(data.includes("sponsorBioguideId: bill.sponsorBioguideId"), "Dashboard target bills should include sponsor IDs for saved-official priority rules");
assert.ok(data.includes("summary: bill.summary"), "Dashboard target bills should include summaries for issue-aligned priority rules");
assert.ok(dashboard.includes("riskWatchCount"), "Dashboard Risk Watch count should use personal stance count");
assert.ok(
  sharedFeed.includes("MobileGlassScrollFrame") && scrollFrame.includes("overflow-y-auto") && scrollFrame.includes('role={ariaLabel ? "region" : undefined}'),
  "Policy Edge bill rows should render inside the shared scrollable region"
);
assert.ok(sharedFeed.includes("Priority Feed") && sharedFeed.includes("Risk Watch"), "Dedicated policy edge feed labels should render");
assert.ok(!priorityPage.includes("redirect(\"/search") && !riskPage.includes("redirect(\"/search"), "Policy edge routes should not redirect to Search");

console.log("Policy edge route check passed.");
