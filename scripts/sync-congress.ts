import {
  CongressApiError,
  fetchBill,
  fetchBillCosponsors,
  fetchBills,
  fetchBillSummaries,
  fetchCommittees,
  fetchHouseVoteMembers,
  fetchHouseVotes,
  fetchMember,
  fetchMembers,
  type CongressBillListItem,
  type CongressMemberDetailItem,
  type CongressMemberListItem
} from "../lib/congress/client";
import { getPrisma, hasDatabaseUrl } from "../lib/prisma";
import {
  buildBillSourceLinks,
  buildCommitteeSourceLinks,
  buildMemberSourceLinks,
  normalizeCongressBillCosponsor,
  normalizeCongressBill,
  normalizeCongressCommittee,
  normalizeCongressHouseMemberVote,
  normalizeCongressHouseVote,
  normalizeCongressMember,
  normalizeCongressMemberDetail,
  resolveCongressBillSummary
} from "../lib/congress/normalizers";
import {
  upsertCongressBills,
  upsertCongressBillSummaries,
  upsertCongressCommittees,
  upsertCongressCosponsors,
  upsertCongressMembers,
  upsertCongressMemberVotes,
  upsertCongressVotes,
  upsertOfficialSourceLinks
} from "../lib/congress/upserts";
import type { Bill, CapitolSourceLink, Member } from "../types/capitol";

type ResolvedBillSummaryRecord = {
  bill: Bill;
  summary: ReturnType<typeof resolveCongressBillSummary>;
};

type ResolvedSupplementalMemberRecord = {
  member: Member;
  raw: CongressMemberDetailItem;
};

type ResolvedBillCosponsorRecord = NonNullable<ReturnType<typeof normalizeCongressBillCosponsor>>;
type ResolvedHouseVoteRecord = NonNullable<ReturnType<typeof normalizeCongressHouseVote>>;
type ResolvedHouseMemberVoteRecord = NonNullable<ReturnType<typeof normalizeCongressHouseMemberVote>>;

const territoryDelegateMemberIds = ["N000147", "H001103", "M001219", "P000610", "R000600", "K000404"];

function readIntegerEnv(name: string, fallback: number, min: number, max: number) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value < min || value > max) return fallback;
  return value;
}

function readBooleanEnv(name: string, fallback: boolean) {
  const value = process.env[name];
  if (!value) return fallback;
  return value === "true";
}

function readStringListEnv(name: string) {
  return (process.env[name] ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values));
}

function billSyncKey(bill: Pick<Bill, "billNumber" | "billType" | "congress">) {
  return `${bill.congress}:${bill.billType.toUpperCase()}:${bill.billNumber}`;
}

async function fetchResolvedBillSummaries(bills: Bill[]) {
  const records: ResolvedBillSummaryRecord[] = [];

  for (const bill of bills) {
    try {
      const response = await fetchBillSummaries(bill.congress, bill.billType, bill.billNumber, { limit: 5 });
      records.push({
        bill,
        summary: resolveCongressBillSummary(response.summaries ?? [])
      });
    } catch (error) {
      if (!(error instanceof CongressApiError)) throw error;
      records.push({
        bill,
        summary: null
      });
    }
  }

  return records;
}

async function fetchResolvedBillCosponsors(bills: Bill[], limit: number) {
  const records: ResolvedBillCosponsorRecord[] = [];

  for (const bill of bills) {
    try {
      const response = await fetchBillCosponsors(bill.congress, bill.billType, bill.billNumber, { limit });
      const normalized = (response.cosponsors ?? [])
        .map((cosponsor) => normalizeCongressBillCosponsor(cosponsor, bill))
        .filter((cosponsor) => cosponsor !== null);
      records.push(...normalized);
    } catch (error) {
      if (!(error instanceof CongressApiError)) throw error;
    }
  }

  return records;
}

async function fetchResolvedBillDetails(bills: Bill[]) {
  const records: CongressBillListItem[] = [];

  for (const bill of bills) {
    try {
      const response = await fetchBill(bill.congress, bill.billType, bill.billNumber);
      if (response.bill) records.push(response.bill);
    } catch (error) {
      if (!(error instanceof CongressApiError)) throw error;
    }
  }

  return records;
}

