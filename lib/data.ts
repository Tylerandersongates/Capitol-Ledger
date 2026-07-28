import { billActions, bills, billVideos, cosponsors, members, memberVotes, updateEvents, votes } from "@/lib/demo-data";
import { isDefaultUnreadAlertDate, systemVoteReminderAlertId } from "@/lib/alert-rules";
import { fetchBill, fetchBillActions, fetchBillCosponsors, fetchBillSummaries, fetchMember, fetchMemberCosponsoredLegislation, fetchMemberSponsoredLegislation } from "@/lib/congress/client";
import { normalizeCongressBill, normalizeCongressBillAction, normalizeCongressBillCosponsor, normalizeCongressMemberDetail, normalizeCongressMemberLegislation } from "@/lib/congress/normalizers";
import { hasCompleteMemberRosterCounts, mergeMemberRosterWithFallback } from "@/lib/congress/member-roster";
import { publicBrandName } from "@/lib/brand";
import { fetchHouseMemberVotes } from "@/lib/house-votes";
import { issueSignals } from "@/lib/issue-signals";
import { memberServiceFallbacks } from "@/lib/member-service-history";
import { getBillStatus as resolveBillStatus } from "@/lib/bill-status";
import { getPrisma, hasDatabaseUrl } from "@/lib/prisma";
import { matchBillSources } from "@/lib/source-matching";
import { isOfficialSearchParty, normalizeSearchPartyFilter } from "@/lib/party-affiliations";
import { fetchSenateMemberVotes } from "@/lib/senate-votes";
import { currentCongressLabel } from "@/lib/utils";
import type { Bill as PrismaBill, Member as PrismaMember, MemberVote as PrismaMemberVote, Vote as PrismaVote } from "@prisma/client";
import { Chamber as PrismaChamber, Party as PrismaParty, Prisma } from "@prisma/client";
import type { Bill, BillAction, BillSourceMatch, BillVideo, Chamber, Member, Party, SourceLinkTargetType, Vote, VotePosition } from "@/types/capitol";

export type SearchFilters = {
  q?: string;
  status?: string;
  chamber?: string;
  party?: string;
  state?: string | string[];
  type?: string;
};

export type BillSummaryResolution = {
  label: string;
  publishedAt?: string;
  source: "official" | "stored" | "pending";
  text: string;
};

export type SearchRecordsResult = ReturnType<typeof searchRecords>;

type DatabaseSearchRecordsResult = SearchRecordsResult & {
  completeMemberRoster: boolean;
};

export type VoteMemberPositionRecord = {
  member?: Member;
  memberBioguideId: string;
  position: VotePosition;
  voteId: string;
};

export type MemberVoteRecord = {
  memberBioguideId: string;
  position: VotePosition;
  vote?: Vote;
  voteId: string;
};

export type BillDetailData = {
  bill: Bill;
  billActions: BillAction[];
  billVideos: BillVideo[];
  billVotes: Vote[];
  cosponsors: Member[];
  sourceMatches: BillSourceMatch[];
  sponsor?: Member;
  voteMemberPositionsByVoteId: Record<string, VoteMemberPositionRecord[]>;
};

export type MemberDetailData = {
  chamberMembers: Member[];
  caucusMemberships: MemberCaucusMembership[];
  cosponsoredBills: Bill[];
  member: Member;
  memberVotes: MemberVoteRecord[];
  sponsoredBills: Bill[];
};

export type MemberCaucusMembership = {
  caucusName: string;
  role: string;
  sourceLabel: string;
  sourceUrl: string;
  verifiedAt: string;
};

type DatabaseSourceLinkRow = {
  id: string;
  label: string;
  source: string;
  sourceKind: string;
  targetId: string;
  targetType: string;
  url: string;
  verifiedAt: Date | null;
};

const pendingOfficialSummaryText =
  `Official CRS summary not yet published by Congress.gov. ${publicBrandName} will display the official summary first when it becomes available.`;
const optionalDatabaseReadTimeoutMs = resolveOptionalDatabaseReadTimeoutMs();
const dashboardDatabaseReadTimeoutMs = resolveDashboardDatabaseReadTimeoutMs();
const memberLegislationFetchTimeoutMs = resolveMemberLegislationFetchTimeoutMs();
const houseVotesFetchTimeoutMs = resolveHouseVotesFetchTimeoutMs();
const senateVotesFetchTimeoutMs = resolveSenateVotesFetchTimeoutMs();
const dashboardLiveRecordsCacheMaxAgeMs = 10 * 60 * 1000;
const memberLegislationCacheMaxAgeMs = 10 * 60 * 1000;

type DashboardRecords = {
  bills: Bill[];
  votes: Vote[];
};

let dashboardLiveRecordsCache: { cachedAt: number; records: DashboardRecords } | null = null;
let memberLegislationCache = new Map<string, { cachedAt: number; records: Pick<MemberDetailData, "cosponsoredBills" | "sponsoredBills"> }>();
let memberProfileCache = new Map<string, { cachedAt: number; member: Member }>();

