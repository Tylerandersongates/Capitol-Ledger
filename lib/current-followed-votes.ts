import type { Bill, Vote } from "@/types/capitol";

export type CurrentFollowedVoteCandidate = {
  bill: Bill;
  vote: Vote;
};

export const maximumCurrentFollowedVoteCandidates = 500;
export const maximumFollowedBillIdsPerVoteQuery = 100;

export function currentFollowedVoteWindowStart(now: Date) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  start.setUTCDate(start.getUTCDate() - 1);
  return start;
}

export function normalizeCurrentFollowedVoteLimit(limit: number) {
  return Number.isInteger(limit) && limit >= 1 && limit <= maximumCurrentFollowedVoteCandidates
    ? limit
    : maximumCurrentFollowedVoteCandidates;
}

export function uniqueFollowedBillIds(followedBillIds: Iterable<string>) {
  return Array.from(new Set(followedBillIds)).filter(Boolean);
}

export function chunkFollowedBillIds(
  followedBillIds: Iterable<string>,
  chunkSize = maximumFollowedBillIdsPerVoteQuery
) {
  const ids = uniqueFollowedBillIds(followedBillIds);
  const boundedChunkSize = Number.isInteger(chunkSize) && chunkSize >= 1 && chunkSize <= maximumFollowedBillIdsPerVoteQuery
    ? chunkSize
    : maximumFollowedBillIdsPerVoteQuery;

  return Array.from(
    { length: Math.ceil(ids.length / boundedChunkSize) },
    (_, index) => ids.slice(index * boundedChunkSize, (index + 1) * boundedChunkSize)
  );
}

function parseStableFollowedBillId(value: string) {
  const match = value.match(/^live-(\d+)-([a-z]+)-(.+)$/i);
  if (!match) return null;

  return {
    alias: value,
    billNumber: match[3],
    billType: match[2].toUpperCase(),
    congress: Number(match[1])
  };
}

export function withFollowedBillAlias(
  candidate: CurrentFollowedVoteCandidate,
  followedBillIds: Iterable<string>
): CurrentFollowedVoteCandidate {
  const stableTarget = uniqueFollowedBillIds(followedBillIds)
    .map(parseStableFollowedBillId)
    .find((target) =>
      target?.congress === candidate.bill.congress &&
      target.billType === candidate.bill.billType.toUpperCase() &&
      target.billNumber === candidate.bill.billNumber
    );
  if (!stableTarget) return candidate;

  return {
    bill: { ...candidate.bill, id: stableTarget.alias },
    vote: { ...candidate.vote, billId: stableTarget.alias }
  };
}

export function selectCurrentFollowedVoteCandidates({
  candidates,
  followedBillIds,
  limit,
  now = new Date(),
  voteId
}: {
  candidates: Array<{ bill?: Bill; vote: Vote }>;
  followedBillIds: Iterable<string>;
  limit?: number;
  now?: Date;
  voteId?: string;
}): CurrentFollowedVoteCandidate[] {
  const boundedLimit = limit === undefined ? undefined : normalizeCurrentFollowedVoteLimit(limit);
  const followed = new Set(followedBillIds);
  const windowStart = currentFollowedVoteWindowStart(now).getTime();

  const eligibleCandidates = [...candidates]
    .sort((left, right) => {
      const dateDifference = Date.parse(right.vote.voteDate) - Date.parse(left.vote.voteDate);
      return dateDifference || left.vote.id.localeCompare(right.vote.id);
    })
    .filter((candidate): candidate is CurrentFollowedVoteCandidate => {
      if (voteId && candidate.vote.id !== voteId) return false;
      if (!candidate.bill || !candidate.vote.billId) return false;
      if (candidate.vote.billId !== candidate.bill.id || !followed.has(candidate.bill.id)) return false;
      const voteTime = Date.parse(candidate.vote.voteDate);
      return Number.isFinite(voteTime) && voteTime >= windowStart && voteTime <= now.getTime();
    });

  return boundedLimit === undefined ? eligibleCandidates : eligibleCandidates.slice(0, boundedLimit);
}
