import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const data = readFileSync("lib/data.ts", "utf8");
const memberPage = readFileSync("app/members/[bioguideId]/page.tsx", "utf8");
const houseVotes = readFileSync("lib/house-votes.ts", "utf8");

const voteSelectorStart = data.indexOf("function orderMemberVoteRecords");
const voteSelectorEnd = data.indexOf("async function hydrateMemberDetailWithLiveHouseVotes");
const voteSelectorBlock = data.slice(voteSelectorStart, voteSelectorEnd);

const houseHydratorStart = data.indexOf("async function hydrateMemberDetailWithLiveHouseVotes");
const houseHydratorEnd = data.indexOf("async function hydrateMemberDetailWithLiveSenateVotes");
const houseHydratorBlock = data.slice(houseHydratorStart, houseHydratorEnd);

const senateHydratorStart = data.indexOf("async function hydrateMemberDetailWithLiveSenateVotes");
const senateHydratorEnd = data.indexOf("function hydrateMemberDetailWithLiveVotes");
const senateHydratorBlock = data.slice(senateHydratorStart, senateHydratorEnd);

const voteHydratorStart = data.indexOf("function hydrateMemberDetailWithLiveVotes");
const voteHydratorEnd = data.indexOf("export async function getMemberDetailWithLiveData");
const voteHydratorBlock = data.slice(voteHydratorStart, voteHydratorEnd);

const memberDetailStart = data.indexOf("export async function getMemberDetailWithLiveData");
const memberDetailEnd = data.indexOf("async function getDatabaseActiveMembers");
const memberDetailBlock = data.slice(memberDetailStart, memberDetailEnd);

const votesTabStart = memberPage.indexOf("function VotesTab");
const votesTabEnd = memberPage.indexOf("function BillsTab");
const votesTabBlock = memberPage.slice(votesTabStart, votesTabEnd);

assert.ok(houseVotes.includes("export async function fetchHouseMemberVotes"), "House profiles should have a bounded live vote hydrator.");
assert.ok(houseVotes.includes("fetchHouseVotes(congress, session"), "House live votes should start from official Congress.gov House roll-call lists.");
assert.ok(houseVotes.includes("fetchHouseVoteMembers"), "House live votes should resolve member-level positions before display.");
assert.ok(houseVotes.includes("findMemberVoteItem"), "House live votes should only display positions for the selected official.");
assert.ok(houseVotes.includes("house-live-"), "House live vote records should be marked as external source rows.");

assert.ok(voteSelectorBlock.includes("function memberVoteRecordKey"), "Member vote records should dedupe by official roll-call identity.");
assert.ok(voteSelectorBlock.includes("`${record.vote.congress}:${record.vote.chamber}:${record.vote.rollCall}`"), "Member vote dedupe should survive different persisted/generated vote ids.");
assert.ok(voteSelectorBlock.includes("function selectMemberVoteRecords"), "Member vote records should flow through one sorted selector.");
assert.ok(voteSelectorBlock.includes("Date.parse(b.vote?.voteDate"), "Member vote records should be sorted newest first.");

assert.ok(houseHydratorBlock.includes("fetchHouseMemberVotes(detail.member, 12, houseVotesFetchTimeoutMs)"), "House profiles should hydrate recent official roll-call positions.");
assert.ok(houseHydratorBlock.includes("selectMemberVoteRecords(liveVotes, detail.memberVotes, 20)"), "House live votes should merge with stored vote records.");
assert.ok(senateHydratorBlock.includes("selectMemberVoteRecords(liveVotes, detail.memberVotes, 20)"), "Senate live votes should use the shared sorted/deduped selector.");
assert.ok(voteHydratorBlock.includes('detail.member.chamber === "House"'), "Member details should choose vote hydration by chamber.");
assert.ok(voteHydratorBlock.includes("hydrateMemberDetailWithLiveHouseVotes(detail)"), "Member details should keep House vote hydration active.");
assert.ok(voteHydratorBlock.includes("hydrateMemberDetailWithLiveSenateVotes(detail)"), "Member details should keep Senate vote hydration active.");
assert.ok(memberDetailBlock.includes("hydrateMemberDetailWithLiveVotes(detail)"), "Member details should hydrate recent official vote positions before rendering.");
assert.ok(memberDetailBlock.includes("memberVotes: votes.memberVotes"), "Member details should preserve the selected chamber's hydrated vote records.");

assert.ok(votesTabBlock.includes("const linkedRecords = memberVotes.filter"), "Votes tab should only render records with linked vote data.");
assert.ok(votesTabBlock.includes("const countLabel = linkedRecords.length > records.length"), "Votes tab should disclose when more vote records are available than shown.");
assert.ok(votesTabBlock.includes("No recorded positions yet"), "Votes tab empty state should clarify that sparse data is not a broken profile.");
assert.ok(votesTabBlock.includes('vote.id.startsWith("senate-live-") || vote.id.startsWith("house-live-")'), "Generated live vote rows should link to official external sources.");
assert.ok(votesTabBlock.includes("grid-cols-[minmax(0,1fr)_auto]"), "Vote rows should reserve stable space for long questions and position pills.");

console.log("Member vote records guard passed.");
