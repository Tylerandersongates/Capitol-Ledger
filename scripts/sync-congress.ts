import {
  CongressApiError,
  fetchBill,
  fetchBillCosponsors,
  fetchBills,
  fetchBillSummaries,
  fetchCommittees,
  fetchHouseVote,
  fetchHouseVoteMembers,
  fetchHouseVotes,
  fetchMember,
  fetchMembers,
  fetchMembersByCongress,
  type CongressBillListItem,
  type CongressHouseVoteMemberItem,
  type CongressMemberDetailItem,
  type CongressMemberListItem
} from "../lib/congress/client";
import { fetchPaginatedBillCatalog, validateCurrentBillCatalog } from "../lib/congress/bill-catalog";
import { fetchPaginatedMemberRoster, validateCurrentMemberRoster } from "../lib/congress/member-roster";
import {
  fetchOfficialVoteXml,
  fetchPaginatedHouseVoteCatalog,
  houseClerkVotePageUrl,
  houseClerkVoteXmlUrl,
  mapWithConcurrency,
  parseHouseClerkVoteXml,
  parseSenateVoteMenu,
  parseSenateVoteXml,
  senatePositionMemberKey,
  senateVoteMenuUrl,
  validateVoteCatalog,
  voteMemberKey,
  type ParsedSenateVoteCatalog,
  type ParsedVotePositionCatalog
} from "../lib/congress/vote-catalog";
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
  upsertCongressBillCatalog,
  upsertCongressBills,
  upsertCongressBillSummaries,
  upsertCongressCommittees,
  upsertCongressCosponsors,
  upsertCongressMembers,
  upsertCongressMemberVotes,
  upsertCongressVotes,
  upsertOfficialSourceLinks,
  reconcileCongressMemberRoster
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
type HistoricalVoteMemberRecord = {
  member: Member;
  raw: CongressMemberDetailItem | CongressMemberListItem;
};
type CompleteVoteCatalog = {
  historicalMembers: HistoricalVoteMemberRecord[];
  memberVotes: ResolvedHouseMemberVoteRecord[];
  senateVoteDetails: ParsedSenateVoteCatalog[];
  voteDetails: ParsedVotePositionCatalog[];
  votes: ResolvedHouseVoteRecord[];
};

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

function readVoteSessionsEnv(name: string, fallback = "1,2") {
  const values = uniqueStrings(
    (process.env[name] ?? fallback)
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
  );
  const sessions = values.map(Number);
  if (!sessions.length || sessions.some((session) => session !== 1 && session !== 2)) {
    throw new Error(`${name} must contain session 1, session 2, or both.`);
  }
  return sessions;
}

type TargetBillKey = {
  billNumber: string;
  billType: string;
  congress: number;
};

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values));
}

function parseTargetBillKey(value: string, fallbackCongress: number): TargetBillKey | null {
  const parts = value
    .split(/[:/]/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 2) {
    const [billType, billNumber] = parts;
    if (!billType || !billNumber) return null;
    return {
      billNumber,
      billType: billType.toUpperCase(),
      congress: fallbackCongress
    };
  }

  if (parts.length === 3) {
    const [congressValue, billType, billNumber] = parts;
    const congress = Number(congressValue);
    if (!Number.isInteger(congress) || !billType || !billNumber) return null;
    return {
      billNumber,
      billType: billType.toUpperCase(),
      congress
    };
  }

  return null;
}

function readTargetBillKeysEnv(name: string, fallbackCongress: number) {
  const targets = readStringListEnv(name)
    .map((value) => parseTargetBillKey(value, fallbackCongress))
    .filter((value): value is TargetBillKey => Boolean(value));

  return Array.from(new Map(targets.map((target) => [billSyncKey(target), target])).values());
}

function billSyncKey(bill: Pick<Bill, "billNumber" | "billType" | "congress">) {
  return `${bill.congress}:${bill.billType.toUpperCase()}:${bill.billNumber}`;
}

