#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getCurrentVoteReminder, selectVoteReminderContact, type VoteReminderMember } from "@/lib/alert-rules";
import type { Bill, Vote } from "@/types/capitol";

const now = new Date("2026-09-19T12:00:00.000Z");

const bill: Bill = {
  billNumber: "7008",
  billType: "hr",
  congress: 119,
  displayNumber: "H.R. 7008",
  id: "live-119-hr-7008",
  latestActionDate: "2026-09-18",
  latestActionText: "Passed the House.",
  policyArea: "Government Operations and Politics",
  shortTitle: "Government transparency bill",
  sourceUrl: "https://www.congress.gov/bill/119th-congress/house-bill/7008",
  summary: "A fixture bill.",
  title: "A fixture bill"
};

const linkedHouseVote: Vote = {
  billId: bill.id,
  chamber: "House",
  congress: 119,
  explanation: "Official linked roll call.",
  id: "house-119-321",
  question: "On Passage",
  result: "Passed",
  rollCall: "321",
  sourceUrl: "https://clerk.house.gov/Votes/2026321",
  voteDate: "2026-09-19"
};

const members: VoteReminderMember[] = [
  {
    bioguideId: "R000001",
    chamber: "House",
    district: "34",
    fullName: "Rep. Riley Rivera",
    state: "California"
  },
  {
    bioguideId: "S000002",
    chamber: "Senate",
    fullName: "Sen. Avery Stone",
    state: "CA"
  },
  {
    bioguideId: "S000003",
    chamber: "Senate",
    fullName: "Sen. Morgan West",
    state: "California"
  }
];

const atLargeMembers: VoteReminderMember[] = [
  {
    bioguideId: "A000001",
    chamber: "House",
    district: "0",
    fullName: "Rep. Arden North",
    state: "Alaska"
  },
  {
    bioguideId: "S000004",
    chamber: "Senate",
    fullName: "Sen. Taylor North",
    state: "AK"
  }
];

function reminderFor(
  voteFeed: Array<{ bill?: Bill; vote: Vote }> | undefined,
  overrides: Partial<Parameters<typeof getCurrentVoteReminder>[0]> = {}
) {
  return getCurrentVoteReminder({
    districtCode: "CA-34",
    enabled: true,
    followedBillIds: [bill.id],
    members,
    now,
    voteFeed,
    ...overrides
  });
}

const linkedReminder = reminderFor([{ bill, vote: linkedHouseVote }]);
assert.ok(linkedReminder, "A current, followed, explicitly linked bill vote should create a reminder.");
assert.equal(linkedReminder.bill.id, bill.id);
assert.equal(linkedReminder.contact.bioguideId, "R000001", "A House vote must select the user's district Representative.");
assert.equal(linkedReminder.group, "today");
assert.equal(linkedReminder.id, `system-vote-reminder:${linkedHouseVote.id}`);

const nominationVote: Vote = {
  ...linkedHouseVote,
  billId: undefined,
  chamber: "Senate",
  id: "senate-119-nomination-88",
  question: "On the Nomination",
  result: "Nomination Confirmed",
  rollCall: "88"
};
assert.equal(
  reminderFor([{ bill, vote: nominationVote }]),
  null,
  "An unlinked nomination alone must never inherit an unrelated followed bill."
);
assert.equal(
  reminderFor([{ bill, vote: nominationVote }, { bill, vote: linkedHouseVote }])?.vote.id,
  linkedHouseVote.id,
  "An unlinked nomination must be skipped without hiding a separate eligible linked vote."
);
assert.equal(
  reminderFor([
    ...Array.from({ length: 13 }, (_, index) => ({
      bill,
      vote: { ...nominationVote, id: `senate-119-nomination-${index + 1}`, rollCall: String(index + 1) }
    })),
    { bill, vote: linkedHouseVote }
  ])?.vote.id,
  linkedHouseVote.id,
  "More than 12 newer unlinked records must not hide an eligible current linked vote."
);

assert.equal(
  reminderFor([{ bill, vote: { ...linkedHouseVote, id: "house-119-stale", voteDate: "2026-09-17" } }]),
  null,
  "A vote older than yesterday UTC is stale and must not create a reminder."
);
assert.equal(
  reminderFor([{ bill, vote: { ...linkedHouseVote, id: "house-119-future", voteDate: "2026-09-19T18:00:00.000Z" } }]),
  null,
  "A future timestamp must not create a reminder even when it falls on today's UTC date."
);

assert.equal(selectVoteReminderContact(members, "CA-34", "House")?.bioguideId, "R000001");
assert.equal(selectVoteReminderContact(members, "CA-34", "Senate")?.bioguideId, "S000002");
assert.equal(selectVoteReminderContact(atLargeMembers, "AK-AL", "House")?.bioguideId, "A000001");
assert.equal(selectVoteReminderContact(atLargeMembers, "AK-00", "House")?.bioguideId, "A000001");
assert.equal(selectVoteReminderContact(atLargeMembers, "AK-AL", "Senate")?.bioguideId, "S000004");
assert.equal(
  selectVoteReminderContact(members.filter((member) => member.chamber === "House"), "CA-34", "Senate"),
  undefined,
  "A Senate vote must not fall back to a House contact."
);

assert.equal(reminderFor(undefined), null, "No vote means no active system alert.");
assert.equal(reminderFor([{ bill, vote: linkedHouseVote }], { enabled: false }), null, "An opted-out account has no vote reminder.");
assert.equal(reminderFor([{ bill, vote: linkedHouseVote }], { followedBillIds: [] }), null, "An unfollowed bill is not account-relevant.");
assert.equal(reminderFor([{ bill, vote: linkedHouseVote }], { districtCode: "" }), null, "A missing district cannot produce a contact action.");
assert.equal(
  reminderFor([{ bill, vote: linkedHouseVote }], { voteId: "a-different-vote" }),
  null,
  "Alert details must not silently replace the selected vote with another candidate."
);

const sourceFiles = [
  "app/alerts/page.tsx",
  "app/alerts/detail/page.tsx",
  "lib/alert-summary.ts",
  "lib/data.ts"
].map((path) => ({ path, source: readFileSync(path, "utf8") }));

for (const { path, source } of sourceFiles) {
  assert.doesNotMatch(
    source,
    /recentVote\?\.bill\s*\?\?\s*dashboardData\.trackedBill|recentVoteBill\s*\|\|\s*trackedBill/,
    `${path} must not fall back from an unlinked vote to another bill.`
  );
}
assert.doesNotMatch(
  readFileSync("app/alerts/page.tsx", "utf8"),
  /time:\s*["']Today["']/,
  "The system reminder timestamp must come from the verified vote date."
);
assert.doesNotMatch(
  readFileSync("lib/data.ts", "utf8"),
  /system-vote-reminder/,
  "Public dashboard data must not manufacture an account-specific default unread reminder."
);

console.log("Alert truth fixtures passed.");