const memberCaucusMemberships: Record<string, MemberCaucusMembership[]> = {
  D000399: [
    {
      caucusName: "House Committee on Ways and Means",
      role: "Member",
      sourceLabel: "Ways and Means Democrats 119th Congress roster",
      sourceUrl: "https://democrats-waysandmeans.house.gov/subcommittees/committee-ways-and-means-119th-congress",
      verifiedAt: "2026-07-06"
    },
    {
      caucusName: "Ways and Means Subcommittee on Health",
      role: "Ranking Member",
      sourceLabel: "Ways and Means Democrats Health Subcommittee roster",
      sourceUrl: "https://democrats-waysandmeans.house.gov/subcommittees/health-119th-congress",
      verifiedAt: "2026-07-06"
    },
    {
      caucusName: "Ways and Means Subcommittee on Trade",
      role: "Member",
      sourceLabel: "Ways and Means Democrats Trade Subcommittee roster",
      sourceUrl: "https://democrats-waysandmeans.house.gov/subcommittees/trade-119th-congress",
      verifiedAt: "2026-07-06"
    },
    {
      caucusName: "Ways and Means Subcommittee on Oversight",
      role: "Member",
      sourceLabel: "Ways and Means Democrats Oversight Subcommittee roster",
      sourceUrl: "https://democrats-waysandmeans.house.gov/subcommittees/oversight-119th-congress",
      verifiedAt: "2026-07-06"
    },
    {
      caucusName: "House Committee on the Budget",
      role: "Member",
      sourceLabel: "House Budget Committee Democrats 119th Congress roster",
      sourceUrl: "https://democrats-budget.house.gov/about/membership",
      verifiedAt: "2026-07-06"
    }
  ],
  S001150: [
    {
      caucusName: "Senate Committee on the Judiciary",
      role: "Member",
      sourceLabel: "Official Senate committee assignments",
      sourceUrl: "https://www.schiff.senate.gov/about/committee-assignments/",
      verifiedAt: "2026-06-24"
    },
    {
      caucusName: "Judiciary Subcommittee on Intellectual Property",
      role: "Ranking Member",
      sourceLabel: "Official Senate committee assignments",
      sourceUrl: "https://www.schiff.senate.gov/about/committee-assignments/",
      verifiedAt: "2026-06-24"
    },
    {
      caucusName: "Judiciary Subcommittee on The Constitution",
      role: "Member",
      sourceLabel: "Official Senate committee assignments",
      sourceUrl: "https://www.schiff.senate.gov/about/committee-assignments/",
      verifiedAt: "2026-06-24"
    },
    {
      caucusName: "Judiciary Subcommittee on Privacy, Technology, and the Law",
      role: "Member",
      sourceLabel: "Official Senate committee assignments",
      sourceUrl: "https://www.schiff.senate.gov/about/committee-assignments/",
      verifiedAt: "2026-06-24"
    },
    {
      caucusName: "Judiciary Subcommittee on Antitrust, Competition Policy and Consumer Rights",
      role: "Member",
      sourceLabel: "Official Senate committee assignments",
      sourceUrl: "https://www.schiff.senate.gov/about/committee-assignments/",
      verifiedAt: "2026-06-24"
    },
    {
      caucusName: "Senate Committee on Environment and Public Works",
      role: "Member",
      sourceLabel: "Official Senate committee assignments",
      sourceUrl: "https://www.schiff.senate.gov/about/committee-assignments/",
      verifiedAt: "2026-06-24"
    },
    {
      caucusName: "EPW Subcommittee on Fisheries, Water, and Wildlife",
      role: "Ranking Member",
      sourceLabel: "Official Senate committee assignments",
      sourceUrl: "https://www.schiff.senate.gov/about/committee-assignments/",
      verifiedAt: "2026-06-24"
    },
    {
      caucusName: "EPW Subcommittee on Transportation and Infrastructure",
      role: "Member",
      sourceLabel: "Official Senate committee assignments",
      sourceUrl: "https://www.schiff.senate.gov/about/committee-assignments/",
      verifiedAt: "2026-06-24"
    },
    {
      caucusName: "Senate Committee on Agriculture, Nutrition, and Forestry",
      role: "Member",
      sourceLabel: "Official Senate committee assignments",
      sourceUrl: "https://www.schiff.senate.gov/about/committee-assignments/",
      verifiedAt: "2026-06-24"
    },
    {
      caucusName: "Agriculture Subcommittee on Conservation, Forestry, Natural Resources, and Biotechnology",
      role: "Member",
      sourceLabel: "Official Senate committee assignments",
      sourceUrl: "https://www.schiff.senate.gov/about/committee-assignments/",
      verifiedAt: "2026-06-24"
    },
    {
      caucusName: "Agriculture Subcommittee on Commodities, Derivatives, Risk Management, and Trade",
      role: "Member",
      sourceLabel: "Official Senate committee assignments",
      sourceUrl: "https://www.schiff.senate.gov/about/committee-assignments/",
      verifiedAt: "2026-06-24"
    },
    {
      caucusName: "Senate Committee on Small Business and Entrepreneurship",
      role: "Member",
      sourceLabel: "Official Senate committee assignments",
      sourceUrl: "https://www.schiff.senate.gov/about/committee-assignments/",
      verifiedAt: "2026-06-24"
    }
  ],
  B001302: [
    {
      caucusName: "House Freedom Caucus",
      role: "Former Chair",
      sourceLabel: "Official House biography",
      sourceUrl: "https://biggs.house.gov/about",
      verifiedAt: "2026-05-29"
    },
    {
      caucusName: "Border Security Caucus",
      role: "Co-Chair",
      sourceLabel: "Official committees and caucuses",
      sourceUrl: "https://biggs.house.gov/about/committees-and-caucuses",
      verifiedAt: "2026-05-29"
    },
    {
      caucusName: "Congressional Western Caucus",
      role: "Vice Chair",
      sourceLabel: "Official committees and caucuses",
      sourceUrl: "https://biggs.house.gov/about/committees-and-caucuses",
      verifiedAt: "2026-05-29"
    },
    {
      caucusName: "War Powers Caucus",
      role: "Co-Founder",
      sourceLabel: "Official committees and caucuses",
      sourceUrl: "https://biggs.house.gov/about/committees-and-caucuses",
      verifiedAt: "2026-05-29"
    },
    {
      caucusName: "Algae Caucus",
      role: "Co-Chair",
      sourceLabel: "Official committees and caucuses",
      sourceUrl: "https://biggs.house.gov/about/committees-and-caucuses",
      verifiedAt: "2026-05-29"
    },
    {
      caucusName: "ALS Caucus",
      role: "Member",
      sourceLabel: "Official committees and caucuses",
      sourceUrl: "https://biggs.house.gov/about/committees-and-caucuses",
      verifiedAt: "2026-05-29"
    },
    {
      caucusName: "Autism Caucus",
      role: "Member",
      sourceLabel: "Official committees and caucuses",
      sourceUrl: "https://biggs.house.gov/about/committees-and-caucuses",
      verifiedAt: "2026-05-29"
    },
    {
      caucusName: "Congressional Reformers Caucus",
      role: "Member",
      sourceLabel: "Official committees and caucuses",
      sourceUrl: "https://biggs.house.gov/about/committees-and-caucuses",
      verifiedAt: "2026-05-29"
    },
    {
      caucusName: "Fertilizer Caucus",
      role: "Member",
      sourceLabel: "Official committees and caucuses",
      sourceUrl: "https://biggs.house.gov/about/committees-and-caucuses",
      verifiedAt: "2026-05-29"
    },
    {
      caucusName: "Health Care Innovation Caucus",
      role: "Member",
      sourceLabel: "Official committees and caucuses",
      sourceUrl: "https://biggs.house.gov/about/committees-and-caucuses",
      verifiedAt: "2026-05-29"
    },
    {
      caucusName: "House Republican Israel Caucus",
      role: "Member",
      sourceLabel: "Official committees and caucuses",
      sourceUrl: "https://biggs.house.gov/about/committees-and-caucuses",
      verifiedAt: "2026-05-29"
    },
    {
      caucusName: "Japan Caucus",
      role: "Member",
      sourceLabel: "Official committees and caucuses",
      sourceUrl: "https://biggs.house.gov/about/committees-and-caucuses",
      verifiedAt: "2026-05-29"
    },
    {
      caucusName: "Missile Defense Caucus",
      role: "Member",
      sourceLabel: "Official committees and caucuses",
      sourceUrl: "https://biggs.house.gov/about/committees-and-caucuses",
      verifiedAt: "2026-05-29"
    },
    {
      caucusName: "Recording Arts and Sciences Congressional Caucus",
      role: "Member",
      sourceLabel: "Official committees and caucuses",
      sourceUrl: "https://biggs.house.gov/about/committees-and-caucuses",
      verifiedAt: "2026-05-29"
    },
    {
      caucusName: "Republican Hindu Caucus",
      role: "Member",
      sourceLabel: "Official committees and caucuses",
      sourceUrl: "https://biggs.house.gov/about/committees-and-caucuses",
      verifiedAt: "2026-05-29"
    },
    {
      caucusName: "School Choice Caucus",
      role: "Member",
      sourceLabel: "Official committees and caucuses",
      sourceUrl: "https://biggs.house.gov/about/committees-and-caucuses",
      verifiedAt: "2026-05-29"
    },
    {
      caucusName: "Second Amendment Caucus",
      role: "Member",
      sourceLabel: "Official committees and caucuses",
      sourceUrl: "https://biggs.house.gov/about/committees-and-caucuses",
      verifiedAt: "2026-05-29"
    },
    {
      caucusName: "Taiwan Caucus",
      role: "Member",
      sourceLabel: "Official committees and caucuses",
      sourceUrl: "https://biggs.house.gov/about/committees-and-caucuses",
      verifiedAt: "2026-05-29"
    },
    {
      caucusName: "Traumatic Brain Injury Caucus",
      role: "Member",
      sourceLabel: "Official committees and caucuses",
      sourceUrl: "https://biggs.house.gov/about/committees-and-caucuses",
      verifiedAt: "2026-05-29"
    },
    {
      caucusName: "Values Action Team",
      role: "Member",
      sourceLabel: "Official committees and caucuses",
      sourceUrl: "https://biggs.house.gov/about/committees-and-caucuses",
      verifiedAt: "2026-05-29"
    }
  ]
};

const dbChamberMap = {
  HOUSE: "House",
  SENATE: "Senate"
} as const satisfies Record<PrismaChamber, Chamber>;

const dbPartyMap = {
  DEMOCRAT: "Democrat",
  INDEPENDENT: "Independent",
  REPUBLICAN: "Republican",
  UNKNOWN: "Independent"
} as const satisfies Record<PrismaParty, Party>;

const dbVotePositionMap = {
  NO: "No",
  NOT_VOTING: "Not Voting",
  PRESENT: "Present",
  YES: "Yes"
} as const;

const filterChamberMap = {
  House: PrismaChamber.HOUSE,
  Senate: PrismaChamber.SENATE
} as const satisfies Record<Chamber, PrismaChamber>;

const filterPartyMap = {
  Democrat: PrismaParty.DEMOCRAT,
  Independent: PrismaParty.INDEPENDENT,
  Republican: PrismaParty.REPUBLICAN
} as const satisfies Record<Party, PrismaParty>;

type IssueSignal = (typeof issueSignals)[number];

const issueSearchAliases = {
  Affordability: ["affordable", "affordability", "cost of living", "consumer costs", "family costs", "prices", "housing", "rent"],
  "Border Security": ["border", "border security", "customs", "homeland security", "immigration", "port of entry", "ports of entry"],
  Jobs: ["apprenticeship", "career", "compensation", "economic development", "employment", "hiring", "job", "job training", "jobs", "labor", "salary", "small business", "unemployment", "wage", "wages", "worker", "workers", "workforce"],
  Inflation: ["consumer prices", "inflation", "price stability", "prices", "supply chain"],
  Healthcare: ["health", "health care", "healthcare", "hospital", "medicaid", "medicare", "patient", "patients", "public health"],
  "Healthcare Affordability": ["affordable care", "care affordability", "health care affordability", "healthcare affordability", "medical costs", "patient costs", "prescription drug", "prescription drugs"],
  Education: ["education", "school", "schools", "student", "students", "teacher", "teachers", "tuition"],
  Infrastructure: ["broadband", "infrastructure", "ports", "public works", "resilience", "roads", "transportation", "water"],
  "Federal Budget Deficit": ["appropriations", "budget", "debt", "deficit", "federal budget", "fiscal", "spending"],
  "Drug Addiction": ["addiction", "behavioral health", "drug", "opioid", "opioids", "overdose", "substance abuse", "substance use"],
  "Gun Violence": ["firearm", "firearms", "gun", "gun violence", "public safety", "school safety", "second amendment", "violence"],
  "Climate Change": ["climate", "climate change", "emissions", "energy", "environment", "resilience", "sustainability"],
  "Veterans Affairs": ["department of veterans affairs", "servicemember", "servicemembers", "veteran", "veterans", "veterans affairs"],
  "Public Safety": ["emergency", "first responder", "first responders", "law enforcement", "police", "public safety", "violence"]
} as const satisfies Record<IssueSignal, readonly string[]>;

const billSearchAliases = {
  "save america act": ["SAVE Act", "Safeguard American Voter Eligibility Act", "voter eligibility"],
  "save america": ["SAVE Act", "Safeguard American Voter Eligibility Act", "voter eligibility"]
} as const satisfies Record<string, readonly string[]>;

const billReferenceTypeMap = {
  hconres: "HCONRES",
  hjres: "HJRES",
  hr: "HR",
  hres: "HRES",
  s: "S",
  sconres: "SCONRES",
  sjres: "SJRES",
  sres: "SRES"
} as const;

type ParsedBillReference = {
  billNumber: string;
  billType: (typeof billReferenceTypeMap)[keyof typeof billReferenceTypeMap];
};

function matchesText(values: Array<string | undefined>, query: string) {
  const normalized = query.toLowerCase();
  return values.some((value) => value?.toLowerCase().includes(normalized));
}

