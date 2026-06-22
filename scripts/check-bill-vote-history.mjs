#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

const billPage = read("app/bills/[billId]/page.tsx");
const memberBreakdown = read("components/bill-vote-member-breakdown.tsx");

assert.ok(billPage.includes("type BillVoteEvent"), "Bill page should model linked votes as vote-history events");
assert.ok(billPage.includes("buildBillVoteEvents"), "Bill page should build a full vote history");
assert.ok(billPage.includes("buildActionVoteEvent"), "Votes tab should derive roll-call vote events from official actions");
assert.ok(billPage.includes("parseActionVoteCounts"), "Votes tab should parse action-log roll-call counts when available");
assert.ok(billPage.includes('parseActionVoteCounts(action.action)'), "Votes tab should include vote actions that have counts even without roll-call numbers");
assert.ok(billPage.includes("voteActionEventKey"), "Action-derived votes without roll calls should still have stable event keys");
assert.ok(billPage.includes("Action Vote"), "Action-derived votes without roll calls should use an action-vote label");
assert.ok(!billPage.includes("Roll Call Pending"), "Votes tab should not render a fake pending roll-call label");
assert.ok(billPage.includes("sourceAction?: BillAction"), "Vote events should preserve the official action they came from");
assert.ok(billPage.includes("From action log"), "Votes tab should label action-derived vote rows");
assert.ok(billPage.includes("Source action /"), "Votes tab should show which official action produced the vote row");
assert.ok(billPage.includes("Member-level votes are pending"), "Action-derived votes should not imply member-level data is synced");
assert.ok(billPage.includes("selectOverviewVoteEvent"), "Overview vote should be selected from decisive vote rules");
assert.ok(!billPage.includes("const billVote = billVotes[0]"), "Overview should not blindly use the first linked vote");
assert.ok(billPage.includes("getNoRecordedVoteMessage"), "Overview should explain missing roll-call data instead of showing fake zeroes");
assert.ok(billPage.includes("hasRecordedVoteTotals"), "Vote totals should render only when real totals exist");
assert.ok(billPage.includes("Final Passage"), "Vote history should classify final passage votes");
assert.ok(billPage.includes("Veto Override"), "Vote history should classify veto override votes");
assert.ok(billPage.includes("Procedural"), "Vote history should distinguish procedural votes");
assert.ok(billPage.includes("<BillVoteMemberBreakdown"), "Votes tab should render member-level vote breakdowns");

assert.ok(memberBreakdown.includes("Your Representatives"), "Member vote breakdown should pin the voter's representatives");
assert.ok(memberBreakdown.includes("readSavedFollowRecords"), "Member vote breakdown should use saved officials");
assert.ok(memberBreakdown.includes("readLocalDistrictProfile"), "Member vote breakdown should use district setup");
assert.ok(memberBreakdown.includes("district.districtCode"), "Member vote breakdown should not pin default district officials without setup");
assert.ok(memberBreakdown.includes("getMatchedOfficials"), "Member vote breakdown should resolve district officials");
assert.ok(memberBreakdown.includes("voteFilters"), "Member vote breakdown should include position filters");
assert.ok(memberBreakdown.includes('{ label: "Present", value: "Present" }'), "Member vote breakdown should include the Present filter");
assert.ok(memberBreakdown.includes("partyFilters"), "Member vote breakdown should include optional party filters");
assert.ok(memberBreakdown.includes('{ label: "All parties", value: "all" }'), "Member vote breakdown should default to all parties");
assert.ok(memberBreakdown.includes('{ label: "Republican", value: "Republican" }') && memberBreakdown.includes('{ label: "Democrat", value: "Democrat" }') && memberBreakdown.includes('{ label: "Independent", value: "Independent" }'), "Member vote breakdown should offer Republican, Democrat, and Independent filters");
assert.ok(memberBreakdown.includes("partyFilter === \"all\" || record.member?.party === partyFilter"), "Member vote breakdown should apply the party filter only when selected");
assert.ok(memberBreakdown.includes("All Member Votes"), "Member vote breakdown should show the full member vote list neutrally");
assert.ok(memberBreakdown.includes('ariaLabel="All member vote positions"'), "Member vote breakdown should expose an accessible neutral scroll region");
assert.ok(!memberBreakdown.includes("All Member Votes By Party"), "Member vote breakdown should not label the default list as party grouped");
assert.ok(!memberBreakdown.includes("groupPositionsByParty"), "Member vote breakdown should not auto-group filtered member positions by party");
assert.ok(!memberBreakdown.includes("partyWeight"), "Member vote breakdown should not sort members by party before position and name");

console.log("Bill vote history check passed.");
