import { z } from "zod";

const BASE_URL = "https://api.congress.gov/v3";

const CongressResponseSchema = z.object({
  request: z.record(z.unknown()).optional(),
  pagination: z.record(z.unknown()).optional()
});

type CongressFetchOptions = {
  limit?: number;
  offset?: number;
  format?: "json" | "xml";
};

type CongressPagination = {
  count?: number;
  next?: string;
};

export class CongressApiError extends Error {
  constructor(
    message: string,
    public status?: number
  ) {
    super(message);
    this.name = "CongressApiError";
  }
}

function getApiKey() {
  const key = process.env.CONGRESS_API_KEY;
  if (!key || key === "replace_me") {
    throw new CongressApiError("CONGRESS_API_KEY is not configured.");
  }
  return key;
}

export async function congressFetch<T>(path: string, options: CongressFetchOptions = {}): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  url.searchParams.set("api_key", getApiKey());
  url.searchParams.set("format", options.format ?? "json");

  if (options.limit) url.searchParams.set("limit", String(options.limit));
  if (options.offset) url.searchParams.set("offset", String(options.offset));

  const response = await fetch(url, {
    headers: {
      Accept: "application/json"
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new CongressApiError(`Congress.gov request failed for ${path}`, response.status);
  }

  const json = (await response.json()) as T;
  CongressResponseSchema.passthrough().parse(json);
  return json;
}

export type CongressMemberListResponse = {
  pagination?: CongressPagination;
  members?: Array<{
    bioguideId?: string;
    depiction?: {
      imageUrl?: string;
    };
    district?: number;
    name?: string;
    partyName?: string;
    state?: string;
    terms?: {
      item?: Array<{
        chamber?: string;
        startYear?: number;
        endYear?: number;
      }>;
    };
    updateDate?: string;
    url?: string;
  }>;
};

export type CongressMemberListItem = NonNullable<CongressMemberListResponse["members"]>[number];

export type CongressBillListResponse = {
  pagination?: CongressPagination;
  bills?: Array<{
    congress?: number;
    committees?: {
      count?: number;
      url?: string;
    };
    latestAction?: {
      actionDate?: string;
      text?: string;
    };
    number?: string;
    originChamber?: string;
    policyArea?: {
      name?: string;
    };
    sponsors?: Array<{
      bioguideId?: string;
      fullName?: string;
      url?: string;
    }>;
    title?: string;
    type?: string;
    updateDate?: string;
    url?: string;
  }>;
};

export type CongressBillListItem = NonNullable<CongressBillListResponse["bills"]>[number];

export type CongressBillSummariesResponse = {
  pagination?: CongressPagination;
  summaries?: Array<{
    actionDate?: string;
    actionDesc?: string;
    text?: string;
    updateDate?: string;
    versionCode?: string;
  }>;
};

export type CongressBillSummaryItem = NonNullable<CongressBillSummariesResponse["summaries"]>[number];

export type CongressBillCosponsorsResponse = {
  pagination?: CongressPagination;
  cosponsors?: Array<{
    bioguideId?: string;
    district?: number;
    firstName?: string;
    fullName?: string;
    isOriginalCosponsor?: boolean;
    lastName?: string;
    middleName?: string;
    party?: string;
    sponsorshipDate?: string;
    state?: string;
    url?: string;
    withdrawnDate?: string;
  }>;
};

export type CongressBillCosponsorItem = NonNullable<CongressBillCosponsorsResponse["cosponsors"]>[number];

export type CongressHouseVoteItem = {
  congress?: number | string;
  rollCallNumber?: number | string;
  sessionNumber?: number | string;
  voteQuestion?: string;
  question?: string;
  result?: string;
  startDate?: string;
  voteDate?: string;
  updateDate?: string;
  legislationNumber?: number | string;
  legislationType?: string;
  legislationUrl?: string;
  sourceDataURL?: string;
  sourceUrl?: string;
  url?: string;
};

export type CongressHouseVotesResponse = {
  pagination?: CongressPagination;
  houseRollCallVotes?: CongressHouseVoteItem[];
};

export type CongressHouseVoteResponse = {
  houseRollCallVote?: CongressHouseVoteItem | CongressHouseVoteItem[];
  houseRollCallVotes?: CongressHouseVoteItem[];
};

export type CongressHouseVoteMemberItem = {
  bioguideId?: string;
  bioguideID?: string;
  district?: number | string;
  firstName?: string;
  lastName?: string;
  memberName?: string;
  name?: string;
  party?: string;
  state?: string;
  voteCast?: string;
  vote?: string;
};

export type CongressHouseVoteMembersResponse = {
  pagination?: CongressPagination;
  houseRollCallMemberVotes?: CongressHouseVoteMemberItem[];
  houseRollCallVoteMemberVotes?: CongressHouseVoteMemberItem[];
};

export type CongressCommitteeListResponse = {
  pagination?: CongressPagination;
  committees?: Array<{
    chamber?: string;
    name?: string;
    systemCode?: string;
    updateDate?: string;
    url?: string;
  }>;
};

export type CongressCommitteeListItem = NonNullable<CongressCommitteeListResponse["committees"]>[number];

export async function fetchMembers(options: CongressFetchOptions = {}) {
  return congressFetch<CongressMemberListResponse>("/member", options);
}

export async function fetchBills(congress: number, options: CongressFetchOptions = {}) {
  return congressFetch<CongressBillListResponse>(`/bill/${congress}`, options);
}

export async function fetchCommittees(chamber?: "house" | "senate", options: CongressFetchOptions = {}) {
  return congressFetch<CongressCommitteeListResponse>(chamber ? `/committee/${chamber}` : "/committee", options);
}

export async function fetchBill(congress: number, billType: string, billNumber: string) {
  return congressFetch(`/bill/${congress}/${billType.toLowerCase()}/${billNumber}`);
}

export async function fetchBillSummaries(congress: number, billType: string, billNumber: string, options: CongressFetchOptions = {}) {
  return congressFetch<CongressBillSummariesResponse>(`/bill/${congress}/${billType.toLowerCase()}/${billNumber}/summaries`, options);
}

export async function fetchBillCosponsors(congress: number, billType: string, billNumber: string, options: CongressFetchOptions = {}) {
  return congressFetch<CongressBillCosponsorsResponse>(`/bill/${congress}/${billType.toLowerCase()}/${billNumber}/cosponsors`, options);
}

export async function fetchHouseVotes(congress: number, session: number, options: CongressFetchOptions = {}) {
  return congressFetch<CongressHouseVotesResponse>(`/house-vote/${congress}/${session}`, options);
}

export async function fetchHouseVote(congress: number, session: number, voteNumber: string | number) {
  return congressFetch<CongressHouseVoteResponse>(`/house-vote/${congress}/${session}/${voteNumber}`);
}

export async function fetchHouseVoteMembers(congress: number, session: number, voteNumber: string | number, options: CongressFetchOptions = {}) {
  return congressFetch<CongressHouseVoteMembersResponse>(`/house-vote/${congress}/${session}/${voteNumber}/members`, options);
}

export async function fetchMember(bioguideId: string) {
  return congressFetch(`/member/${bioguideId}`);
}