function normalizeSearchTerm(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueSearchTerms(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function getIssueSearchTerms(query: string) {
  const normalizedQuery = normalizeSearchTerm(query);
  const matchedSignal = issueSignals.find((signal) => normalizeSearchTerm(signal) === normalizedQuery);

  if (!matchedSignal) return [query];
  return uniqueSearchTerms([query, ...issueSearchAliases[matchedSignal]]);
}

function parseBillSearchReference(query: string): ParsedBillReference | null {
  const normalizedQuery = normalizeSearchTerm(query);
  const compactQuery = normalizedQuery.replace(/\s+/g, "");
  const compactMatch = compactQuery.match(/^(hconres|hjres|hres|hr|sconres|sjres|sres|s)(\d+)$/);
  const spacedMatch = normalizedQuery.match(/\b(h\s*con\s*res|h\s*j\s*res|h\s*res|h\s*r|s\s*con\s*res|s\s*j\s*res|s\s*res|s)\s+(\d+)\b/);
  const matchedType = compactMatch?.[1] ?? spacedMatch?.[1]?.replace(/\s+/g, "");
  const billNumber = compactMatch?.[2] ?? spacedMatch?.[2];

  if (!matchedType || !billNumber) return null;
  const billType = billReferenceTypeMap[matchedType as keyof typeof billReferenceTypeMap];
  if (!billType) return null;

  return {
    billNumber,
    billType
  };
}

function getBillSearchTerms(query: string) {
  const normalizedQuery = normalizeSearchTerm(query);
  const parsedBillReference = parseBillSearchReference(query);
  const billNumberTerms = parsedBillReference ? [] : query.match(/\d+/g) ?? [];
  const aliasTerms = Object.entries(billSearchAliases)
    .filter(([alias]) => normalizedQuery === alias || normalizedQuery.includes(alias))
    .flatMap(([, terms]) => terms);

  return uniqueSearchTerms([...getIssueSearchTerms(query), ...billNumberTerms, ...aliasTerms]);
}

function matchesAnyText(values: Array<string | undefined>, queries: string[]) {
  return queries.some((query) => matchesText(values, query));
}

function billSearchValues(bill: Bill) {
  return [
    bill.displayNumber,
    bill.title,
    bill.shortTitle,
    bill.policyArea,
    bill.committeeName,
    bill.latestActionText,
    bill.summary,
    getBillSponsor(bill)?.fullName
  ];
}

function databaseBillSearchClauses(query: string, terms: string[]): Prisma.BillWhereInput[] {
  const parsedBillReference = parseBillSearchReference(query);
  const exactReferenceClauses: Prisma.BillWhereInput[] = parsedBillReference
    ? [
        {
          billNumber: parsedBillReference.billNumber,
          billType: {
            equals: parsedBillReference.billType,
            mode: "insensitive"
          }
        }
      ]
    : [];

  return [
    ...exactReferenceClauses,
    ...terms.flatMap(
      (term): Prisma.BillWhereInput[] => [
        { billNumber: { contains: term, mode: "insensitive" } },
        { billType: { contains: term, mode: "insensitive" } },
        { latestActionText: { contains: term, mode: "insensitive" } },
        { policyArea: { contains: term, mode: "insensitive" } },
        { shortTitle: { contains: term, mode: "insensitive" } },
        { summary: { contains: term, mode: "insensitive" } },
        { title: { contains: term, mode: "insensitive" } }
      ]
    )
  ];
}

function stripSummaryMarkup(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function normalizeDateString(value?: Date | null) {
  return value?.toISOString().slice(0, 10) ?? "1970-01-01";
}

function stableLiveBillId(bill: Pick<Bill, "billNumber" | "billType" | "congress">) {
  return `live-${bill.congress}-${bill.billType.toLowerCase()}-${bill.billNumber}`;
}

function parseStableLiveBillId(id: string) {
  const match = id.match(/^live-(\d+)-([a-z]+)-(.+)$/i);
  if (!match) return null;

  return {
    billNumber: match[3],
    billType: match[2].toUpperCase(),
    congress: Number(match[1])
  };
}

function formatBillDisplay(type: string, number: string) {
  const normalizedType = type.toUpperCase();
  if (normalizedType === "HR") return `H.R. ${number}`;
  if (normalizedType === "HJRES") return `H.J.Res. ${number}`;
  if (normalizedType === "HCONRES") return `H.Con.Res. ${number}`;
  if (normalizedType === "HRES") return `H.Res. ${number}`;
  if (normalizedType === "S") return `S. ${number}`;
  if (normalizedType === "SJRES") return `S.J.Res. ${number}`;
  if (normalizedType === "SCONRES") return `S.Con.Res. ${number}`;
  if (normalizedType === "SRES") return `S.Res. ${number}`;
  return `${normalizedType} ${number}`;
}

type RawMemberTermRecord = {
  chamber?: string;
  endYear?: number;
  startYear?: number;
};

function parseYear(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function parseServiceDate(value: unknown) {
  if (typeof value !== "string") return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString().slice(0, 10);
}

function parseTermsInOffice(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(1, Math.trunc(value));
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) return Math.max(1, parsed);
  }
  return undefined;
}

function normalizeRawChamber(value: unknown): Chamber | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.toLowerCase();
  if (normalized.includes("house")) return "House";
  if (normalized.includes("senate")) return "Senate";
  return undefined;
}

function parseRawMemberTerm(item: Prisma.JsonValue): RawMemberTermRecord | undefined {
  if (!item || typeof item !== "object" || Array.isArray(item)) return undefined;
  const record = item as Record<string, unknown>;
  return {
    chamber: typeof record.chamber === "string" ? record.chamber : undefined,
    endYear: parseYear(record.endYear),
    startYear: parseYear(record.startYear)
  };
}

function readRawMemberTerms(rawJson: Prisma.JsonValue | null): RawMemberTermRecord[] {
  if (!rawJson || typeof rawJson !== "object" || Array.isArray(rawJson)) return [];
  const termsBlock = (rawJson as Record<string, Prisma.JsonValue>).terms;
  if (!termsBlock) return [];
  const items = Array.isArray(termsBlock) ? termsBlock : typeof termsBlock === "object" ? (termsBlock as Record<string, Prisma.JsonValue>).item : undefined;
  if (!Array.isArray(items)) return [];

  const parsed: RawMemberTermRecord[] = [];
  for (const item of items) {
    const term = parseRawMemberTerm(item);
    if (term) parsed.push(term);
  }

  return parsed;
}

function readRawMemberService(rawJson: Prisma.JsonValue | null) {
  if (!rawJson || typeof rawJson !== "object" || Array.isArray(rawJson)) return {};
  const record = rawJson as Record<string, unknown>;

  return {
    firstElectedDate: parseServiceDate(record.firstElectedDate),
    nextElectionDate: parseServiceDate(record.nextElectionDate),
    termsInOffice: parseTermsInOffice(record.termsInOffice)
  } as const;
}

function deriveTermsFromRaw(rawTerms: RawMemberTermRecord[], chamber: Chamber) {
  const chamberTerms = rawTerms.filter((term) => {
    const rawChamber = normalizeRawChamber(term.chamber);
    return !rawChamber || rawChamber === chamber;
  });
  const workingTerms = chamberTerms.length ? chamberTerms : rawTerms;
  const starts = workingTerms.map((term) => term.startYear).filter((value): value is number => Number.isFinite(value));

  if (!starts.length) return undefined;

  const firstStart = Math.min(...starts);
  const currentYear = new Date().getUTCFullYear();
  const latestEnd = Math.max(
    ...workingTerms.map((term) => {
      if (Number.isFinite(term.endYear)) return term.endYear as number;
      return currentYear;
    })
  );
  const servedYears = Math.max(1, latestEnd - firstStart + 1);

  if (chamber === "House") return Math.max(1, Math.ceil(servedYears / 2));
  return Math.max(1, Math.ceil(servedYears / 6));
}

function deriveElectionDatesFromRaw(_rawTerms: RawMemberTermRecord[], _chamber: Chamber) {
  // Congress.gov term years describe congressional service intervals, not exact election dates or Senate classes.
  // Keep dates absent unless a separately verified source has supplied them.
  return {
    firstElectedDate: undefined,
    nextElectionDate: undefined
  } as const;
}

function mapDatabaseMember(member: PrismaMember): Member {
  const rawTerms = readRawMemberTerms(member.rawJson ?? null);
  const chamber = dbChamberMap[member.chamber];
  const termLabel = currentCongressLabel();
  const serviceFallback = memberServiceFallbacks[member.bioguideId];
  const rawService = readRawMemberService(member.rawJson ?? null);
  const termsInOffice = serviceFallback?.termsInOffice ?? rawService.termsInOffice ?? (rawTerms.length ? deriveTermsFromRaw(rawTerms, chamber) : undefined);
  const derivedElectionDates = deriveElectionDatesFromRaw(rawTerms, chamber);
  const firstElectedDate = serviceFallback?.firstElectedDate ?? rawService.firstElectedDate ?? derivedElectionDates.firstElectedDate;
  const nextElectionDate = serviceFallback?.nextElectionDate ?? rawService.nextElectionDate ?? derivedElectionDates.nextElectionDate;

  return {
    active: member.active,
    bioguideId: member.bioguideId,
    chamber,
    description: `${chamber} member from ${member.state} imported from Congress.gov.`,
    district: member.district ?? undefined,
    firstElectedDate,
    firstName: member.firstName,
    fullName: member.fullName,
    lastName: member.lastName,
    nextElectionDate,
    officialUrl: member.officialUrl ?? undefined,
    party: dbPartyMap[member.party],
    photoUrl: member.photoUrl ?? undefined,
    sourceUrl: member.sourceUrl ?? `https://www.congress.gov/member/${member.bioguideId}`,
    state: member.state,
    term: termLabel,
    termsInOffice
  };
}

function mapDatabaseBill(bill: PrismaBill): Bill {
  return {
    billNumber: bill.billNumber,
    billType: bill.billType,
    committeeName: undefined,
    congress: bill.congress,
    displayNumber: formatBillDisplay(bill.billType, bill.billNumber),
    id: bill.id,
    introducedDate: undefined,
    latestActionDate: normalizeDateString(bill.latestActionDate),
    latestActionText: bill.latestActionText ?? "Latest action pending from Congress.gov.",
    policyArea: bill.policyArea ?? "Legislation",
    shortTitle: bill.shortTitle ?? bill.title,
    sourceUrl: bill.sourceUrl ?? "https://www.congress.gov/",
    sponsorBioguideId: bill.sponsorBioguideId ?? undefined,
    summary: bill.summary ?? `Live Congress.gov bill record imported into ${publicBrandName}.`,
    title: bill.title
  };
}

function mapDatabaseVote(vote: PrismaVote & { memberVotes?: Pick<PrismaMemberVote, "memberBioguideId" | "position">[] }): Vote {
  const positionCounts = (vote.memberVotes ?? []).reduce(
    (counts, memberVote) => {
      const position = dbVotePositionMap[memberVote.position];
      if (position === "Yes") counts.yes += 1;
      if (position === "No") counts.no += 1;
      if (position === "Present") counts.present += 1;
      if (position === "Not Voting") counts.notVoting += 1;
      return counts;
    },
    { no: 0, notVoting: 0, present: 0, yes: 0 }
  );

  return {
    billId: vote.billId ?? undefined,
    chamber: dbChamberMap[vote.chamber],
    congress: vote.congress,
    explanation: "Live roll-call vote imported from Congress.gov.",
    id: vote.id,
    memberBioguideIds: uniqueStrings((vote.memberVotes ?? []).map((memberVote) => memberVote.memberBioguideId)),
    noCount: positionCounts.no,
    notVotingCount: positionCounts.notVoting,
    presentCount: positionCounts.present,
    question: vote.question,
    result: vote.result ?? "Recorded",
    rollCall: vote.rollCall,
    sourceUrl: vote.sourceUrl ?? "https://api.congress.gov/",
    voteDate: normalizeDateString(vote.voteDate),
    yesCount: positionCounts.yes
  };
}

function mergeBy<T>(live: T[], demo: T[], key: (value: T) => string) {
  return Array.from(new Map([...live, ...demo].map((value) => [key(value), value])).values());
}

function mergeBillsByRecordKey(live: Bill[], demo: Bill[]) {
  return dedupeDashboardBills([...live, ...demo]);
}

function dedupeDashboardBills(values: Bill[]) {
  const billsByKey = new Map<string, Bill>();

  values.forEach((bill) => {
    const key = getDashboardBillKey(bill);
    const current = billsByKey.get(key);
    billsByKey.set(key, current ? chooseDashboardBill(current, bill) : bill);
  });

  return Array.from(billsByKey.values());
}

function getDashboardBillKey(bill: Pick<Bill, "billNumber" | "billType" | "congress" | "displayNumber" | "id" | "shortTitle" | "title">) {
  const congress = String(bill.congress || "").trim();
  const billType = normalizeDashboardBillKeyPart(bill.billType);
  const billNumber = normalizeDashboardBillKeyPart(bill.billNumber);

  if (congress && billType && billNumber) return `${congress}:${billType}:${billNumber}`;

  return [normalizeDashboardBillKeyPart(bill.displayNumber), normalizeDashboardBillKeyPart(bill.shortTitle || bill.title)].filter(Boolean).join(":") || bill.id;
}

function normalizeDashboardBillKeyPart(value?: string | number) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function chooseDashboardBill(current: Bill, candidate: Bill) {
  const currentIsDemo = isDemoDashboardBill(current);
  const candidateIsDemo = isDemoDashboardBill(candidate);

  if (currentIsDemo !== candidateIsDemo) return candidateIsDemo ? current : candidate;

  const actionDelta = Date.parse(candidate.latestActionDate) - Date.parse(current.latestActionDate);
  if (actionDelta > 0) return candidate;
  if (actionDelta < 0) return current;

  const currentIsOfficial = current.sourceUrl.includes("congress.gov");
  const candidateIsOfficial = candidate.sourceUrl.includes("congress.gov");
  if (currentIsOfficial !== candidateIsOfficial) return candidateIsOfficial ? candidate : current;

  return current;
}

function isDemoDashboardBill(bill: Bill) {
  return bill.id.startsWith("demo-") || bill.sourceUrl.includes("/demo");
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function resolveOptionalDatabaseReadTimeoutMs() {
  const configuredTimeout = Number(process.env.CAPITOL_LEDGER_DATABASE_READ_TIMEOUT_MS);

  if (Number.isFinite(configuredTimeout) && configuredTimeout > 0) {
    return Math.max(500, configuredTimeout);
  }

  return process.env.NODE_ENV === "production" ? 5_000 : 1_500;
}

function resolveDashboardDatabaseReadTimeoutMs() {
  const configuredTimeout = Number(process.env.CAPITOL_LEDGER_DASHBOARD_DATABASE_READ_TIMEOUT_MS);

  if (Number.isFinite(configuredTimeout) && configuredTimeout > 0) {
    return Math.max(1_000, configuredTimeout);
  }

  return process.env.NODE_ENV === "production" ? Math.max(optionalDatabaseReadTimeoutMs, 12_000) : optionalDatabaseReadTimeoutMs;
}

function resolveBillSummaryFetchTimeoutMs() {
  const configuredTimeout = Number(process.env.CAPITOL_LEDGER_BILL_SUMMARY_FETCH_TIMEOUT_MS);

  if (Number.isFinite(configuredTimeout) && configuredTimeout > 0) {
    return Math.max(500, configuredTimeout);
  }

  return process.env.NODE_ENV === "production" ? 3_500 : 6_000;
}

function resolveMemberLegislationFetchTimeoutMs() {
  const configuredTimeout = Number(process.env.CAPITOL_LEDGER_MEMBER_LEGISLATION_FETCH_TIMEOUT_MS);

  if (Number.isFinite(configuredTimeout) && configuredTimeout > 0) {
    return Math.max(500, configuredTimeout);
  }

  return process.env.NODE_ENV === "production" ? 4_000 : 7_000;
}

function resolveHouseVotesFetchTimeoutMs() {
  const configuredTimeout = Number(process.env.CAPITOL_LEDGER_HOUSE_VOTES_FETCH_TIMEOUT_MS);

  if (Number.isFinite(configuredTimeout) && configuredTimeout > 0) {
    return Math.max(1_000, configuredTimeout);
  }

  return process.env.NODE_ENV === "production" ? 10_000 : 8_000;
}

function resolveSenateVotesFetchTimeoutMs() {
  const configuredTimeout = Number(process.env.CAPITOL_LEDGER_SENATE_VOTES_FETCH_TIMEOUT_MS);

  if (Number.isFinite(configuredTimeout) && configuredTimeout > 0) {
    return Math.max(1_000, configuredTimeout);
  }

  return process.env.NODE_ENV === "production" ? 10_000 : 8_000;
}

async function withOptionalDatabaseReadTimeout<T>(read: () => Promise<T | null>, timeoutMs = optionalDatabaseReadTimeoutMs) {
  if (!shouldUseOptionalDatabaseReads()) return null;

  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      read(),
      new Promise<null>((resolve) => {
        timeoutId = setTimeout(() => resolve(null), timeoutMs);
      })
    ]);
  } catch {
    return null;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

function shouldUseOptionalDatabaseReads() {
  if (!hasDatabaseUrl()) return false;
  if (process.env.CAPITOL_LEDGER_DISABLE_DATABASE_READS === "true") return false;

  return (
    process.env.CAPITOL_LEDGER_ENABLE_DATABASE_READS === "true" ||
    (process.env.NODE_ENV !== "production" && process.env.CAPITOL_LEDGER_ENABLE_LOCAL_DATABASE_READS === "true")
  );
}

export function getMember(bioguideId: string) {
  return members.find((member) => member.bioguideId === bioguideId);
}

export function getBill(id: string) {
  return bills.find((bill) => bill.id === id);
}

export async function getBillSummary(bill: Bill): Promise<BillSummaryResolution> {
  try {
    const data = await fetchBillSummaries(bill.congress, bill.billType, bill.billNumber, { limit: 5, timeoutMs: resolveBillSummaryFetchTimeoutMs() });
    const officialSummary = (data.summaries ?? [])
      .filter((summary) => summary.text)
      .sort((a, b) => Date.parse(b.updateDate ?? b.actionDate ?? "0") - Date.parse(a.updateDate ?? a.actionDate ?? "0"))[0];

    if (officialSummary?.text) {
      return {
        label: "Official CRS Summary",
        publishedAt: officialSummary.updateDate ?? officialSummary.actionDate,
        source: "official",
        text: stripSummaryMarkup(officialSummary.text)
      };
    }
  } catch {
    // Official summaries are an enhancement; fall back to stored text when Congress.gov is slow or unavailable.
  }

  if (bill.summary) {
    return {
      label: bill.summary.toLowerCase().startsWith("generated") ? "AI Brief From Bill Record" : "Stored Bill Summary",
      source: "stored",
      text: bill.summary
    };
  }

  return {
    label: "Official Summary Pending",
    source: "pending",
    text: pendingOfficialSummaryText
  };
}

export function getVote(id: string) {
  return votes.find((vote) => vote.id === id);
}

export function getBillSponsor(bill: Bill) {
  if (!bill.sponsorBioguideId) return undefined;
  return getMember(bill.sponsorBioguideId);
}

export function getSponsoredBills(bioguideId: string) {
  return bills.filter((bill) => bill.sponsorBioguideId === bioguideId);
}

export function getCosponsoredBills(bioguideId: string) {
  const billIds = cosponsors
    .filter((cosponsor) => cosponsor.memberBioguideId === bioguideId)
    .map((cosponsor) => cosponsor.billId);
  return bills.filter((bill) => billIds.includes(bill.id));
}

export function getBillCosponsors(billId: string) {
  const cosponsorIds = cosponsors
    .filter((cosponsor) => cosponsor.billId === billId)
    .map((cosponsor) => cosponsor.memberBioguideId);
  return members.filter((member) => cosponsorIds.includes(member.bioguideId));
}

export function getBillVideos(billId: string) {
  return billVideos.filter((video) => video.billId === billId);
}

export function getMemberVotes(bioguideId: string) {
  return memberVotes
    .filter((memberVote) => memberVote.memberBioguideId === bioguideId)
    .map((memberVote) => ({
      ...memberVote,
      vote: votes.find((vote) => vote.id === memberVote.voteId)
    }))
    .filter((record) => Boolean(record.vote));
}

export function getMemberCaucusMemberships(bioguideId: string) {
  return memberCaucusMemberships[bioguideId] ?? [];
}

function getDemoMemberDetailData(bioguideId: string): MemberDetailData | null {
  const member = getMember(bioguideId);
  if (!member) return null;

  return {
    chamberMembers: getAllMembers().filter((candidate) => candidate.chamber === member.chamber),
    caucusMemberships: getMemberCaucusMemberships(member.bioguideId),
    cosponsoredBills: getCosponsoredBills(member.bioguideId),
    member,
    memberVotes: selectMemberVoteRecords([], getMemberVotes(member.bioguideId) as MemberVoteRecord[], 20),
    sponsoredBills: getSponsoredBills(member.bioguideId)
  };
}

async function getLiveMemberDetailData(bioguideId: string): Promise<MemberDetailData | null> {
  if (!/^[A-Z][0-9]{6}$/.test(bioguideId)) return null;

  const member = await getLiveMemberProfile(bioguideId);
  if (!member?.active) return null;

  return {
    caucusMemberships: getMemberCaucusMemberships(member.bioguideId),
    chamberMembers: mergeMemberRosterWithFallback(
      [member],
      getAllMembers().filter((candidate) => candidate.chamber === member.chamber)
    ),
    cosponsoredBills: [],
    member,
    memberVotes: [],
    sponsoredBills: []
  };
}

async function getDatabaseMemberDetailData(bioguideId: string): Promise<MemberDetailData | null> {
  if (!hasDatabaseUrl()) return null;

  try {
    const prisma = getPrisma();
    const memberRow = await prisma.member.findFirst({
      include: {
        cosponsoredBills: {
          include: {
            bill: true
          },
          orderBy: {
            joinedAt: "desc"
          },
          take: 12
        },
        memberVotes: {
          include: {
            vote: {
              include: {
                memberVotes: {
                  select: {
                    memberBioguideId: true,
                    position: true
                  }
                }
              }
            }
          },
          orderBy: {
            vote: {
              voteDate: "desc"
            }
          },
          take: 20
        },
        sponsoredBills: {
          orderBy: [{ latestActionDate: "desc" }, { updatedAt: "desc" }],
          take: 12
        }
      },
      where: {
        active: true,
        bioguideId
      }
    });

    if (!memberRow) return null;

    const chamberRows = await prisma.member.findMany({
      orderBy: [{ state: "asc" }, { lastName: "asc" }],
      take: 600,
      where: {
        active: true,
        chamber: memberRow.chamber
      }
    });

    return {
      chamberMembers: chamberRows.map(mapDatabaseMember),
      caucusMemberships: getMemberCaucusMemberships(memberRow.bioguideId),
      cosponsoredBills: memberRow.cosponsoredBills.map((cosponsor) => mapDatabaseBill(cosponsor.bill)),
      member: mapDatabaseMember(memberRow),
      memberVotes: selectMemberVoteRecords(
        [],
        memberRow.memberVotes.map((memberVote) => ({
          memberBioguideId: memberVote.memberBioguideId,
          position: dbVotePositionMap[memberVote.position],
          vote: mapDatabaseVote(memberVote.vote),
          voteId: memberVote.voteId
        })),
        20
      ),
      sponsoredBills: memberRow.sponsoredBills.map(mapDatabaseBill)
    };
  } catch {
    return null;
  }
}

function getFreshMemberLegislationCache(bioguideId: string) {
  const cached = memberLegislationCache.get(bioguideId);
  if (!cached) return null;
  if (Date.now() - cached.cachedAt > memberLegislationCacheMaxAgeMs) {
    memberLegislationCache.delete(bioguideId);
    return null;
  }
  return cached.records;
}

function getFreshMemberProfileCache(bioguideId: string) {
  const cached = memberProfileCache.get(bioguideId);
  if (!cached) return null;
  if (Date.now() - cached.cachedAt > memberLegislationCacheMaxAgeMs) {
    memberProfileCache.delete(bioguideId);
    return null;
  }
  return cached.member;
}

async function getLiveMemberProfile(bioguideId: string) {
  const cached = getFreshMemberProfileCache(bioguideId);
  if (cached) return cached;

  const response = await fetchMember(bioguideId, {
    timeoutMs: memberLegislationFetchTimeoutMs
  }).catch(() => null);
  const member = response?.member ? normalizeCongressMemberDetail(response.member) : null;
  if (!member) return null;

  memberProfileCache.set(bioguideId, {
    cachedAt: Date.now(),
    member
  });

  return member;
}

function mergeMemberLiveProfile(member: Member, liveMember: Member): Member {
  return {
    ...member,
    district: member.district ?? liveMember.district,
    firstElectedDate: liveMember.firstElectedDate ?? member.firstElectedDate,
    nextElectionDate: liveMember.nextElectionDate ?? member.nextElectionDate,
    officialUrl: member.officialUrl ?? liveMember.officialUrl,
    photoUrl: member.photoUrl ?? liveMember.photoUrl,
    sourceUrl: member.sourceUrl ?? liveMember.sourceUrl,
    termsInOffice: liveMember.termsInOffice ?? member.termsInOffice
  };
}

async function hydrateMemberDetailWithLiveProfile(detail: MemberDetailData): Promise<MemberDetailData> {
  const liveMember = await getLiveMemberProfile(detail.member.bioguideId);
  if (!liveMember) return detail;
  const member = mergeMemberLiveProfile(detail.member, liveMember);

  return {
    ...detail,
    chamberMembers: detail.chamberMembers.map((candidate) =>
      candidate.bioguideId === member.bioguideId ? mergeMemberLiveProfile(candidate, liveMember) : candidate
    ),
    member
  };
}

function orderMemberLegislationBills(records: Bill[]) {
  return [...records].sort((a, b) => Date.parse(b.latestActionDate) - Date.parse(a.latestActionDate));
}

function selectMemberLegislationBills(liveBills: Bill[], existingBills: Bill[]) {
  return orderMemberLegislationBills(mergeBillsByRecordKey(liveBills, existingBills)).slice(0, 12);
}

async function getLiveMemberLegislationData(bioguideId: string): Promise<Pick<MemberDetailData, "cosponsoredBills" | "sponsoredBills"> | null> {
  const cached = getFreshMemberLegislationCache(bioguideId);
  if (cached) return cached;

  const [sponsoredResult, cosponsoredResult] = await Promise.allSettled([
    fetchMemberSponsoredLegislation(bioguideId, { limit: 75, timeoutMs: memberLegislationFetchTimeoutMs }),
    fetchMemberCosponsoredLegislation(bioguideId, { limit: 75, timeoutMs: memberLegislationFetchTimeoutMs })
  ]);

  if (sponsoredResult.status === "rejected" && cosponsoredResult.status === "rejected") return null;

  const sponsoredBills =
    sponsoredResult.status === "fulfilled"
      ? selectMemberLegislationBills(
          (sponsoredResult.value.sponsoredLegislation ?? [])
            .map((record) => normalizeCongressMemberLegislation(record, bioguideId))
            .filter((bill): bill is Bill => Boolean(bill)),
          []
        )
      : [];
  const cosponsoredBills =
    cosponsoredResult.status === "fulfilled"
      ? selectMemberLegislationBills(
          (cosponsoredResult.value.cosponsoredLegislation ?? [])
            .map((record) => normalizeCongressMemberLegislation(record))
            .filter((bill): bill is Bill => Boolean(bill)),
          []
        )
      : [];
  const records = { cosponsoredBills, sponsoredBills };

  memberLegislationCache.set(bioguideId, {
    cachedAt: Date.now(),
    records
  });

  return records;
}

async function hydrateMemberDetailWithLiveLegislation(detail: MemberDetailData): Promise<MemberDetailData> {
  if (detail.sponsoredBills.length && detail.cosponsoredBills.length) return detail;

  const liveLegislation = await getLiveMemberLegislationData(detail.member.bioguideId);
  if (!liveLegislation) return detail;

  return {
    ...detail,
    cosponsoredBills: selectMemberLegislationBills(liveLegislation.cosponsoredBills, detail.cosponsoredBills),
    sponsoredBills: selectMemberLegislationBills(liveLegislation.sponsoredBills, detail.sponsoredBills)
  };
}

function orderMemberVoteRecords(records: MemberVoteRecord[]) {
  return [...records].sort((a, b) => {
    const dateDelta = Date.parse(b.vote?.voteDate ?? "0") - Date.parse(a.vote?.voteDate ?? "0");
    if (dateDelta) return dateDelta;
    return Number(b.vote?.rollCall ?? 0) - Number(a.vote?.rollCall ?? 0);
  });
}

function memberVoteRecordKey(record: MemberVoteRecord) {
  if (record.vote) {
    return `${record.vote.congress}:${record.vote.chamber}:${record.vote.rollCall}`;
  }

  return record.voteId;
}

function chooseMemberVoteRecord(current: MemberVoteRecord | undefined, candidate: MemberVoteRecord) {
  if (!current) return candidate;
  if (!current.vote && candidate.vote) return candidate;
  return candidate;
}

function selectMemberVoteRecords(liveRecords: MemberVoteRecord[], existingRecords: MemberVoteRecord[], limit = 20) {
  const recordsByKey = new Map<string, MemberVoteRecord>();

  [...liveRecords, ...existingRecords].forEach((record) => {
    const key = memberVoteRecordKey(record);
    recordsByKey.set(key, chooseMemberVoteRecord(recordsByKey.get(key), record));
  });

  return orderMemberVoteRecords(Array.from(recordsByKey.values())).slice(0, limit);
}

async function hydrateMemberDetailWithLiveHouseVotes(detail: MemberDetailData): Promise<MemberDetailData> {
  if (detail.member.chamber !== "House") return detail;

  const liveVotes = await fetchHouseMemberVotes(detail.member, 12, houseVotesFetchTimeoutMs);
  if (!liveVotes.length) return detail;

  return {
    ...detail,
    memberVotes: selectMemberVoteRecords(liveVotes, detail.memberVotes, 20)
  };
}

async function hydrateMemberDetailWithLiveSenateVotes(detail: MemberDetailData): Promise<MemberDetailData> {
  if (detail.member.chamber !== "Senate") return detail;

  const liveVotes = await fetchSenateMemberVotes(detail.member, 12, senateVotesFetchTimeoutMs);
  if (!liveVotes.length) return detail;

  return {
    ...detail,
    memberVotes: selectMemberVoteRecords(liveVotes, detail.memberVotes, 20)
  };
}

function hydrateMemberDetailWithLiveVotes(detail: MemberDetailData) {
  return detail.member.chamber === "House"
    ? hydrateMemberDetailWithLiveHouseVotes(detail)
    : hydrateMemberDetailWithLiveSenateVotes(detail);
}

export async function getMemberDetailWithLiveData(bioguideId: string): Promise<MemberDetailData | null> {
  const detail =
    (await withOptionalDatabaseReadTimeout(() => getDatabaseMemberDetailData(bioguideId))) ??
    getDemoMemberDetailData(bioguideId) ??
    (await getLiveMemberDetailData(bioguideId));
  if (!detail) return null;

  const [profile, legislation, votes] = await Promise.all([
    hydrateMemberDetailWithLiveProfile(detail),
    hydrateMemberDetailWithLiveLegislation(detail),
    hydrateMemberDetailWithLiveVotes(detail)
  ]);

  return {
    ...detail,
    chamberMembers: profile.chamberMembers,
    cosponsoredBills: legislation.cosponsoredBills,
    member: profile.member,
    memberVotes: votes.memberVotes,
    sponsoredBills: legislation.sponsoredBills
  };
}

async function getDatabaseActiveMembers(): Promise<Member[] | null> {
  if (!hasDatabaseUrl()) return null;

  try {
    const prisma = getPrisma();
    const memberRows = await prisma.member.findMany({
      orderBy: [{ state: "asc" }, { lastName: "asc" }],
      take: 600,
      where: {
        active: true
      }
    });

    return memberRows.map(mapDatabaseMember);
  } catch {
    return null;
  }
}

export async function getAllMembersWithLiveData() {
  const liveMembers = await withOptionalDatabaseReadTimeout(getDatabaseActiveMembers);

  if (!liveMembers) return members;

  return mergeMemberRosterWithFallback(liveMembers, members);
}

export function getBillVotes(billId: string) {
  return votes.filter((vote) => vote.billId === billId);
}

function sameBillKey(left: Pick<Bill, "billNumber" | "billType" | "congress">, right: Pick<Bill, "billNumber" | "billType" | "congress">) {
  return left.congress === right.congress && left.billType.toUpperCase() === right.billType.toUpperCase() && left.billNumber === right.billNumber;
}

function actionSortValue(action: BillAction) {
  const timestamp = Date.parse(action.occurredAt);
  if (Number.isFinite(timestamp)) return timestamp;
  const dateTimestamp = Date.parse(action.date);
  return Number.isFinite(dateTimestamp) ? dateTimestamp : 0;
}

function extractRollCall(action: string) {
  return action.match(/Roll\s+(?:no|No)\.?\s*(\d+)/i)?.[1];
}

function classifyDerivedAction(action: string): BillAction["kind"] {
  const value = action.toLowerCase();
  if (value.includes("introduced")) return "Introduced";
  if (value.includes("public law") || value.includes("signed by the president")) return "Enacted";
  if (value.includes("roll no") || value.includes("yeas and nays") || value.includes("recorded vote")) return "Vote";
  if (value.includes("received in the senate") || value.includes("received in the house")) return "Chamber Transfer";
  if (value.includes("committee") || value.includes("referred") || value.includes("reported")) return "Committee";
  if (value.includes("debate") || value.includes("considered") || value.includes("passed")) return "Floor";
  if (value.includes("motion") || value.includes("rule") || value.includes("postponed")) return "Procedural";
  return "Source Update";
}

function billAllActionsUrl(bill: Bill) {
  return `${bill.sourceUrl.replace(/\/$/, "")}/all-actions`;
}

function getDemoBillActionsForBill(bill: Bill) {
  const matchingDemoBill = bills.find((demoBill) => sameBillKey(demoBill, bill));
  if (!matchingDemoBill) return [];

  return billActions
    .filter((action) => action.billId === matchingDemoBill.id)
    .map((action) => ({
      ...action,
      billId: bill.id,
      id: action.id.replace(matchingDemoBill.id, bill.id)
    }));
}

function buildDerivedBillActions(bill: Bill, billVotes: Vote[]) {
  const actions: BillAction[] = [];

  if (bill.introducedDate) {
    actions.push({
      action: `Introduced as ${bill.displayNumber}.`,
      billId: bill.id,
      chamber: bill.billType.toUpperCase().startsWith("H") ? "House" : "Senate",
      date: bill.introducedDate,
      id: `${bill.id}-derived-introduced`,
      kind: "Introduced",
      occurredAt: bill.introducedDate,
      sourceLabel: "Congress.gov bill record",
      sourceSystem: "Congress.gov",
      sourceUrl: bill.sourceUrl,
      timePrecision: "date"
    });
  }

  billVotes.forEach((vote) => {
    actions.push({
      action: `${vote.question} ${vote.result ? `${vote.result}.` : ""}`.trim(),
      billId: bill.id,
      chamber: vote.chamber,
      date: vote.voteDate,
      id: `${bill.id}-derived-vote-${vote.chamber.toLowerCase()}-${vote.rollCall}`,
      kind: "Vote",
      linkedVoteId: vote.id,
      occurredAt: vote.voteDate,
      rollCall: vote.rollCall,
      sourceLabel: "Roll-call vote",
      sourceSystem: vote.chamber === "House" ? "Office of the Clerk" : "U.S. Senate",
      sourceUrl: vote.sourceUrl,
      timePrecision: "date"
    });
  });

  if (bill.latestActionText && bill.latestActionDate) {
    actions.push({
      action: bill.latestActionText,
      billId: bill.id,
      chamber: bill.latestActionText.toLowerCase().includes("senate") ? "Senate" : bill.latestActionText.toLowerCase().includes("house") ? "House" : undefined,
      date: bill.latestActionDate,
      id: `${bill.id}-derived-latest-action`,
      kind: classifyDerivedAction(bill.latestActionText),
      occurredAt: bill.latestActionDate,
      rollCall: extractRollCall(bill.latestActionText),
      sourceLabel: "Congress.gov latest action",
      sourceSystem: "Congress.gov",
      sourceUrl: billAllActionsUrl(bill),
      timePrecision: "date"
    });
  }

  return actions;
}

function hydrateBillActionVoteLinks(actions: BillAction[], billVotes: Vote[]) {
  return actions.map((action) => {
    if (action.linkedVoteId || !action.rollCall) return action;
    const vote = billVotes.find((candidate) => candidate.rollCall === action.rollCall && (!action.chamber || candidate.chamber === action.chamber));
    return vote
      ? {
          ...action,
          linkedVoteId: vote.id,
          sourceUrl: action.sourceUrl ?? vote.sourceUrl
        }
      : action;
  });
}

function dedupeBillActions(actions: BillAction[]) {
  return Array.from(
    new Map(
      actions.map((action) => [
        [action.date, action.time ?? "", action.chamber ?? "", action.action.toLowerCase()].join("|"),
        action
      ])
    ).values()
  );
}

function buildBillActionsForDetail(bill: Bill, billVotes: Vote[], officialActions: BillAction[] = []) {
  const demoActions = getDemoBillActionsForBill(bill);
  const derivedActions = buildDerivedBillActions(bill, billVotes);
  return hydrateBillActionVoteLinks(dedupeBillActions([...officialActions, ...demoActions, ...derivedActions]), billVotes).sort(
    (left, right) => actionSortValue(right) - actionSortValue(left)
  );
}

async function fetchOfficialBillActionsForBill(bill: Bill) {
  const actionsResponse = await fetchBillActions(bill.congress, bill.billType, bill.billNumber, {
    limit: 50,
    timeoutMs: memberLegislationFetchTimeoutMs
  }).catch(() => null);

  return (actionsResponse?.actions ?? [])
    .map((action, index) => normalizeCongressBillAction(action, bill, index))
    .filter((action): action is BillAction => Boolean(action));
}

export function getVoteMemberPositions(voteId: string) {
  return memberVotes
    .filter((memberVote) => memberVote.voteId === voteId)
    .map((memberVote) => ({
      ...memberVote,
      member: getMember(memberVote.memberBioguideId)
    }))
    .filter((record) => Boolean(record.member));
}

function getDemoVoteMemberPositionsByVoteId(billVotes: Vote[]) {
  return Object.fromEntries(
    billVotes.map((vote) => [vote.id, getVoteMemberPositions(vote.id) as VoteMemberPositionRecord[]])
  );
}

export function getBillSourceMatches(billId: string) {
  const bill = getBill(billId);
  if (!bill) return [];

  return matchBillSources({
    bill,
    sponsor: getBillSponsor(bill),
    videos: getBillVideos(billId),
    votes: getBillVotes(billId)
  });
}

function getDemoBillDetailData(billId: string): BillDetailData | null {
  const bill = getBill(billId);
  if (!bill) return null;

  const billVotes = getBillVotes(bill.id);

  return {
    bill,
    billActions: buildBillActionsForDetail(bill, billVotes),
    billVideos: getBillVideos(bill.id),
    billVotes,
    cosponsors: getBillCosponsors(bill.id),
    sourceMatches: getBillSourceMatches(bill.id),
    sponsor: getBillSponsor(bill),
    voteMemberPositionsByVoteId: getDemoVoteMemberPositionsByVoteId(billVotes)
  };
}

async function fetchLiveBillSponsor(bill: Bill, fallback?: Member) {
  if (fallback || !bill.sponsorBioguideId) return fallback;

  const response = await fetchMember(bill.sponsorBioguideId, {
    timeoutMs: memberLegislationFetchTimeoutMs
  }).catch(() => null);

  return response?.member ? (normalizeCongressMemberDetail(response.member) ?? fallback) : fallback;
}

async function fetchLiveBillCosponsors(bill: Bill, fallback: Member[]) {
  if (fallback.length) return fallback;

  const response = await fetchBillCosponsors(bill.congress, bill.billType, bill.billNumber, {
    limit: 100,
    timeoutMs: memberLegislationFetchTimeoutMs
  }).catch(() => null);
  const liveCosponsors = (response?.cosponsors ?? [])
    .map((cosponsor) => normalizeCongressBillCosponsor(cosponsor, bill))
    .filter((cosponsor): cosponsor is NonNullable<typeof cosponsor> => Boolean(cosponsor))
    .filter((cosponsor) => !cosponsor.withdrawnAt)
    .map((cosponsor) => cosponsor.member);

  return liveCosponsors.length ? liveCosponsors : fallback;
}

async function fetchLiveBillPeople(
  bill: Bill,
  {
    cosponsors,
    sponsor
  }: {
    cosponsors: Member[];
    sponsor?: Member;
  }
) {
  const [liveSponsor, liveCosponsors] = await Promise.all([
    fetchLiveBillSponsor(bill, sponsor),
    fetchLiveBillCosponsors(bill, cosponsors)
  ]);

  return {
    cosponsors: liveCosponsors,
    sponsor: liveSponsor
  };
}

function sourceLinkTargetType(value: string): SourceLinkTargetType {
  return value === "member" || value === "vote" || value === "committee" ? value : "bill";
}

function sourceMatchKindFromLink(sourceKind: string): BillSourceMatch["matchKind"] {
  const normalized = sourceKind.toLowerCase();
  if (normalized.includes("committee")) return "Committee Source";
  if (normalized.includes("vote")) return "Roll Call Vote";
  if (normalized.includes("member")) return "Sponsor Profile";
  if (normalized.includes("debate") || normalized.includes("record")) return "Congressional Record";
  if (normalized.includes("video")) return "Floor Video";
  return "Bill Record";
}

function mapSourceLinkToBillSourceMatch(
  bill: Bill,
  sourceLink: {
    id: string;
    label: string;
    source: string;
    sourceKind: string;
    targetId: string;
    targetType: string;
    url: string;
    verifiedAt?: Date | null;
  }
): BillSourceMatch {
  const verifiedAt = normalizeDateString(sourceLink.verifiedAt ?? null);

  return {
    billId: bill.id,
    confidence: sourceLink.source.toLowerCase().includes("api") ? "medium" : "high",
    id: sourceLink.id,
    label: sourceLink.label,
    matchKind: sourceMatchKindFromLink(sourceLink.sourceKind),
    matchedAt: verifiedAt,
    reason: `Synced from ${sourceLink.source} as ${sourceLink.sourceKind.toLowerCase()}.`,
    source: sourceLink.source,
    sourceKind: sourceLink.sourceKind,
    targetId: sourceLink.targetId,
    targetType: sourceLinkTargetType(sourceLink.targetType),
    url: sourceLink.url,
    verifiedAt
  };
}

async function getDatabaseBillDetailData(billId: string): Promise<BillDetailData | null> {
  if (!hasDatabaseUrl()) return null;

  try {
    const prisma = getPrisma();
    const parsedLiveId = parseStableLiveBillId(billId);
    const billWhere = [
      { id: billId },
      ...(parsedLiveId
        ? [
            {
              billNumber: parsedLiveId.billNumber,
              billType: parsedLiveId.billType,
              congress: parsedLiveId.congress
            }
          ]
        : [])
    ];
    const billRow = await prisma.bill.findFirst({
      include: {
        cosponsors: {
          include: {
            member: true
          },
          orderBy: {
            joinedAt: "desc"
          },
          take: 12
        },
        sponsor: true,
        votes: {
          include: {
            memberVotes: {
              include: {
                member: true
              },
              orderBy: {
                memberBioguideId: "asc"
              }
            }
          },
          orderBy: {
            voteDate: "desc"
          }
        }
      },
      where: {
        OR: billWhere
      }
    });

    if (!billRow) return null;

    const bill = mapDatabaseBill(billRow);
    const billVotes = billRow.votes.map(mapDatabaseVote);
    const sourceTargetIds = uniqueStrings([billRow.id, bill.id, stableLiveBillId(bill)]);
    const sourceLinks = await prisma.$queryRaw<DatabaseSourceLinkRow[]>`
        SELECT "id", "targetType", "targetId", "label", "url", "source", "sourceKind", "verifiedAt"
        FROM "OfficialSourceLink"
        WHERE "targetType" = 'bill'
          AND "targetId" IN (${Prisma.join(sourceTargetIds)})
        ORDER BY "updatedAt" DESC
        LIMIT 12
      `
      .catch(() => []);
    const fallbackSponsor = billRow.sponsor ? mapDatabaseMember(billRow.sponsor) : getBillSponsor(bill);
    const fallbackCosponsors = billRow.cosponsors.map((cosponsor) => mapDatabaseMember(cosponsor.member));
    const billVideos = getBillVideos(bill.id);
    const [officialActions, livePeople] = await Promise.all([
      fetchOfficialBillActionsForBill(bill),
      fetchLiveBillPeople(bill, {
        cosponsors: fallbackCosponsors.length ? fallbackCosponsors : getBillCosponsors(bill.id),
        sponsor: fallbackSponsor
      })
    ]);
    const { cosponsors, sponsor } = livePeople;
    const deterministicSourceMatches = matchBillSources({
      bill,
      sponsor,
      videos: billVideos,
      votes: billVotes
    });
    const sourceMatches = mergeBy(
      sourceLinks.map((sourceLink) => mapSourceLinkToBillSourceMatch(bill, sourceLink)),
      deterministicSourceMatches,
      (match) => match.id
    );

    return {
      bill,
      billActions: buildBillActionsForDetail(bill, billVotes, officialActions),
      billVideos,
      billVotes,
      cosponsors,
      sourceMatches,
      sponsor,
      voteMemberPositionsByVoteId: Object.fromEntries(
        billRow.votes.map((vote) => [
          vote.id,
          vote.memberVotes.map((memberVote) => ({
            member: mapDatabaseMember(memberVote.member),
            memberBioguideId: memberVote.memberBioguideId,
            position: dbVotePositionMap[memberVote.position],
            voteId: vote.id
          }))
        ])
      )
    };
  } catch {
    return null;
  }
}

async function getLiveBillDetailData(billId: string): Promise<BillDetailData | null> {
  const parsedLiveId = parseStableLiveBillId(billId);
  if (!parsedLiveId) return null;

  try {
    const response = await fetchBill(parsedLiveId.congress, parsedLiveId.billType, parsedLiveId.billNumber, {
      timeoutMs: memberLegislationFetchTimeoutMs
    });
    const bill = response.bill ? normalizeCongressBill(response.bill) : null;
    if (!bill) return null;

    const billVotes = getBillVotes(bill.id);
    const billVideos = getBillVideos(bill.id);
    const [officialActions, livePeople] = await Promise.all([
      fetchOfficialBillActionsForBill(bill),
      fetchLiveBillPeople(bill, {
        cosponsors: getBillCosponsors(bill.id),
        sponsor: getBillSponsor(bill)
      })
    ]);
    const { cosponsors, sponsor } = livePeople;

    return {
      bill,
      billActions: buildBillActionsForDetail(bill, billVotes, officialActions),
      billVideos,
      billVotes,
      cosponsors,
      sourceMatches: matchBillSources({
        bill,
        sponsor,
        videos: billVideos,
        votes: billVotes
      }),
      sponsor,
      voteMemberPositionsByVoteId: getDemoVoteMemberPositionsByVoteId(billVotes)
    };
  } catch {
    return null;
  }
}

export async function getBillDetailWithLiveData(billId: string): Promise<BillDetailData | null> {
  const demoDetail = getDemoBillDetailData(billId);

  if (billId.startsWith("demo-") && demoDetail) {
    return demoDetail;
  }

  return (await withOptionalDatabaseReadTimeout(() => getDatabaseBillDetailData(billId))) ?? (await getLiveBillDetailData(billId)) ?? demoDetail;
}

export function getBillStatus(bill: Bill) {
  return resolveBillStatus(bill);
}

type BillStatusFilter = "passed" | "in-committee" | "in-progress";

function normalizeBillStatusFilter(value?: string): BillStatusFilter | undefined {
  if (!value) return undefined;
  if (value === "passed" || value === "in-committee" || value === "in-progress") return value;
  return undefined;
}

function matchesBillStatusFilter(bill: Bill, filter?: BillStatusFilter) {
  if (!filter) return true;
  const status = getBillStatus(bill);
  if (filter === "passed") return status === "Passed" || status === "Enacted";
  if (filter === "in-committee") return status === "In Committee";
  return status === "In Progress" || status === "On Floor";
}

export function getVoteTotals(vote?: Vote) {
  if (!vote) {
    return {
      yes: 0,
      no: 0,
      present: 0,
      notVoting: 0
    };
  }

  const recordedVotes = memberVotes.filter((memberVote) => memberVote.voteId === vote.id);

  return {
    yes: vote.yesCount ?? recordedVotes.filter((record) => record.position === "Yes").length,
    no: vote.noCount ?? recordedVotes.filter((record) => record.position === "No").length,
    present: vote.presentCount ?? recordedVotes.filter((record) => record.position === "Present").length,
    notVoting: vote.notVotingCount ?? recordedVotes.filter((record) => record.position === "Not Voting").length
  };
}

function getVoteMemberBioguideIds(vote: Vote) {
  return uniqueStrings([
    ...(vote.memberBioguideIds ?? []),
    ...memberVotes.filter((memberVote) => memberVote.voteId === vote.id).map((memberVote) => memberVote.memberBioguideId)
  ]);
}

function dashboardVoteSourceKind(vote: Vote) {
  return vote.id.startsWith("demo-") ? "demo" : "live";
}

function buildDashboardData(sourceBills: Bill[], sourceVotes: Vote[]) {
  const dashboardBills = dedupeDashboardBills(sourceBills);
  const sortedBills = [...dashboardBills].sort((a, b) => Date.parse(b.latestActionDate) - Date.parse(a.latestActionDate));
  const sortedVotes = [...sourceVotes].sort((a, b) => Date.parse(b.voteDate) - Date.parse(a.voteDate));
  const billsById = new Map(sourceBills.map((bill) => [bill.id, bill]));
  const recentVote = sortedVotes[0];
  const recentVoteBill = recentVote?.billId ? billsById.get(recentVote.billId) : undefined;
  const voteFeed = sortedVotes.map((vote) => ({
    bill: vote.billId ? billsById.get(vote.billId) : undefined,
    memberBioguideIds: getVoteMemberBioguideIds(vote),
    sourceKind: dashboardVoteSourceKind(vote),
    totals: getVoteTotals(vote),
    vote
  }));
  const trackedBill = sortedBills.find((bill) => getBillStatus(bill) === "In Committee") ?? sortedBills[0];
  const statusCounts = dashboardBills.reduce(
    (counts, bill) => {
      const status = getBillStatus(bill);
      if (status === "Passed" || status === "Enacted") counts.passed += 1;
      else if (status === "In Committee") counts.inCommittee += 1;
      else counts.inProgress += 1;
      return counts;
    },
    { passed: 0, inCommittee: 0, inProgress: 0 }
  );

  return {
    billsInAction: dashboardBills.length,
    generatedAt: new Date().toISOString(),
    defaultUnreadAlertIds: [
      recentVoteBill || trackedBill ? systemVoteReminderAlertId : "",
      ...getRecentUpdates()
        .filter((event) => isDefaultUnreadAlertDate(event.occurredAt))
        .map((event) => event.id)
    ].filter(Boolean),
    updateCount: updateEvents.length,
    statusCounts,
    recentVote: recentVote
      ? {
          vote: recentVote,
          bill: recentVoteBill,
          totals: getVoteTotals(recentVote)
        }
      : undefined,
    voteFeed,
    favoriteTargets: {
      bills: dashboardBills.map((bill) => ({
        billNumber: bill.billNumber,
        billType: bill.billType,
        congress: bill.congress,
        displayNumber: bill.displayNumber,
        id: bill.id,
        latestActionDate: bill.latestActionDate,
        latestActionText: bill.latestActionText,
        policyArea: bill.policyArea,
        sourceUrl: bill.sourceUrl,
        shortTitle: bill.shortTitle,
        sponsorBioguideId: bill.sponsorBioguideId,
        summary: bill.summary,
        title: bill.title
      })),
      members: members.map((member) => ({
        bioguideId: member.bioguideId,
        chamber: member.chamber,
        district: member.district,
        fullName: member.fullName,
        party: member.party,
        state: member.state
      }))
    },
    trackedBill
  };
}

export function getDashboardData() {
  return buildDashboardData(bills, votes);
}

async function getDatabaseDashboardRecords() {
  if (!hasDatabaseUrl()) return null;

  try {
    const prisma = getPrisma();
    const [billRows, voteRows] = await Promise.all([
      prisma.bill.findMany({
        orderBy: [{ latestActionDate: "desc" }, { updatedAt: "desc" }]
      }),
      prisma.vote.findMany({
        include: {
          bill: true,
          memberVotes: {
            select: {
              memberBioguideId: true,
              position: true
            }
          }
        },
        orderBy: {
          voteDate: "desc"
        },
        take: 12
      })
    ]);

    const voteBills = voteRows
      .map((vote) => vote.bill)
      .filter((bill): bill is PrismaBill => Boolean(bill));

    return {
      bills: mergeBillsByRecordKey([...billRows, ...voteBills].map(mapDatabaseBill), bills),
      votes: mergeBy(voteRows.map(mapDatabaseVote), votes, (vote) => vote.id)
    };
  } catch {
    return null;
  }
}

export async function getDashboardDataWithLiveData() {
  const liveRecords = await withOptionalDatabaseReadTimeout(getDatabaseDashboardRecords, dashboardDatabaseReadTimeoutMs);

  if (liveRecords) {
    dashboardLiveRecordsCache = {
      cachedAt: Date.now(),
      records: liveRecords
    };
    return buildDashboardData(liveRecords.bills, liveRecords.votes);
  }

  if (dashboardLiveRecordsCache && Date.now() - dashboardLiveRecordsCache.cachedAt <= dashboardLiveRecordsCacheMaxAgeMs) {
    return buildDashboardData(dashboardLiveRecordsCache.records.bills, dashboardLiveRecordsCache.records.votes);
  }

  return getDashboardData();
}

export function getRecentUpdates() {
  return [...updateEvents].sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt));
}