async function fetchResolvedBillSponsors(bills: Bill[]) {
  const sponsorIds = Array.from(new Set(bills.map((bill) => bill.sponsorBioguideId).filter((value): value is string => Boolean(value))));
  const records: Member[] = [];

  for (const sponsorId of sponsorIds) {
    try {
      const response = await fetchMember(sponsorId);
      const member = response.member ? normalizeCongressMemberDetail(response.member) : null;
      if (member) records.push(member);
    } catch (error) {
      if (!(error instanceof CongressApiError)) throw error;
    }
  }

  return records;
}

async function fetchResolvedSupplementalMembers(memberIds: string[]) {
  const records: ResolvedSupplementalMemberRecord[] = [];

  for (const memberId of memberIds) {
    try {
      const response = await fetchMember(memberId);
      const member = response.member ? normalizeCongressMemberDetail(response.member) : null;
      if (member && response.member) {
        records.push({
          member,
          raw: response.member
        });
      }
    } catch (error) {
      if (!(error instanceof CongressApiError)) throw error;
    }
  }

  return records;
}

async function fetchResolvedHouseVotes(congress: number, session: number, limit: number) {
  try {
    const response = await fetchHouseVotes(congress, session, { limit });
    return (response.houseRollCallVotes ?? [])
      .map((vote) => normalizeCongressHouseVote(vote, congress, session))
      .filter((vote) => vote !== null);
  } catch (error) {
    if (!(error instanceof CongressApiError)) throw error;
    return [];
  }
}

async function fetchResolvedHouseMemberVotes(votes: ResolvedHouseVoteRecord[], limit: number) {
  const records: ResolvedHouseMemberVoteRecord[] = [];

  for (const vote of votes) {
    try {
      const response = await fetchHouseVoteMembers(vote.congress, Number(vote.session ?? 1), vote.rollCall, { limit });
      const rawMemberVotes = response.houseRollCallVoteMemberVotes ?? response.houseRollCallMemberVotes ?? [];
      const normalized = rawMemberVotes.map((memberVote) => normalizeCongressHouseMemberVote(memberVote, vote)).filter((memberVote) => memberVote !== null);
      records.push(...normalized);
    } catch (error) {
      if (!(error instanceof CongressApiError)) throw error;
    }
  }

  return records;
}

function uniqueMembers(members: Member[]) {
  return Array.from(new Map(members.map((member) => [member.bioguideId, member])).values());
}

function uniqueSourceLinks(sourceLinks: CapitolSourceLink[]) {
  return Array.from(new Map(sourceLinks.map((sourceLink) => [sourceLink.id, sourceLink])).values());
}

