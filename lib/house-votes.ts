import { fetchHouseVoteMembers, fetchHouseVotes, type CongressHouseVoteMemberItem } from "@/lib/congress/client";
import { normalizeCongressHouseMemberVote, normalizeCongressHouseVote, type NormalizedCongressVote } from "@/lib/congress/normalizers";
import type { Member, Vote, VotePosition } from "@/types/capitol";

export type HouseMemberVoteRecord = {
  memberBioguideId: string;
  position: VotePosition;
  positionLabel?: string;
  vote?: Vote;
  voteId: string;
};

const houseMemberVoteCache = new Map<string, { cachedAt: number; records: HouseMemberVoteRecord[] }>();
const houseMemberVoteCacheMaxAgeMs = 10 * 60 * 1000;
const houseVoteDetailBatchSize = 3;
const houseVoteMemberLimit = 500;

function readCongressFromTerm(term?: string) {
  const congress = Number(term?.match(/\d+/)?.[0]);
  if (Number.isInteger(congress) && congress > 0) return congress;
  const configuredCongress = Number(process.env.CONGRESS_SYNC_CONGRESS ?? 119);
  return Number.isInteger(configuredCongress) && configuredCongress > 0 ? configuredCongress : 119;
}

function currentSessionForCongress(congress: number) {
  const startYear = 1789 + (congress - 1) * 2;
  const session = new Date().getUTCFullYear() - startYear + 1;
  return Math.min(2, Math.max(1, session));
}

function clerkVoteUrl(vote: Pick<NormalizedCongressVote, "rollCall" | "voteDate">) {
  const year = new Date(vote.voteDate).getUTCFullYear();
  const paddedRollCall = vote.rollCall.padStart(3, "0");
  return `https://clerk.house.gov/Votes/${year}${paddedRollCall}`;
}

function toVote(vote: NormalizedCongressVote, member: Member): Vote {
  const session = vote.session ?? "1";

  return {
    billId: undefined,
    chamber: "House",
    congress: vote.congress,
    explanation: "Official House roll-call vote normalized from Congress.gov member position data.",
    id: `house-live-${vote.congress}-${session}-${vote.rollCall}`,
    memberBioguideIds: [member.bioguideId],
    question: vote.question,
    result: vote.result ?? "Recorded",
    rollCall: vote.rollCall,
    session,
    sourceUrl: vote.sourceUrl ?? clerkVoteUrl(vote),
    voteDate: vote.voteDate
  };
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

function findMemberVoteItem(items: CongressHouseVoteMemberItem[], bioguideId: string) {
  const normalizedBioguideId = bioguideId.toUpperCase();
  return items.find((item) => (item.bioguideId ?? item.bioguideID)?.toUpperCase() === normalizedBioguideId);
}

function getFreshCachedMemberVotes(cacheKey: string) {
  const cached = houseMemberVoteCache.get(cacheKey);
  if (!cached) return null;
  if (Date.now() - cached.cachedAt > houseMemberVoteCacheMaxAgeMs) {
    houseMemberVoteCache.delete(cacheKey);
    return null;
  }
  return cached.records;
}

async function fetchMemberVoteForRollCall(vote: NormalizedCongressVote, member: Member, timeoutMs: number): Promise<HouseMemberVoteRecord | null> {
  const response = await fetchHouseVoteMembers(vote.congress, Number(vote.session ?? 1), vote.rollCall, {
    limit: houseVoteMemberLimit,
    timeoutMs
  }).catch(() => null);
  const memberVoteItem = findMemberVoteItem(
    [...collectHouseVoteMemberItems(response?.houseRollCallVoteMemberVotes), ...collectHouseVoteMemberItems(response?.houseRollCallMemberVotes)],
    member.bioguideId
  );
  const normalized = memberVoteItem ? normalizeCongressHouseMemberVote(memberVoteItem, vote) : null;
  if (!normalized) return null;

  const normalizedVote = toVote(vote, member);

  return {
    memberBioguideId: member.bioguideId,
    position: normalized.position,
    vote: normalizedVote,
    voteId: normalizedVote.id
  };
}

export async function fetchHouseMemberVotes(member: Member, limit = 12, timeoutMs = 5_000): Promise<HouseMemberVoteRecord[]> {
  if (member.chamber !== "House") return [];

  const congress = readCongressFromTerm(member.term);
  const currentSession = currentSessionForCongress(congress);
  const cacheKey = `${member.bioguideId}:${congress}:${currentSession}:${limit}`;
  const cached = getFreshCachedMemberVotes(cacheKey);
  if (cached) return cached;

  const sessions = currentSession === 2 ? [2, 1] : [1];
  const records: HouseMemberVoteRecord[] = [];
  const voteListLimit = Math.min(100, Math.max(20, limit + 12));

  for (const session of sessions) {
    if (records.length >= limit) break;

    const response = await fetchHouseVotes(congress, session, {
      limit: voteListLimit,
      timeoutMs
    }).catch(() => null);
    const votes = (response?.houseRollCallVotes ?? [])
      .map((vote) => normalizeCongressHouseVote(vote, congress, session))
      .filter((vote): vote is NormalizedCongressVote => Boolean(vote));

    for (let index = 0; index < votes.length && records.length < limit; index += houseVoteDetailBatchSize) {
      const detailRecords = await Promise.all(votes.slice(index, index + houseVoteDetailBatchSize).map((vote) => fetchMemberVoteForRollCall(vote, member, timeoutMs)));
      records.push(...detailRecords.filter((record): record is HouseMemberVoteRecord => Boolean(record)));
    }
  }

  const limitedRecords = records
    .sort((a, b) => Date.parse(b.vote?.voteDate ?? "0") - Date.parse(a.vote?.voteDate ?? "0"))
    .slice(0, limit);

  houseMemberVoteCache.set(cacheKey, {
    cachedAt: Date.now(),
    records: limitedRecords
  });

  return limitedRecords;
}
