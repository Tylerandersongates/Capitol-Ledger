import { z } from "zod";

const BASE_URL = "https://api.congress.gov/v3";

const CongressResponseSchema = z.object({
  request: z.record(z.unknown()).optional(),
  pagination: z.record(z.unknown()).optional()
});

export type CongressFetchOptions = {
  currentMember?: boolean;
  offset?: number;
  format?: "json" | "xml";
  limit?: number;
  timeoutMs?: number;
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
  if (options.currentMember !== undefined) url.searchParams.set("currentMember", String(options.currentMember));

  const controller = options.timeoutMs ? new AbortController() : undefined;
  const timeout = controller && options.timeoutMs ? setTimeout(() => controller.abort(), options.timeoutMs) : undefined;
  let response: Response;

  try {
    response = await fetch(url, {
      headers: {
        Accept: "application/json"
      },
      cache: "no-store",
      signal: controller?.signal
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new CongressApiError(`Congress.gov request timed out for ${path}`, 408);
    }
    throw error;
  } finally {
    if (timeout) clearTimeout(timeout);
  }

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

export type CongressMemberDetailResponse = {
  member?: {
    bioguideId?: string;
    currentMember?: boolean;
    depiction?: {
      imageUrl?: string;
    };
    directOrderName?: string;
    district?: number;
    firstName?: string;
    honorificName?: string;
    invertedOrderName?: string;
    lastName?: string;
    officialWebsiteUrl?: string;
    partyHistory?: Array<{
      partyAbbreviation?: string;
      partyName?: string;
      startYear?: number;
    }>;
    state?: string;
    terms?: Array<{
      chamber?: string;
      district?: number;
      endYear?: number;
      memberType?: string;
      startYear?: number;
      stateCode?: string;
      stateName?: string;
    }>;
    updateDate?: string;
    url?: string;
  };
};

export type CongressMemberDetailItem = NonNullable<CongressMemberDetailResponse["member"]>;

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
    introducedDate?: string;
    number?: string;
    originChamber?: string;
    policyArea?: {
      name?: string;
    };
    sponsors?: Array<{
      bioguideId?: string;
      district?: number;
      firstName?: string;
      fullName?: string;
      lastName?: string;
      party?: string;
      state?: string;
      url?: string;
    }>;
    title?: string;
    type?: string;
    updateDate?: string;
    url?: string;
  }>;
};

export type CongressBillListItem = NonNullable<CongressBillListResponse["bills"]>[number];

export type CongressMemberLegislationResponse = {
  cosponsoredLegislation?: CongressMemberLegislationItem[];
  pagination?: CongressPagination;
  sponsoredLegislation?: CongressMemberLegislationItem[];
};

export type CongressMemberLegislationItem = {
  amendmentNumber?: string;
  congress?: number;
  introducedDate?: string;
  latestAction?: {
    actionDate?: string;
    text?: string;
  } | null;
  number?: string;
  policyArea?: {
    name?: string | null;
  };
  title?: string;
  type?: string | null;
  updateDate?: string;
  url?: string;
};

export type CongressBillDetailResponse = {
  bill?: CongressBillListItem;
};

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

export type CongressBillActionItem = {
  actionCode?: string;
  actionDate?: string;
  actionTime?: string;
  calendarNumber?: number | string;
  chamber?: string;
  committees?: Array<{
    name?: string;
    systemCode?: string;
    url?: string;
  }>;
  committee?: {
    name?: string;
    systemCode?: string;
    url?: string;
  };
  recordedVotes?: Array<{
    chamber?: string;
    congress?: number | string;
    rollNumber?: number | string;
    rollCallNumber?: number | string;
    sessionNumber?: number | string;
    url?: string;
  }>;
  sourceSystem?: {
    code?: string;
    name?: string;
  } | string;
  text?: string;
  type?: string;
  updateDate?: string;
  url?: string;
};

export type CongressBillActionsResponse = {
  actions?: CongressBillActionItem[];
  pagination?: CongressPagination;
};

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
  voteType?: string;
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
  voteParty?: string;
  voteState?: string;
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

export async function fetchMembersByCongress(congress: number, options: CongressFetchOptions = {}) {
  return congressFetch<CongressMemberListResponse>(`/member/congress/${congress}`, options);
}

export async function fetchBills(congress: number, options: CongressFetchOptions = {}) {
  return congressFetch<CongressBillListResponse>(`/bill/${congress}`, options);
}

export async function fetchCommittees(chamber?: "house" | "senate", options: CongressFetchOptions = {}) {
  return congressFetch<CongressCommitteeListResponse>(chamber ? `/committee/${chamber}` : "/committee", options);
}

export async function fetchBill(congress: number, billType: string, billNumber: string, options: CongressFetchOptions = {}) {
  return congressFetch<CongressBillDetailResponse>(`/bill/${congress}/${billType.toLowerCase()}/${billNumber}`, options);
}

export async function fetchBillSummaries(congress: number, billType: string, billNumber: string, options: CongressFetchOptions = {}) {
  return congressFetch<CongressBillSummariesResponse>(`/bill/${congress}/${billType.toLowerCase()}/${billNumber}/summaries`, options);
}

export async function fetchBillActions(congress: number, billType: string, billNumber: string, options: CongressFetchOptions = {}) {
  return congressFetch<CongressBillActionsResponse>(`/bill/${congress}/${billType.toLowerCase()}/${billNumber}/actions`, options);
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

export async function fetchMember(bioguideId: string, options: CongressFetchOptions = {}) {
  return congressFetch<CongressMemberDetailResponse>(`/member/${bioguideId}`, options);
}

export async function fetchMemberCosponsoredLegislation(bioguideId: string, options: CongressFetchOptions = {}) {
  return congressFetch<CongressMemberLegislationResponse>(`/member/${bioguideId}/cosponsored-legislation`, options);
}

export async function fetchMemberSponsoredLegislation(bioguideId: string, options: CongressFetchOptions = {}) {
  return congressFetch<CongressMemberLegislationResponse>(`/member/${bioguideId}/sponsored-legislation`, options);
}