function normalizeSearchStateFilters(value?: string | string[]) {
  const values = Array.isArray(value) ? value : value ? [value] : [];

  return Array.from(
    new Set(
      values
        .flatMap((item) => item.split(","))
        .map((item) => item.trim().toUpperCase())
        .filter((item) => /^[A-Z]{2}$/.test(item))
    )
  );
}

const maximumMemberSearchResults = 600;

export function searchRecords(filters: SearchFilters) {
  const q = filters.q?.trim() ?? "";
  const billSearchTerms = q ? getBillSearchTerms(q) : [];
  const statusFilter = normalizeBillStatusFilter(filters.status);
  const chamber = filters.chamber as Chamber | undefined;
  const party = normalizeSearchPartyFilter(filters.party);
  const states = normalizeSearchStateFilters(filters.state);
  const type = filters.type ?? "all";

  const memberResults =
    type === "all" || type === "members"
      ? members.filter((member) => {
          if (q && !matchesText([member.fullName, member.state, member.party, member.chamber], q)) return false;
          if (chamber && member.chamber !== chamber) return false;
          if (party && member.party !== party) return false;
          if (states.length && !states.includes(member.state)) return false;
          return true;
        })
      : [];

  const billResults =
    type === "all" || type === "bills"
      ? bills.filter((bill) => {
          if (q && !matchesAnyText(billSearchValues(bill), billSearchTerms)) {
            return false;
          }
          if (!matchesBillStatusFilter(bill, statusFilter)) return false;
          return true;
        })
      : [];

  const voteResults =
    type === "all" || type === "votes"
      ? votes.filter((vote) => {
          if (q && !matchesText([vote.question, vote.result, vote.chamber, vote.rollCall], q)) return false;
          if (chamber && vote.chamber !== chamber) return false;
          return true;
        })
      : [];

  return {
    members: memberResults,
    bills: billResults,
    votes: voteResults
  };
}