function houseVoteSyncKey(vote: ResolvedHouseVoteRecord) {
  return `${vote.congress}:${vote.chamber}:${vote.session}:${vote.rollCall}`;
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

async function fetchResolvedTargetBillDetails(targets: TargetBillKey[]) {
  const records: CongressBillListItem[] = [];

  for (const target of targets) {
    try {
      const response = await fetchBill(target.congress, target.billType, target.billNumber);
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

async function fetchResolvedTargetHouseVotes(congress: number, session: number, voteNumbers: string[]) {
  const records: ResolvedHouseVoteRecord[] = [];

  for (const voteNumber of uniqueStrings(voteNumbers)) {
    try {
      const response = await fetchHouseVote(congress, session, voteNumber);
      const rawVotes = [
        ...(Array.isArray(response.houseRollCallVote) ? response.houseRollCallVote : response.houseRollCallVote ? [response.houseRollCallVote] : []),
        ...(response.houseRollCallVotes ?? [])
      ];
      const normalized = rawVotes.map((vote) => normalizeCongressHouseVote(vote, congress, session)).filter((vote) => vote !== null);
      records.push(...normalized);
    } catch (error) {
      if (!(error instanceof CongressApiError)) throw error;
    }
  }

  return records;
}

async function fetchResolvedHouseMemberVotes(votes: ResolvedHouseVoteRecord[], limit: number) {
  const records: ResolvedHouseMemberVoteRecord[] = [];

  for (const vote of votes) {
    try {
      const response = await fetchHouseVoteMembers(vote.congress, Number(vote.session ?? 1), vote.rollCall, { limit });
      const rawMemberVotes = [
        ...collectHouseVoteMemberItems(response.houseRollCallVoteMemberVotes),
        ...collectHouseVoteMemberItems(response.houseRollCallMemberVotes)
      ];
      const normalized = rawMemberVotes.map((memberVote) => normalizeCongressHouseMemberVote(memberVote, vote)).filter((memberVote) => memberVote !== null);
      records.push(...normalized);
    } catch (error) {
      if (!(error instanceof CongressApiError)) throw error;
    }
  }

  return records;
}

async function fetchCompleteVoteCatalog({
  allCongressMembers,
  concurrency,
  congress,
  currentMembers,
  houseMaxPages,
  housePageLimit,
  minimumVoteCount,
  sessions,
  timeoutMs
}: {
  allCongressMembers: CongressMemberListItem[];
  concurrency: number;
  congress: number;
  currentMembers: Member[];
  houseMaxPages: number;
  housePageLimit: number;
  minimumVoteCount: number;
  sessions: number[];
  timeoutMs: number;
}): Promise<CompleteVoteCatalog> {
  const houseCatalog = await fetchPaginatedHouseVoteCatalog({
    congress,
    fetchPage: (session, offset, pageSize) => fetchHouseVotes(congress, session, { limit: pageSize, offset, timeoutMs }),
    maxPages: houseMaxPages,
    pageSize: housePageLimit,
    sessions
  });

  const houseVotes = houseCatalog.rawVotes
    .map((raw) => normalizeCongressHouseVote(raw, congress, Number(raw.sessionNumber ?? 1)))
    .filter((vote): vote is ResolvedHouseVoteRecord => Boolean(vote))
    .map((vote) => ({
      ...vote,
      sourceUrl: houseClerkVotePageUrl(vote)
    }));
  const voteDetails = await mapWithConcurrency(houseVotes, concurrency, async (vote) => {
    const xml = await fetchOfficialVoteXml(houseClerkVoteXmlUrl(vote), timeoutMs);
    return parseHouseClerkVoteXml(xml, vote);
  });
  const resolvedHouseVotes = voteDetails.map((detail) => detail.vote);
  const houseExpectedCounts = {
    ...Object.fromEntries(Object.entries(houseCatalog.expectedCounts).map(([session, count]) => [`House:${session}`, count])),
  };
  validateVoteCatalog(resolvedHouseVotes, {
    congress,
    expectedCounts: houseExpectedCounts,
    minimumVoteCount: Object.values(houseExpectedCounts).reduce((sum, count) => sum + count, 0)
  });

  const senateMenusBySession = await Promise.all(
    sessions.map(async (session) => {
      const xml = await fetchOfficialVoteXml(senateVoteMenuUrl(congress, session), timeoutMs);
      return parseSenateVoteMenu(xml);
    })
  );
  const senateMenus = senateMenusBySession.flat();
  const senateVoteDetails = await mapWithConcurrency(senateMenus, concurrency, async (menuVote) => {
    const xml = await fetchOfficialVoteXml(menuVote.sourceUrl, timeoutMs);
    return parseSenateVoteXml(xml, menuVote);
  });
  const senateVotes = senateVoteDetails.map((detail) => detail.vote);
  const senateExpectedCounts = {
    ...Object.fromEntries(
      sessions.map((session) => [`Senate:${session}`, senateMenus.filter((vote) => vote.session === session).length])
    )
  };
  validateVoteCatalog(senateVotes, {
    congress,
    expectedCounts: senateExpectedCounts,
    minimumVoteCount: Object.values(senateExpectedCounts).reduce((sum, count) => sum + count, 0)
  });

  const votes = [...resolvedHouseVotes, ...senateVotes];
  const expectedCounts = { ...houseExpectedCounts, ...senateExpectedCounts };
  validateVoteCatalog(votes, {
    congress,
    expectedCounts,
    minimumVoteCount: Math.max(minimumVoteCount, Object.values(expectedCounts).reduce((sum, count) => sum + count, 0))
  });

  const currentMemberIds = new Set(currentMembers.map((member) => member.bioguideId));
  const allMemberRecords = allCongressMembers.flatMap<HistoricalVoteMemberRecord>((raw) => {
    const member = normalizeCongressMember(raw);
    if (!member) return [];
    return [
      {
        member: {
          ...member,
          active: currentMemberIds.has(member.bioguideId)
        },
        raw
      }
    ];
  });
  const houseMemberVotes = voteDetails.flatMap((detail) => detail.positions);
  const listedMemberIds = new Set(allMemberRecords.map((record) => record.member.bioguideId));
  const missingHouseMemberIds = Array.from(
    new Set(
      houseMemberVotes
        .map((position) => position.memberBioguideId)
        .filter((memberBioguideId) => !listedMemberIds.has(memberBioguideId))
    )
  );
  const supplementalHouseMemberRecords = await mapWithConcurrency(
    missingHouseMemberIds,
    Math.min(concurrency, 3),
    async (memberBioguideId): Promise<HistoricalVoteMemberRecord> => {
      const response = await fetchMember(memberBioguideId, { timeoutMs });
      const member = response.member ? normalizeCongressMemberDetail(response.member) : null;
      if (!member) {
        throw new Error("An official House vote member could not be resolved through Congress.gov.");
      }
      return {
        member: {
          ...member,
          active: currentMemberIds.has(member.bioguideId)
        },
        raw: response.member as CongressMemberDetailItem
      };
    }
  );
  allMemberRecords.push(...supplementalHouseMemberRecords);

  const membersById = new Map(allMemberRecords.map((record) => [record.member.bioguideId, record.member]));
  const senateMembersByKey = new Map(
    allMemberRecords
      .filter((record) => record.member.chamber === "Senate")
      .map((record) => [voteMemberKey(record.member), record.member])
  );

  const unknownHousePositions = houseMemberVotes.filter((position) => !membersById.has(position.memberBioguideId));
  const unknownHouseMemberPositions = unknownHousePositions.length;
  const senateMemberVotes = senateVoteDetails.flatMap((detail) =>
    detail.positions.flatMap<ResolvedHouseMemberVoteRecord>((position) => {
      const member = senateMembersByKey.get(senatePositionMemberKey(position));
      if (!member) return [];
      return [
        {
          memberBioguideId: member.bioguideId,
          position: position.position,
          positionLabel: position.positionLabel,
          vote: {
            chamber: detail.vote.chamber,
            congress: detail.vote.congress,
            rollCall: detail.vote.rollCall,
            session: detail.vote.session
          }
        }
      ];
    })
  );
  const expectedSenatePositionCount = senateVoteDetails.reduce((sum, detail) => sum + detail.expectedPositionCount, 0);
  const missingSenateMemberPositions = expectedSenatePositionCount - senateMemberVotes.length;

  if (unknownHouseMemberPositions || missingSenateMemberPositions) {
    throw new Error(
      `Vote catalog member mapping is incomplete: ${unknownHouseMemberPositions} House and ${missingSenateMemberPositions} Senate position(s) could not be mapped.`
    );
  }

  return {
    historicalMembers: allMemberRecords.filter((record) => !record.member.active),
    memberVotes: [...houseMemberVotes, ...senateMemberVotes],
    senateVoteDetails,
    voteDetails,
    votes
  };
}

function uniqueMembers(members: Member[]) {
  return Array.from(new Map(members.map((member) => [member.bioguideId, member])).values());
}

function uniqueSourceLinks(sourceLinks: CapitolSourceLink[]) {
  return Array.from(new Map(sourceLinks.map((sourceLink) => [sourceLink.id, sourceLink])).values());
}

function collectHouseVoteMemberItems(value: unknown): CongressHouseVoteMemberItem[] {
  if (Array.isArray(value)) return value.flatMap(collectHouseVoteMemberItems);
  if (!value || typeof value !== "object") return [];

  const record = value as Record<string, unknown>;
  if (record.bioguideId || record.bioguideID || record.memberName || record.name || record.voteCast || record.vote) {
    return [record as CongressHouseVoteMemberItem];
  }

  return Object.values(record).flatMap(collectHouseVoteMemberItems);
}

async function main() {
  const congress = readIntegerEnv("CONGRESS_SYNC_CONGRESS", 119, 1, 999);
  const limit = readIntegerEnv("CONGRESS_SYNC_LIMIT", 5, 1, 250);
  const shouldSyncBatch = readBooleanEnv("CONGRESS_SYNC_BATCH", true);
  const shouldSyncFullBillCatalog = readBooleanEnv("CONGRESS_SYNC_FULL_BILL_CATALOG", false);
  const billPageLimit = readIntegerEnv("CONGRESS_SYNC_BILL_PAGE_LIMIT", 250, 1, 250);
  const billMaxPages = readIntegerEnv("CONGRESS_SYNC_BILL_MAX_PAGES", 100, 1, 250);
  const billMinimumCount = readIntegerEnv("CONGRESS_SYNC_BILL_MIN_COUNT", 10_000, 1, 50_000);
  const billEnrichmentLimit = readIntegerEnv("CONGRESS_SYNC_BILL_ENRICHMENT_LIMIT", 25, 0, 250);
  const shouldSyncFullMemberRoster = readBooleanEnv("CONGRESS_SYNC_FULL_MEMBER_ROSTER", false);
  const memberPageLimit = readIntegerEnv("CONGRESS_SYNC_MEMBER_PAGE_LIMIT", 250, 1, 250);
  const memberMaxPages = readIntegerEnv("CONGRESS_SYNC_MEMBER_MAX_PAGES", 10, 1, 25);
  const memberMinimumCount = readIntegerEnv("CONGRESS_SYNC_MEMBER_MIN_COUNT", 500, 500, 600);
  const shouldReconcileMemberRoster = readBooleanEnv("CONGRESS_SYNC_RECONCILE_ROSTER", false);
  const shouldSyncSummaries = readBooleanEnv("CONGRESS_SYNC_SUMMARIES", true);
  const shouldSyncCosponsors = readBooleanEnv("CONGRESS_SYNC_COSPONSORS", true);
  const cosponsorLimit = readIntegerEnv("CONGRESS_SYNC_COSPONSOR_LIMIT", 50, 1, 250);
  const shouldSyncHouseVotes = readBooleanEnv("CONGRESS_SYNC_HOUSE_VOTES", false);
  const shouldSyncFullVoteCatalog = readBooleanEnv("CONGRESS_SYNC_FULL_VOTE_CATALOG", false);
  const voteSessions = readVoteSessionsEnv("CONGRESS_SYNC_VOTE_SESSIONS");
  const voteMinimumCount = readIntegerEnv("CONGRESS_SYNC_VOTE_MIN_COUNT", 1_000, 1, 5_000);
  const houseVotePageLimit = readIntegerEnv("CONGRESS_SYNC_VOTE_PAGE_LIMIT", 250, 1, 250);
  const houseVoteMaxPages = readIntegerEnv("CONGRESS_SYNC_VOTE_MAX_PAGES", 10, 1, 25);
  const voteFetchConcurrency = readIntegerEnv("CONGRESS_SYNC_VOTE_CONCURRENCY", 6, 1, 20);
  const voteFetchTimeoutMs = readIntegerEnv("CONGRESS_SYNC_VOTE_TIMEOUT_MS", 20_000, 1_000, 60_000);
  const votePositionBatchSize = readIntegerEnv("CONGRESS_SYNC_VOTE_POSITION_BATCH_SIZE", 2_000, 1, 5_000);
  const houseVoteSession = readIntegerEnv("CONGRESS_SYNC_HOUSE_SESSION", 1, 1, 2);
  const houseVoteLimit = readIntegerEnv("CONGRESS_SYNC_HOUSE_VOTE_LIMIT", 5, 1, 100);
  const shouldSyncHouseMemberVotes = readBooleanEnv("CONGRESS_SYNC_HOUSE_MEMBER_VOTES", true);
  const houseMemberVoteLimit = readIntegerEnv("CONGRESS_SYNC_HOUSE_MEMBER_VOTE_LIMIT", 500, 1, 500);
  const targetBillKeys = readTargetBillKeysEnv("CONGRESS_SYNC_BILLS", congress);
  const targetHouseVoteNumbers = uniqueStrings(readStringListEnv("CONGRESS_SYNC_HOUSE_VOTE_NUMBERS"));
  const shouldSyncTerritoryDelegates = readBooleanEnv("CONGRESS_SYNC_TERRITORY_DELEGATES", true);
  const supplementalMemberIds = uniqueStrings([
    ...(shouldSyncTerritoryDelegates && !shouldSyncFullMemberRoster ? territoryDelegateMemberIds : []),
    ...readStringListEnv("CONGRESS_SYNC_MEMBER_IDS")
  ]);
  const shouldWrite = process.env.CONGRESS_SYNC_WRITE === "true";
  const shouldFetchHouseVotes = shouldSyncFullVoteCatalog || shouldSyncHouseVotes || targetHouseVoteNumbers.length > 0;

  if (shouldSyncFullMemberRoster && !shouldSyncBatch) {
    throw new Error("CONGRESS_SYNC_FULL_MEMBER_ROSTER=true requires CONGRESS_SYNC_BATCH=true.");
  }
  if (shouldSyncFullBillCatalog && !shouldSyncBatch) {
    throw new Error("CONGRESS_SYNC_FULL_BILL_CATALOG=true requires CONGRESS_SYNC_BATCH=true.");
  }
  if (shouldSyncFullVoteCatalog && !shouldSyncBatch) {
    throw new Error("CONGRESS_SYNC_FULL_VOTE_CATALOG=true requires CONGRESS_SYNC_BATCH=true.");
  }
  if (shouldReconcileMemberRoster && !shouldSyncFullMemberRoster) {
    throw new Error("CONGRESS_SYNC_RECONCILE_ROSTER=true requires CONGRESS_SYNC_FULL_MEMBER_ROSTER=true.");
  }

  console.log("Testing Congress.gov API access...");
  console.log(`Congress: ${congress}`);
  console.log(`Limit: ${limit}`);
  console.log(`Batch sync: ${shouldSyncBatch ? "enabled" : "skipped"}`);
  console.log(
    `Current bill catalog: ${
      shouldSyncFullBillCatalog
        ? `full pagination enabled, ${billPageLimit} per page, ${billMaxPages}-page safety limit`
        : `single page, up to ${limit}`
    }`
  );
  console.log(`Bill enrichment: ${billEnrichmentLimit ? `up to ${billEnrichmentLimit} recent catalog records plus targeted bills` : "targeted bills only"}`);
  console.log(
    `Current member roster: ${
      shouldSyncFullMemberRoster || shouldSyncFullVoteCatalog
        ? `full pagination enabled, ${memberPageLimit} per page, ${memberMaxPages}-page safety limit`
        : `single page, up to ${limit}`
    }`
  );
  console.log(`Roster reconciliation: ${shouldReconcileMemberRoster ? "enabled after full validation" : "skipped"}`);
  console.log(`Target bill sync: ${targetBillKeys.length ? targetBillKeys.map(billSyncKey).join(", ") : "skipped"}`);
  console.log(`Summary sync: ${shouldSyncSummaries ? "enabled" : "skipped"}`);
  console.log(`Cosponsor sync: ${shouldSyncCosponsors ? `enabled, up to ${cosponsorLimit} per bill` : "skipped"}`);
  console.log(
    `Complete vote catalog: ${
      shouldSyncFullVoteCatalog
        ? `House and Senate sessions ${voteSessions.join(", ")}, ${voteFetchConcurrency}-request concurrency, ${voteMinimumCount}-vote minimum`
        : "skipped"
    }`
  );
  console.log(
    `House vote sync: ${
      shouldFetchHouseVotes
        ? `enabled, session ${houseVoteSession}, ${shouldSyncHouseVotes ? `up to ${houseVoteLimit} recent votes` : "no recent vote batch"}${
            targetHouseVoteNumbers.length ? `, targeted roll calls ${targetHouseVoteNumbers.join(", ")}` : ""
          }`
        : "skipped"
    }`
  );
  console.log(
    `Member vote sync: ${
      shouldSyncFullVoteCatalog
        ? `complete official positions, ${votePositionBatchSize}-record database batches`
        : shouldFetchHouseVotes && shouldSyncHouseMemberVotes
          ? `House only, up to ${houseMemberVoteLimit} positions per vote`
          : "skipped"
    }`
  );
  console.log(`Territory delegate supplemental sync: ${shouldSyncTerritoryDelegates ? "enabled" : "skipped"}`);
  console.log(`Supplemental member sync: ${supplementalMemberIds.length ? `${supplementalMemberIds.length} targeted records` : "skipped"}`);
  console.log(`Write mode: ${shouldWrite ? "enabled" : "dry run"}`);

  const memberRosterPromise = shouldSyncBatch
    ? shouldSyncFullMemberRoster || shouldSyncFullVoteCatalog
      ? fetchPaginatedMemberRoster({
          fetchPage: (offset, pageSize) => fetchMembersByCongress(congress, { currentMember: true, limit: pageSize, offset }),
          maxPages: memberMaxPages,
          pageSize: memberPageLimit
        })
      : fetchMembers({ limit }).then((response) => ({
          expectedCount: response.pagination?.count,
          members: response.members ?? [],
          pageCount: 1,
          rawRecordCount: response.members?.length ?? 0
        }))
    : Promise.resolve({
        expectedCount: undefined,
        members: [] as CongressMemberListItem[],
        pageCount: 0,
        rawRecordCount: 0
      });
  const voteMemberRosterPromise = shouldSyncFullVoteCatalog
    ? fetchPaginatedMemberRoster({
        fetchPage: (offset, pageSize) => fetchMembersByCongress(congress, { currentMember: false, limit: pageSize, offset }),
        maxPages: memberMaxPages,
        pageSize: memberPageLimit
      })
    : Promise.resolve({
        expectedCount: undefined,
        members: [] as CongressMemberListItem[],
        pageCount: 0,
        rawRecordCount: 0
      });
  const billCatalogPromise = shouldSyncBatch
    ? shouldSyncFullBillCatalog
      ? fetchPaginatedBillCatalog({
          fetchPage: (offset, pageSize) => fetchBills(congress, { limit: pageSize, offset }),
          maxPages: billMaxPages,
          pageSize: billPageLimit
        })
      : fetchBills(congress, { limit }).then((response) => ({
          bills: response.bills ?? [],
          expectedCount: response.pagination?.count,
          pageCount: 1,
          rawRecordCount: response.bills?.length ?? 0
        }))
    : Promise.resolve({
        bills: [] as CongressBillListItem[],
        expectedCount: undefined,
        pageCount: 0,
        rawRecordCount: 0
      });
  const [memberRoster, voteMemberRoster, billCatalog, committeesResponse] = await Promise.all([
    memberRosterPromise,
    voteMemberRosterPromise,
    billCatalogPromise,
    shouldSyncBatch ? fetchCommittees(undefined, { limit }) : Promise.resolve({ committees: [] })
  ]);

  const listedBills = billCatalog.bills.map(normalizeCongressBill).filter((bill) => bill !== null);
  const billCatalogValidation = shouldSyncFullBillCatalog
    ? validateCurrentBillCatalog(listedBills, {
        congress,
        expectedCount: billCatalog.expectedCount,
        minimumBillCount: billMinimumCount
      })
    : null;
  const listedBillsForEnrichment = shouldSyncFullBillCatalog ? listedBills.slice(0, billEnrichmentLimit) : listedBills;
  const listedBillDetails = await fetchResolvedBillDetails(listedBillsForEnrichment);
  const targetBillDetails = await fetchResolvedTargetBillDetails(targetBillKeys);
  const billDetails = [...listedBillDetails, ...targetBillDetails];
  const detailedBills = billDetails.map(normalizeCongressBill).filter((bill) => bill !== null);
  const bills = Array.from(new Map([...listedBills, ...detailedBills].map((bill) => [billSyncKey(bill), bill])).values());
  const enrichedBills = Array.from(new Map([...listedBillsForEnrichment, ...detailedBills].map((bill) => [billSyncKey(bill), bill])).values());
  const rawBills = [...billCatalog.bills, ...billDetails];
  const listedMembers = memberRoster.members.map(normalizeCongressMember).filter((member) => member !== null);
  const rosterValidation = shouldSyncFullMemberRoster || shouldSyncFullVoteCatalog
    ? validateCurrentMemberRoster(listedMembers, { minimumMemberCount: memberMinimumCount })
    : null;
  const supplementalMembers = await fetchResolvedSupplementalMembers(supplementalMemberIds);
  const members = uniqueMembers([...listedMembers, ...supplementalMembers.map((record) => record.member)]);
  const rawMembers: Array<CongressMemberListItem | CongressMemberDetailItem> = [...memberRoster.members, ...supplementalMembers.map((record) => record.raw)];
  const committees = (committeesResponse.committees ?? []).map(normalizeCongressCommittee).filter((committee) => committee !== null);
  const sponsorMembers = await fetchResolvedBillSponsors(enrichedBills);
  const billCosponsors = shouldSyncCosponsors ? await fetchResolvedBillCosponsors(enrichedBills, cosponsorLimit) : [];
  const cosponsorMembers = uniqueMembers(billCosponsors.map((cosponsor) => cosponsor.member));
  const completeVoteCatalog = shouldSyncFullVoteCatalog
    ? await fetchCompleteVoteCatalog({
        allCongressMembers: voteMemberRoster.members,
        concurrency: voteFetchConcurrency,
        congress,
        currentMembers: listedMembers,
        houseMaxPages: houseVoteMaxPages,
        housePageLimit: houseVotePageLimit,
        minimumVoteCount: voteMinimumCount,
        sessions: voteSessions,
        timeoutMs: voteFetchTimeoutMs
      })
    : null;
  const recentHouseVotes = !completeVoteCatalog && shouldSyncHouseVotes ? await fetchResolvedHouseVotes(congress, houseVoteSession, houseVoteLimit) : [];
  const targetedHouseVotes =
    !completeVoteCatalog && targetHouseVoteNumbers.length
      ? await fetchResolvedTargetHouseVotes(congress, houseVoteSession, targetHouseVoteNumbers)
      : [];
  const houseVotes = Array.from(new Map([...recentHouseVotes, ...targetedHouseVotes].map((vote) => [houseVoteSyncKey(vote), vote])).values());
  const houseMemberVotes =
    !completeVoteCatalog && shouldFetchHouseVotes && shouldSyncHouseMemberVotes
      ? await fetchResolvedHouseMemberVotes(houseVotes, houseMemberVoteLimit)
      : [];
  const houseVoteMembers = uniqueMembers(houseMemberVotes.map((memberVote) => memberVote.member).filter((member): member is Member => Boolean(member)));
  const historicalVoteMembers = completeVoteCatalog?.historicalMembers ?? [];
  const votesToWrite = completeVoteCatalog?.votes ?? houseVotes;
  const memberVotesToWrite = completeVoteCatalog?.memberVotes ?? houseMemberVotes;
  const sourceLinks = uniqueSourceLinks([
    ...members.flatMap(buildMemberSourceLinks),
    ...historicalVoteMembers.flatMap((record) => buildMemberSourceLinks(record.member)),
    ...sponsorMembers.flatMap(buildMemberSourceLinks),
    ...cosponsorMembers.flatMap(buildMemberSourceLinks),
    ...houseVoteMembers.flatMap(buildMemberSourceLinks),
    ...enrichedBills.flatMap((bill) => buildBillSourceLinks(bill)),
    ...committees.flatMap(buildCommitteeSourceLinks)
  ]);

  console.log(`Normalized ${members.length} members.`);
  if ((shouldSyncFullMemberRoster || shouldSyncFullVoteCatalog) && rosterValidation) {
    console.log(
      `Validated complete current roster: ${rosterValidation.memberCount} members (${rosterValidation.houseCount} House, ${rosterValidation.senateCount} Senate) across ${memberRoster.pageCount} API pages.`
    );
    if (memberRoster.expectedCount !== undefined) {
      console.log(`Congress.gov advertised ${memberRoster.expectedCount} current member records; received ${memberRoster.rawRecordCount}.`);
    }
  }
  console.log(`Resolved ${supplementalMembers.length} supplemental member detail records.`);
  console.log(`Normalized ${bills.length} bills from the ${congress}th Congress.`);
  if (billCatalogValidation) {
    console.log(
      `Validated complete bill catalog: ${billCatalogValidation.billCount} bills across ${billCatalog.pageCount} API pages (${Object.entries(
        billCatalogValidation.billTypeCounts
      )
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([billType, count]) => `${billType} ${count}`)
        .join(", ")}).`
    );
    if (billCatalog.expectedCount !== undefined) {
      console.log(`Congress.gov advertised ${billCatalog.expectedCount} bill records; received ${billCatalog.rawRecordCount}.`);
    }
  }
  console.log(`Selected ${enrichedBills.length} bills for bounded detail, sponsor, summary, and cosponsor enrichment.`);
  console.log(`Resolved ${targetBillDetails.length} targeted bill detail records.`);
  console.log(`Resolved ${billDetails.length} bill detail records.`);
  console.log(`Normalized ${committees.length} committees.`);
  console.log(`Resolved ${sponsorMembers.length} sponsor member records.`);
  if (shouldSyncCosponsors) {
    console.log(`Resolved ${billCosponsors.length} bill cosponsor links and ${cosponsorMembers.length} cosponsor member records.`);
  }
  if (shouldFetchHouseVotes) {
    if (completeVoteCatalog) {
      console.log(
        `Validated complete vote catalog: ${completeVoteCatalog.voteDetails.length} House and ${completeVoteCatalog.senateVoteDetails.length} Senate roll calls.`
      );
      console.log(
        `Resolved ${completeVoteCatalog.memberVotes.length} official member positions and ${historicalVoteMembers.length} inactive historical member record(s).`
      );
    } else {
      console.log(`Resolved ${houseVotes.length} House vote records and ${houseMemberVotes.length} member vote positions.`);
    }
  }
  console.log(`Prepared ${sourceLinks.length} official source links.`);

  const billSummaries = shouldSyncSummaries ? await fetchResolvedBillSummaries(enrichedBills) : [];
  if (shouldSyncSummaries) {
    const resolvedSummaryCount = billSummaries.filter((record) => record.summary?.text).length;
    console.log(`Resolved ${resolvedSummaryCount} official bill summaries.`);
  }

  if (!shouldWrite) {
    if (shouldReconcileMemberRoster && rosterValidation) {
      console.log(`Dry run verified ${rosterValidation.activeMemberIds.length} active IDs for guarded roster reconciliation.`);
    }
    console.log(
      "Dry run complete. Set CONGRESS_SYNC_WRITE=true with DATABASE_URL to persist members, bills, committees, cosponsors, House and Senate votes, member vote positions, official source links, and resolved summaries."
    );
    return;
  }

  if (!hasDatabaseUrl()) {
    throw new Error("CONGRESS_SYNC_WRITE=true requires DATABASE_URL.");
  }

  const prisma = getPrisma();
  const memberResult = await upsertCongressMembers(prisma, members, rawMembers);
  const historicalVoteMemberResult = completeVoteCatalog
    ? await upsertCongressMembers(
        prisma,
        historicalVoteMembers.map((record) => record.member),
        historicalVoteMembers.map((record) => record.raw)
      )
    : { createdOrUpdated: 0, skipped: 0 };
  const rosterReconciliationResult =
    shouldReconcileMemberRoster && rosterValidation
      ? await reconcileCongressMemberRoster(prisma, rosterValidation.activeMemberIds)
      : { deactivated: 0 };
  const sponsorMemberResult = await upsertCongressMembers(prisma, sponsorMembers);
  const billCatalogResult = shouldSyncFullBillCatalog
    ? await upsertCongressBillCatalog(prisma, listedBills, billCatalog.bills)
    : { createdOrUpdated: 0, skipped: 0 };
  const billResult = shouldSyncFullBillCatalog
    ? await upsertCongressBills(prisma, enrichedBills, billDetails, { preserveExistingEnrichment: true })
    : await upsertCongressBills(prisma, bills, rawBills);
  const committeeResult = await upsertCongressCommittees(prisma, committees, committeesResponse.committees ?? []);
  const cosponsorMemberResult = shouldSyncCosponsors ? await upsertCongressMembers(prisma, cosponsorMembers) : { createdOrUpdated: 0, skipped: 0 };
  const cosponsorResult = shouldSyncCosponsors ? await upsertCongressCosponsors(prisma, billCosponsors) : { createdOrUpdated: 0, skipped: 0 };
  const houseVoteMemberResult =
    !completeVoteCatalog && shouldFetchHouseVotes && shouldSyncHouseMemberVotes
      ? await upsertCongressMembers(prisma, houseVoteMembers)
      : { createdOrUpdated: 0, skipped: 0 };
  const voteResult = shouldFetchHouseVotes ? await upsertCongressVotes(prisma, votesToWrite) : { createdOrUpdated: 0, skipped: 0 };
  const memberVoteResult =
    shouldFetchHouseVotes && (shouldSyncHouseMemberVotes || Boolean(completeVoteCatalog))
      ? await upsertCongressMemberVotes(prisma, memberVotesToWrite, { batchSize: votePositionBatchSize })
      : { createdOrUpdated: 0, skipped: 0 };
  const sourceLinkResult = await upsertOfficialSourceLinks(prisma, sourceLinks);
  const summaryResult = shouldSyncSummaries ? await upsertCongressBillSummaries(prisma, billSummaries) : { createdOrUpdated: 0, skipped: 0 };

  console.log(`Upserted ${memberResult.createdOrUpdated} member records.`);
  if (completeVoteCatalog) {
    console.log(`Upserted ${historicalVoteMemberResult.createdOrUpdated} inactive historical member records needed for vote positions.`);
  }
  if (shouldReconcileMemberRoster) {
    console.log(`Deactivated ${rosterReconciliationResult.deactivated} member record(s) absent from the validated current roster.`);
  }
  console.log(`Upserted ${sponsorMemberResult.createdOrUpdated} sponsor member records.`);
  if (shouldSyncFullBillCatalog) {
    console.log(`Upserted ${billCatalogResult.createdOrUpdated} bill catalog records in guarded batches.`);
    console.log(`Enriched ${billResult.createdOrUpdated} bill records.`);
  } else {
    console.log(`Upserted ${billResult.createdOrUpdated} bill records.`);
  }
  console.log(`Upserted ${committeeResult.createdOrUpdated} committee records.`);
  if (shouldSyncCosponsors) {
    console.log(`Upserted ${cosponsorMemberResult.createdOrUpdated} cosponsor member records.`);
    console.log(`Upserted ${cosponsorResult.createdOrUpdated} bill cosponsor links.`);
  }
  if (shouldFetchHouseVotes) {
    console.log(`Upserted ${voteResult.createdOrUpdated} ${completeVoteCatalog ? "House and Senate" : "House"} vote records.`);
    if (shouldSyncHouseMemberVotes || completeVoteCatalog) {
      console.log(`Upserted ${houseVoteMemberResult.createdOrUpdated} House vote member records.`);
      console.log(`Upserted ${memberVoteResult.createdOrUpdated} member vote positions.`);
    }
  }
  console.log(`Upserted ${sourceLinkResult.createdOrUpdated} official source links.`);
  if (shouldSyncSummaries) {
    console.log(`Updated ${summaryResult.createdOrUpdated} official bill summaries.`);
  }
  if (billResult.skipped) {
    console.log(`Skipped ${billResult.skipped} bill sponsor references because the sponsor member was not synced yet.`);
  }
  if (billCatalogResult.skipped) {
    console.log(`Skipped ${billCatalogResult.skipped} catalog sponsor references because the sponsor member was not synced yet.`);
  }
  if (summaryResult.skipped) {
    console.log(`Skipped ${summaryResult.skipped} bill summaries because Congress.gov had no summary yet or the bill was not synced.`);
  }
  if (cosponsorResult.skipped) {
    console.log(`Skipped ${cosponsorResult.skipped} bill cosponsor links because the bill or member was not synced yet.`);
  }
  if (voteResult.skipped) {
    console.log(`Skipped ${voteResult.skipped} votes because the session or vote date was missing or invalid.`);
  }
  if (memberVoteResult.skipped) {
    console.log(`Skipped ${memberVoteResult.skipped} member vote positions because the vote or member was not synced yet.`);
  }
  console.log("Congress.gov and official chamber-source upsert complete.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