async function main() {
  const congress = readIntegerEnv("CONGRESS_SYNC_CONGRESS", 119, 1, 999);
  const limit = readIntegerEnv("CONGRESS_SYNC_LIMIT", 5, 1, 250);
  const shouldSyncSummaries = readBooleanEnv("CONGRESS_SYNC_SUMMARIES", true);
  const shouldSyncCosponsors = readBooleanEnv("CONGRESS_SYNC_COSPONSORS", true);
  const cosponsorLimit = readIntegerEnv("CONGRESS_SYNC_COSPONSOR_LIMIT", 50, 1, 250);
  const shouldSyncHouseVotes = readBooleanEnv("CONGRESS_SYNC_HOUSE_VOTES", false);
  const houseVoteSession = readIntegerEnv("CONGRESS_SYNC_HOUSE_SESSION", 1, 1, 2);
  const houseVoteLimit = readIntegerEnv("CONGRESS_SYNC_HOUSE_VOTE_LIMIT", 5, 1, 100);
  const shouldSyncHouseMemberVotes = readBooleanEnv("CONGRESS_SYNC_HOUSE_MEMBER_VOTES", true);
  const houseMemberVoteLimit = readIntegerEnv("CONGRESS_SYNC_HOUSE_MEMBER_VOTE_LIMIT", 500, 1, 500);
  const supplementalMemberIds = uniqueStrings([...territoryDelegateMemberIds, ...readStringListEnv("CONGRESS_SYNC_MEMBER_IDS")]);
  const shouldWrite = process.env.CONGRESS_SYNC_WRITE === "true";

  console.log("Testing Congress.gov API access...");
  console.log(`Congress: ${congress}`);
  console.log(`Limit: ${limit}`);
  console.log(`Summary sync: ${shouldSyncSummaries ? "enabled" : "skipped"}`);
  console.log(`Cosponsor sync: ${shouldSyncCosponsors ? `enabled, up to ${cosponsorLimit} per bill` : "skipped"}`);
  console.log(`House vote sync: ${shouldSyncHouseVotes ? `enabled, session ${houseVoteSession}, up to ${houseVoteLimit} votes` : "skipped"}`);
  console.log(`House member vote sync: ${shouldSyncHouseVotes && shouldSyncHouseMemberVotes ? `enabled, up to ${houseMemberVoteLimit} positions per vote` : "skipped"}`);
  console.log(`Supplemental member sync: ${supplementalMemberIds.length ? `${supplementalMemberIds.length} targeted records` : "skipped"}`);
  console.log(`Write mode: ${shouldWrite ? "enabled" : "dry run"}`);

  const [membersResponse, billsResponse, committeesResponse] = await Promise.all([
    fetchMembers({ limit }),
    fetchBills(congress, { limit }),
    fetchCommittees(undefined, { limit })
  ]);

  const listedBills = (billsResponse.bills ?? []).map(normalizeCongressBill).filter((bill) => bill !== null);
  const billDetails = await fetchResolvedBillDetails(listedBills);
  const detailedBills = billDetails.map(normalizeCongressBill).filter((bill) => bill !== null);
  const bills = Array.from(new Map([...listedBills, ...detailedBills].map((bill) => [billSyncKey(bill), bill])).values());
  const rawBills = [...(billsResponse.bills ?? []), ...billDetails];
  const listedMembers = (membersResponse.members ?? []).map(normalizeCongressMember).filter((member) => member !== null);
  const supplementalMembers = await fetchResolvedSupplementalMembers(supplementalMemberIds);
  const members = uniqueMembers([...listedMembers, ...supplementalMembers.map((record) => record.member)]);
  const rawMembers: Array<CongressMemberListItem | CongressMemberDetailItem> = [...(membersResponse.members ?? []), ...supplementalMembers.map((record) => record.raw)];
  const committees = (committeesResponse.committees ?? []).map(normalizeCongressCommittee).filter((committee) => committee !== null);
  const sponsorMembers = await fetchResolvedBillSponsors(bills);
  const billCosponsors = shouldSyncCosponsors ? await fetchResolvedBillCosponsors(bills, cosponsorLimit) : [];
  const cosponsorMembers = uniqueMembers(billCosponsors.map((cosponsor) => cosponsor.member));
  const houseVotes = shouldSyncHouseVotes ? await fetchResolvedHouseVotes(congress, houseVoteSession, houseVoteLimit) : [];
  const houseMemberVotes = shouldSyncHouseVotes && shouldSyncHouseMemberVotes ? await fetchResolvedHouseMemberVotes(houseVotes, houseMemberVoteLimit) : [];
  const houseVoteMembers = uniqueMembers(houseMemberVotes.map((memberVote) => memberVote.member));
  const sourceLinks = uniqueSourceLinks([
    ...members.flatMap(buildMemberSourceLinks),
    ...sponsorMembers.flatMap(buildMemberSourceLinks),
    ...cosponsorMembers.flatMap(buildMemberSourceLinks),
    ...houseVoteMembers.flatMap(buildMemberSourceLinks),
    ...bills.flatMap((bill) => buildBillSourceLinks(bill)),
    ...committees.flatMap(buildCommitteeSourceLinks)
  ]);

  console.log(`Normalized ${members.length} members.`);
  console.log(`Resolved ${supplementalMembers.length} supplemental member detail records.`);
  console.log(`Normalized ${bills.length} bills from the ${congress}th Congress.`);
  console.log(`Resolved ${billDetails.length} bill detail records.`);
  console.log(`Normalized ${committees.length} committees.`);
  console.log(`Resolved ${sponsorMembers.length} sponsor member records.`);
  if (shouldSyncCosponsors) {
    console.log(`Resolved ${billCosponsors.length} bill cosponsor links and ${cosponsorMembers.length} cosponsor member records.`);
  }
  if (shouldSyncHouseVotes) {
    console.log(`Resolved ${houseVotes.length} House vote records and ${houseMemberVotes.length} member vote positions.`);
  }
  console.log(`Prepared ${sourceLinks.length} official source links.`);

  const billSummaries = shouldSyncSummaries ? await fetchResolvedBillSummaries(bills) : [];
  if (shouldSyncSummaries) {
    const resolvedSummaryCount = billSummaries.filter((record) => record.summary?.text).length;
    console.log(`Resolved ${resolvedSummaryCount} official bill summaries.`);
  }

  if (!shouldWrite) {
    console.log("Dry run complete. Set CONGRESS_SYNC_WRITE=true with DATABASE_URL to persist members, bills, committees, cosponsors, House votes, member vote positions, official source links, and resolved summaries.");
    return;
  }

  if (!hasDatabaseUrl()) {
    throw new Error("CONGRESS_SYNC_WRITE=true requires DATABASE_URL.");
  }

  const prisma = getPrisma();
  const memberResult = await upsertCongressMembers(prisma, members, rawMembers);
  const sponsorMemberResult = await upsertCongressMembers(prisma, sponsorMembers);
  const billResult = await upsertCongressBills(prisma, bills, rawBills);
  const committeeResult = await upsertCongressCommittees(prisma, committees, committeesResponse.committees ?? []);
  const cosponsorMemberResult = shouldSyncCosponsors ? await upsertCongressMembers(prisma, cosponsorMembers) : { createdOrUpdated: 0, skipped: 0 };
  const cosponsorResult = shouldSyncCosponsors ? await upsertCongressCosponsors(prisma, billCosponsors) : { createdOrUpdated: 0, skipped: 0 };
  const houseVoteMemberResult = shouldSyncHouseVotes && shouldSyncHouseMemberVotes ? await upsertCongressMembers(prisma, houseVoteMembers) : { createdOrUpdated: 0, skipped: 0 };
  const houseVoteResult = shouldSyncHouseVotes ? await upsertCongressVotes(prisma, houseVotes) : { createdOrUpdated: 0, skipped: 0 };
  const houseMemberVoteResult = shouldSyncHouseVotes && shouldSyncHouseMemberVotes ? await upsertCongressMemberVotes(prisma, houseMemberVotes) : { createdOrUpdated: 0, skipped: 0 };
  const sourceLinkResult = await upsertOfficialSourceLinks(prisma, sourceLinks);
  const summaryResult = shouldSyncSummaries ? await upsertCongressBillSummaries(prisma, billSummaries) : { createdOrUpdated: 0, skipped: 0 };

  console.log(`Upserted ${memberResult.createdOrUpdated} member records.`);
  console.log(`Upserted ${sponsorMemberResult.createdOrUpdated} sponsor member records.`);
  console.log(`Upserted ${billResult.createdOrUpdated} bill records.`);
  console.log(`Upserted ${committeeResult.createdOrUpdated} committee records.`);
  if (shouldSyncCosponsors) {
    console.log(`Upserted ${cosponsorMemberResult.createdOrUpdated} cosponsor member records.`);
    console.log(`Upserted ${cosponsorResult.createdOrUpdated} bill cosponsor links.`);
  }
  if (shouldSyncHouseVotes) {
    console.log(`Upserted ${houseVoteResult.createdOrUpdated} House vote records.`);
    if (shouldSyncHouseMemberVotes) {
      console.log(`Upserted ${houseVoteMemberResult.createdOrUpdated} House vote member records.`);
      console.log(`Upserted ${houseMemberVoteResult.createdOrUpdated} House member vote positions.`);
    }
  }
  console.log(`Upserted ${sourceLinkResult.createdOrUpdated} official source links.`);
  if (shouldSyncSummaries) {
    console.log(`Updated ${summaryResult.createdOrUpdated} official bill summaries.`);
  }
  if (billResult.skipped) {
    console.log(`Skipped ${billResult.skipped} bill sponsor references because the sponsor member was not synced yet.`);
  }
  if (summaryResult.skipped) {
    console.log(`Skipped ${summaryResult.skipped} bill summaries because Congress.gov had no summary yet or the bill was not synced.`);
  }
  if (cosponsorResult.skipped) {
    console.log(`Skipped ${cosponsorResult.skipped} bill cosponsor links because the bill or member was not synced yet.`);
  }
  if (houseVoteResult.skipped) {
    console.log(`Skipped ${houseVoteResult.skipped} House votes because the vote date was missing or invalid.`);
  }
  if (houseMemberVoteResult.skipped) {
    console.log(`Skipped ${houseMemberVoteResult.skipped} House member vote positions because the vote or member was not synced yet.`);
  }
  console.log("Congress.gov upsert complete. Senate vote ingestion remains a future blended-source step.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
