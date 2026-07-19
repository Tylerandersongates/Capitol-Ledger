import type { CongressMemberListItem, CongressMemberListResponse } from "@/lib/congress/client";
import type { Member } from "@/types/capitol";

export type PaginatedMemberRosterResult = {
  expectedCount?: number;
  members: CongressMemberListItem[];
  pageCount: number;
  rawRecordCount: number;
};

export type MemberRosterValidation = {
  activeMemberIds: string[];
  houseCount: number;
  memberCount: number;
  senateCount: number;
};

type FetchMemberPage = (offset: number, limit: number) => Promise<CongressMemberListResponse>;

type PaginatedMemberRosterOptions = {
  fetchPage: FetchMemberPage;
  maxPages?: number;
  pageSize?: number;
};

type ValidateMemberRosterOptions = {
  maximumMemberCount?: number;
  minimumHouseCount?: number;
  minimumMemberCount?: number;
  minimumSenateCount?: number;
};

function paginationOffset(value?: string) {
  if (!value) return undefined;

  try {
    const offset = Number(new URL(value).searchParams.get("offset"));
    return Number.isInteger(offset) && offset >= 0 ? offset : undefined;
  } catch {
    return undefined;
  }
}

function finalizeRoster(
  membersById: Map<string, CongressMemberListItem>,
  expectedCount: number | undefined,
  pageCount: number,
  rawRecordCount: number
): PaginatedMemberRosterResult {
  if (expectedCount !== undefined && membersById.size < expectedCount) {
    throw new Error(`Congress.gov roster pagination ended with ${membersById.size} unique members, below the advertised ${expectedCount}.`);
  }

  return {
    expectedCount,
    members: Array.from(membersById.values()),
    pageCount,
    rawRecordCount
  };
}

export async function fetchPaginatedMemberRoster({
  fetchPage,
  maxPages = 10,
  pageSize = 250
}: PaginatedMemberRosterOptions): Promise<PaginatedMemberRosterResult> {
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 250) {
    throw new Error("Congress.gov member roster page size must be an integer from 1 to 250.");
  }
  if (!Number.isInteger(maxPages) || maxPages < 1 || maxPages > 25) {
    throw new Error("Congress.gov member roster max pages must be an integer from 1 to 25.");
  }

  const membersById = new Map<string, CongressMemberListItem>();
  const visitedOffsets = new Set<number>();
  let expectedCount: number | undefined;
  let offset = 0;
  let rawRecordCount = 0;

  for (let pageIndex = 0; pageIndex < maxPages; pageIndex += 1) {
    if (visitedOffsets.has(offset)) {
      throw new Error(`Congress.gov member roster pagination repeated offset ${offset}.`);
    }
    visitedOffsets.add(offset);

    const response = await fetchPage(offset, pageSize);
    const pageMembers = response.members ?? [];
    const advertisedCount = response.pagination?.count;

    if (advertisedCount !== undefined && Number.isInteger(advertisedCount) && advertisedCount >= 0) {
      if (expectedCount !== undefined && expectedCount !== advertisedCount) {
        throw new Error(`Congress.gov member roster count changed from ${expectedCount} to ${advertisedCount} during pagination.`);
      }
      expectedCount = advertisedCount;
    }

    rawRecordCount += pageMembers.length;
    pageMembers.forEach((member) => {
      if (member.bioguideId) membersById.set(member.bioguideId, member);
    });

    const nextOffset = paginationOffset(response.pagination?.next);
    if (nextOffset !== undefined) {
      if (nextOffset <= offset) {
        throw new Error(`Congress.gov member roster pagination returned non-advancing offset ${nextOffset}.`);
      }
      offset = nextOffset;
      continue;
    }

    const reachedAdvertisedCount = expectedCount !== undefined && membersById.size >= expectedCount;
    if (!pageMembers.length || pageMembers.length < pageSize || reachedAdvertisedCount) {
      return finalizeRoster(membersById, expectedCount, pageIndex + 1, rawRecordCount);
    }

    offset += pageSize;
  }

  throw new Error(`Congress.gov member roster exceeded the ${maxPages}-page safety limit.`);
}

export function validateCurrentMemberRoster(
  members: Member[],
  {
    maximumMemberCount = 600,
    minimumHouseCount = 400,
    minimumMemberCount = 500,
    minimumSenateCount = 90
  }: ValidateMemberRosterOptions = {}
): MemberRosterValidation {
  const uniqueMembers = new Map(members.map((member) => [member.bioguideId, member]));
  if (uniqueMembers.size !== members.length) {
    throw new Error(`Current-member roster contains ${members.length - uniqueMembers.size} duplicate Bioguide ID record(s).`);
  }

  const inactiveMembers = members.filter((member) => !member.active);
  if (inactiveMembers.length) {
    throw new Error(`Current-member roster contains ${inactiveMembers.length} record(s) marked inactive.`);
  }

  const houseCount = members.filter((member) => member.chamber === "House").length;
  const senateCount = members.filter((member) => member.chamber === "Senate").length;

  if (members.length < minimumMemberCount || members.length > maximumMemberCount) {
    throw new Error(`Current-member roster count ${members.length} is outside the safe range ${minimumMemberCount}-${maximumMemberCount}.`);
  }
  if (houseCount < minimumHouseCount) {
    throw new Error(`Current-member House roster count ${houseCount} is below the safe minimum ${minimumHouseCount}.`);
  }
  if (senateCount < minimumSenateCount) {
    throw new Error(`Current-member Senate roster count ${senateCount} is below the safe minimum ${minimumSenateCount}.`);
  }

  return {
    activeMemberIds: members.map((member) => member.bioguideId),
    houseCount,
    memberCount: members.length,
    senateCount
  };
}
