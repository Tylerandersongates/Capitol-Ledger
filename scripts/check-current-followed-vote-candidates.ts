#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getCurrentVoteReminder, type VoteReminderMember } from "@/lib/alert-rules";
import {
  chunkFollowedBillIds,
  maximumFollowedBillIdsPerVoteQuery,
  selectCurrentFollowedVoteCandidates,
  uniqueFollowedBillIds,
  withFollowedBillAlias
} from "@/lib/current-followed-votes";
import type { Bill, Vote } from "@/types/capitol";

const now = new Date("2026-09-19T12:00:00.000Z");
const followedBill: Bill = {
  billNumber: "7008",
  billType: "HR",
  congress: 119,
  displayNumber: "H.R. 7008",
  id: "bill-followed-7008",
  latestActionDate: "2026-09-19",
  latestActionText: "Passed the House.",
  policyArea: "Government Operations and Politics",
  shortTitle: "Followed fixture bill",
  sourceUrl: "https://www.congress.gov/bill/119th-congress/house-bill/7008",
  summary: "Fixture summary.",
  title: "Followed fixture bill"
};

function voteFixture(index: number, overrides: Partial<Vote> = {}): Vote {
  return {
    billId: undefined,
    chamber: "Senate",
    congress: 119,
    explanation: "Fixture roll call.",
    id: `unlinked-${index}`,
    question: "On the Nomination",
    result: "Nomination Confirmed",
    rollCall: String(index),
    sourceUrl: `https://www.senate.gov/legislative/LIS/roll_call_votes/vote1191/vote_119_1_${index}.htm`,
    voteDate: "2026-09-19T11:00:00.000Z",
    ...overrides
  };
}

const unlinkedNewerVotes = Array.from({ length: 13 }, (_, index) => ({
  vote: voteFixture(index + 1)
}));
const linkedVote = voteFixture(100, {
  billId: followedBill.id,
  chamber: "House",
  id: "linked-followed-vote",
  question: "On Passage",
  result: "Passed",
  voteDate: "2026-09-19T10:00:00.000Z"
});

const stableFollowedBillId = "live-119-hr-7008";
const stableAliasCandidate = withFollowedBillAlias(
  { bill: followedBill, vote: linkedVote },
  [stableFollowedBillId]
);
assert.equal(stableAliasCandidate.bill.id, stableFollowedBillId);
assert.equal(stableAliasCandidate.vote.billId, stableFollowedBillId);
assert.equal(
  selectCurrentFollowedVoteCandidates({
    candidates: [stableAliasCandidate],
    followedBillIds: [stableFollowedBillId],
    now
  })[0]?.bill.id,
  stableFollowedBillId,
  "a stable followed alias must survive candidate resolution for detail links, saves, and stances"
);

const candidates = selectCurrentFollowedVoteCandidates({
  candidates: [...unlinkedNewerVotes, { bill: followedBill, vote: linkedVote }],
  followedBillIds: [followedBill.id],
  now
});
assert.deepEqual(
  candidates.map((candidate) => candidate.vote.id),
  [linkedVote.id],
  "more than 12 newer unlinked votes must not hide a current followed-bill vote"
);

const twentySixCurrentVotes = Array.from({ length: 26 }, (_, index) => ({
  bill: followedBill,
  vote: { ...linkedVote, id: `linked-followed-vote-${index + 1}`, rollCall: String(index + 1) }
}));
assert.equal(
  selectCurrentFollowedVoteCandidates({
    candidates: twentySixCurrentVotes,
    followedBillIds: [followedBill.id],
    now,
    voteId: "linked-followed-vote-26"
  })[0]?.vote.id,
  "linked-followed-vote-26",
  "an exact current deep link must be selected before applying the general candidate limit"
);

const sameDateCandidateA = {
  bill: followedBill,
  vote: { ...linkedVote, id: "same-date-a", rollCall: "201" }
};
const sameDateCandidateB = {
  bill: followedBill,
  vote: { ...linkedVote, id: "same-date-b", rollCall: "202" }
};
const selectedSameDateVote = (candidates: typeof twentySixCurrentVotes) =>
  selectCurrentFollowedVoteCandidates({ candidates, followedBillIds: [followedBill.id], limit: 1, now })[0]?.vote.id;