async function searchDatabaseRecords(filters: SearchFilters): Promise<DatabaseSearchRecordsResult | null> {
  if (!hasDatabaseUrl()) return null;

  try {
    const prisma = getPrisma();
    const q = filters.q?.trim();
    const billSearchTerms = q ? getBillSearchTerms(q) : [];
    const statusFilter = normalizeBillStatusFilter(filters.status);
    const chamber = filters.chamber && filters.chamber in filterChamberMap ? filterChamberMap[filters.chamber as Chamber] : undefined;
    const party = normalizeSearchPartyFilter(filters.party);
    const prismaParty = isOfficialSearchParty(party) ? filterPartyMap[party] : undefined;
    const states = normalizeSearchStateFilters(filters.state);
    const type = filters.type ?? "all";

    const shouldSearchMembers = type === "all" || type === "members";
    const [memberRows, billRows, voteRows, memberChamberCounts] = await Promise.all([
      shouldSearchMembers
        ? prisma.member.findMany({
            orderBy: [{ state: "asc" }, { lastName: "asc" }],
            take: maximumMemberSearchResults,
            where: {
              AND: [
                { active: true },
                q
                  ? {
                      OR: [
                        { fullName: { contains: q, mode: "insensitive" } },
                        { state: { contains: q, mode: "insensitive" } },
                        { district: { contains: q, mode: "insensitive" } }
                      ]
                    }
                  : {},
                chamber ? { chamber } : {},
                party ? (prismaParty ? { party: prismaParty } : { bioguideId: "__unsupported-party-filter__" }) : {},
                states.length ? { state: { in: states } } : {}
              ]
            }
          })
        : Promise.resolve([]),
      type === "all" || type === "bills"
        ? prisma.bill.findMany({
            orderBy: [{ latestActionDate: "desc" }, { updatedAt: "desc" }],
            take: 30,
            where: q
              ? {
                  OR: databaseBillSearchClauses(q, billSearchTerms)
                }
              : {}
          })
        : Promise.resolve([]),
      type === "all" || type === "votes"
        ? prisma.vote.findMany({
            include: {
              memberVotes: {
                select: {
                  memberBioguideId: true,
                  position: true
                }
              }
            },
            orderBy: {
              voteDate: "desc"
            },
            take: 30,
            where: {
              AND: [
                q
                  ? {
                      OR: [
                        { question: { contains: q, mode: "insensitive" } },
                        { result: { contains: q, mode: "insensitive" } },
                        { rollCall: { contains: q, mode: "insensitive" } }
                      ]
                    }
                  : {},
                chamber ? { chamber } : {}
              ]
            }
          })
        : Promise.resolve([]),
      shouldSearchMembers
        ? prisma.member.groupBy({
            _count: {
              _all: true
            },
            by: ["chamber"],
            where: {
              active: true
            }
          })
        : Promise.resolve([])
    ]);

    const mappedBills = billRows.map(mapDatabaseBill);
    const houseCount = memberChamberCounts.find((row) => row.chamber === PrismaChamber.HOUSE)?._count._all ?? 0;
    const senateCount = memberChamberCounts.find((row) => row.chamber === PrismaChamber.SENATE)?._count._all ?? 0;

    return {
      bills: statusFilter ? mappedBills.filter((bill) => matchesBillStatusFilter(bill, statusFilter)) : mappedBills,
      completeMemberRoster: hasCompleteMemberRosterCounts({
        houseCount,
        memberCount: houseCount + senateCount,
        senateCount
      }),
      members: memberRows.map(mapDatabaseMember),
      votes: voteRows.map(mapDatabaseVote)
    };
  } catch {
    return null;
  }
}

export async function searchRecordsWithLiveData(filters: SearchFilters) {
  const demoResults = searchRecords(filters);
  const liveResults = await withOptionalDatabaseReadTimeout(() => searchDatabaseRecords(filters));

  if (!liveResults) {
    return {
      mode: "demo" as const,
      results: demoResults
    };
  }

  return {
    mode: "live+demo" as const,
    results: {
      bills: mergeBillsByRecordKey(liveResults.bills, demoResults.bills),
      members: liveResults.completeMemberRoster
        ? liveResults.members
        : mergeMemberRosterWithFallback(liveResults.members, demoResults.members),
      votes: mergeBy(liveResults.votes, demoResults.votes, (vote) => vote.id)
    }
  };
}

export function getDemoStats() {
  return {
    memberCount: members.length,
    billCount: bills.length,
    voteCount: votes.length,
    updateCount: updateEvents.length
  };
}

export function getAllMembers(): Member[] {
  return members;
}

export function getAllBills(): Bill[] {
  return bills;
}
