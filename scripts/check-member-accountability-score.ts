import assert from "node:assert/strict";
import { calculateMemberScore } from "@/lib/member-scoring";
import type { MemberVoteRecord } from "@/lib/data";
import type { Bill, Member, VotePosition } from "@/types/capitol";

const member: Member = {
  active: true,
  bioguideId: "T000001",
  chamber: "House",
  description: "Test member",
  district: "1",
  firstName: "Test",
  fullName: "Rep. Test Member",
  lastName: "Member",
  officialUrl: "https://member.house.gov",
  party: "Independent",
  sourceUrl: "https://congress.gov/member/test/T000001",
  state: "CA",
  term: "119th Congress"
};

function makeVoteRecord(index: number, position: VotePosition, question = "Procedural vote"): MemberVoteRecord {
  const voteId = `vote-${index}`;
  return {
    memberBioguideId: member.bioguideId,
    position,
    voteId,
    vote: {
      chamber: "House",
      congress: 119,
      explanation: "Official roll-call record.",
      id: voteId,
      question,
      result: "Passed",
      rollCall: `${index}`,
      sourceUrl: `https://clerk.house.gov/Votes/${index}`,
      voteDate: "2026-07-18"
    }
  };
}

function makeBill(id: string, title: string, policyArea: string): Bill {
  return {
    billNumber: id,
    billType: "HR",
    congress: 119,
    displayNumber: `H.R. ${id}`,
    id: `bill-${id}`,
    latestActionDate: "2026-07-18",
    latestActionText: "Introduced",
    policyArea,
    shortTitle: title,
    sourceUrl: `https://congress.gov/bill/${id}`,
    summary: "Official bill record.",
    title
  };
}

function score(overrides?: {
  cosponsoredBills?: Bill[];
  memberVotes?: MemberVoteRecord[];
  sponsoredBills?: Bill[];
  viewerIssueInterests?: string[];
}) {
  return calculateMemberScore({
    caucusMemberships: [],
    context: { viewerIssueInterests: overrides?.viewerIssueInterests ?? [] },
    cosponsoredBills: overrides?.cosponsoredBills ?? [],
    member,
    memberVotes: overrides?.memberVotes ?? [],
    sponsoredBills: overrides?.sponsoredBills ?? []
  });
}

const emptyEvidence = score();
assert.equal(emptyEvidence.overallScore, null, "Missing evidence must not produce an overall score.");
assert.equal(emptyEvidence.status, "preliminary", "An ineligible score should be labelled preliminary.");
assert.deepEqual(emptyEvidence.constituentAlignment.topics, [], "No saved interests should not create default personalized topics.");
assert.equal(emptyEvidence.factors.find((factor) => factor.key === "ethics")?.value, null, "Missing ethics data must not receive points.");

const fourVotes = score({ memberVotes: [1, 2, 3, 4].map((index) => makeVoteRecord(index, "Yes")) });
const limitedVoting = fourVotes.factors.find((factor) => factor.key === "voting");
assert.equal(limitedVoting?.status, "limited", "A small vote sample should be labelled limited.");
assert.equal(limitedVoting?.value, null, "A small vote sample must not render a percentage.");

const fiveVotes = score({
  memberVotes: [
    makeVoteRecord(1, "Yes"),
    makeVoteRecord(2, "Yes"),
    makeVoteRecord(3, "No"),
    makeVoteRecord(4, "Present"),
    makeVoteRecord(5, "Not Voting")
  ]
});
const verifiedVoting = fiveVotes.factors.find((factor) => factor.key === "voting");
assert.equal(verifiedVoting?.status, "verified", "A sufficient vote sample should be labelled verified.");
assert.equal(verifiedVoting?.value, 80, "Voting participation should be calculated only from linked roll-call records.");
assert.equal(fiveVotes.overallScore, null, "One scorable category must not produce an overall score.");

const issueEvidence = score({
  sponsoredBills: [makeBill("101", "Community Health Access Act", "Health")],
  viewerIssueInterests: ["Healthcare"]
});
assert.equal(issueEvidence.constituentAlignment.topics.length, 1, "Only saved, recognized interests should produce issue topics.");
assert.equal(issueEvidence.constituentAlignment.topics[0]?.signalCount, 1, "Issue evidence should count matching verified records.");
assert.ok(
  issueEvidence.constituentAlignment.note.includes("does not infer an alignment percentage"),
  "Issue evidence should explicitly reject unsupported alignment percentages."
);

console.log("Member accountability score guard passed.");
