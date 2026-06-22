#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";

const votePage = fs.readFileSync("app/votes/[voteId]/page.tsx", "utf8");
const savedPositions = fs.readFileSync("components/vote-saved-official-positions.tsx", "utf8");
const memberBreakdown = fs.readFileSync("components/bill-vote-member-breakdown.tsx", "utf8");
const data = fs.readFileSync("lib/data.ts", "utf8");
const demoData = fs.readFileSync("lib/demo-data.ts", "utf8");

assert.ok(votePage.includes("VoteSavedOfficialPositions"), "Vote detail should render saved official vote positions");
assert.ok(votePage.includes("BillVoteMemberBreakdown"), "Vote detail should render the shared all-member vote breakdown");
assert.ok(votePage.includes('showPinnedSection={false}'), "Vote detail should avoid duplicating the saved-official pin section");
assert.ok(votePage.includes("Party breakdown"), "Vote detail should label the member-level party breakdown");
assert.ok(savedPositions.includes("MobileGlassScrollFrame"), "Vote detail positions should use the shared scroll frame");
assert.ok(savedPositions.includes('heightClassName="h-[169px]"'), "Vote detail positions should show two officials at a time");
assert.ok(savedPositions.includes('ariaLabel="Saved official vote positions"'), "Vote detail positions scroll frame should have an accessible label");
assert.ok(savedPositions.includes("readSavedFollowRecords"), "Vote detail positions should read saved officials from the ledger");
assert.ok(savedPositions.includes('record.type !== "member"'), "Vote detail positions should only use saved officials");
assert.ok(savedPositions.includes("savedMemberIds.flatMap"), "Vote detail positions should follow the saved official order");
assert.ok(savedPositions.includes("Saved officials"), "Vote detail heading should describe the saved-official source");
assert.ok(!votePage.includes("Featured officials"), "Vote detail should not label saved official positions as featured officials");
assert.ok(memberBreakdown.includes("groupPositionsByParty"), "Vote detail member breakdown should group all positions by party");
assert.ok(memberBreakdown.includes("partyGroupDefinitions"), "Vote detail member breakdown should define party group order");
assert.ok(data.includes(".filter((memberVote) => memberVote.voteId === voteId)"), "Vote detail positions should be selected by vote id");
assert.ok(demoData.includes('{ voteId: "demo-vote-house-102", memberBioguideId: "FCA030", position: "No" }'), "SAVE Act demo vote should include Laura Friedman from the saved officials list");

console.log("Vote positions scroll check passed.");