assert.equal(selectedSameDateVote([sameDateCandidateA, sameDateCandidateB]), "same-date-a");
assert.equal(
  selectedSameDateVote([sameDateCandidateB, sameDateCandidateA]),
  "same-date-a",
  "date-only votes must select the same reminder ID regardless of database input order"
);

const dcDelegate: VoteReminderMember = {
  bioguideId: "D000001",
  chamber: "House",
  district: "0",
  fullName: "Del. Devon District",
  state: "DC"
};
const senateCandidatesBeforeHouse = [
  ...Array.from({ length: 25 }, (_, index) => ({
    bill: followedBill,
    vote: {
      ...linkedVote,
      chamber: "Senate" as const,
      id: `senate-followed-${index + 1}`,
      rollCall: String(index + 1),
      voteDate: `2026-09-19T11:${String(59 - index).padStart(2, "0")}:00.000Z`
    }
  })),
  {
    bill: followedBill,
    vote: { ...linkedVote, id: "house-followed-26", voteDate: "2026-09-19T10:00:00.000Z" }
  }
];
const contactEligibleCandidates = selectCurrentFollowedVoteCandidates({
  candidates: senateCandidatesBeforeHouse,
  followedBillIds: [followedBill.id],
  now
});
assert.equal(
  getCurrentVoteReminder({
    districtCode: "DC-AL",
    enabled: true,
    followedBillIds: [followedBill.id],
    members: [dcDelegate],
    now,
    voteFeed: contactEligibleCandidates
  })?.vote.id,
  "house-followed-26",
  "candidate bounding must not run before the chamber-correct contact rule"
);

const dataSource = readFileSync("lib/data.ts", "utf8");
const alertDetailSource = readFileSync("app/alerts/detail/page.tsx", "utf8");
assert.match(
  dataSource,
  /maximumConcurrentFollowedVoteQueryChunks = 4/,
  "followed-vote queries must cap database concurrency"
);
assert.match(
  dataSource,
  /chunkFollowedBillIds\(targetIds\)/,
  "the account follow list must be split into bounded predicates"
);
assert.match(
  alertDetailSource,
  /getCurrentVoteCandidatesForFollowedBills\(\{[\s\S]{0,180}voteId:\s*searchParams\.voteId/,
  "the detail route must target its exact vote before applying the general scan ceiling"
);
assert.match(
  dataSource,
  /if \(voteId\)[\s\S]{0,500}take: 1/,
  "the exact detail lookup must remain a one-row database query"
);
assert.ok(
  (dataSource.match(/orderBy: \[\{ voteDate: "desc" \}, \{ id: "asc" \}\]/g)?.length ?? 0) >= 2,
  "both exact and account-targeted database queries need a deterministic same-date tie-breaker"
);
assert.match(
  dataSource,
  /take: maximumCurrentFollowedVoteCandidates/,
  "the account-targeted vote query must have a fixed result and database-work ceiling"
);

const oneHundredOneFollowedBillIds = Array.from({ length: 101 }, (_, index) => `bill-${index + 1}`);
assert.equal(
  uniqueFollowedBillIds(oneHundredOneFollowedBillIds).at(-1),
  "bill-101",
  "follow relevance must not silently drop bills after an arbitrary account-order cap"
);
assert.deepEqual(
  chunkFollowedBillIds(oneHundredOneFollowedBillIds).map((chunk) => chunk.length),
  [maximumFollowedBillIdsPerVoteQuery, 1],
  "follow relevance should use bounded query chunks without dropping the 101st bill"
);

assert.deepEqual(
  selectCurrentFollowedVoteCandidates({
    candidates: [{ bill: followedBill, vote: { ...linkedVote, voteDate: "2026-09-17T23:59:59.000Z" } }],
    followedBillIds: [followedBill.id],
    now
  }),
  [],
  "votes older than yesterday UTC must fail closed"
);

assert.deepEqual(
  selectCurrentFollowedVoteCandidates({
    candidates: [{ bill: followedBill, vote: { ...linkedVote, billId: "different-bill" } }],
    followedBillIds: [followedBill.id],
    now
  }),
  [],
  "a mismatched bill relationship must fail closed"
);

console.log("Current followed-vote candidate fixtures passed.");
