import { bills, billVideos, cosponsors, members, memberVotes, updateEvents, votes } from "@/lib/demo-data";
import { isDefaultUnreadAlertDate, systemVoteReminderAlertId } from "@/lib/alert-rules";
import { CongressApiError, fetchBillSummaries } from "@/lib/congress/client";
import { issueSignals } from "@/lib/issue-signals";
import { memberServiceFallbacks } from "@/lib/member-service-history";
import { getBillStatus as resolveBillStatus } from "@/lib/bill-status";
import { getPrisma, hasDatabaseUrl } from "@/lib/prisma";
import { matchBillSources } from "@/lib/source-matching";
import { currentCongressLabel, estimateTermsInOfficeFromCongressLabel, federalElectionDateIso } from "@/lib/utils";
import type { Bill as PrismaBill, Member as PrismaMember, MemberVote as PrismaMemberVote, Vote as PrismaVote } from "@prisma/client";
import { Chamber as PrismaChamber, Party as PrismaParty, Prisma } from "@prisma/client";
import type { Bill, BillSourceMatch, BillVideo, Chamber, Member, Party, SourceLinkTargetType, Vote, VotePosition } from "@/types/capitol";

export type SearchFilters = {
  q?: string;
  status?: string;
  chamber?: string;
  party?: string;
  state?: string;
  type?: string;
};

export type BillSummaryResolution = {
  label: string;
  publishedAt?: string;
  source: "official" | "stored" | "pending";
  text: string;
};

export type SearchRecordsResult = ReturnType<typeof searchRecords>;

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
  "Official CRS summary not yet published by Congress.gov. Capitol Ledger will display the official summary first when it becomes available.";
const optionalDatabaseReadTimeoutMs = resolveOptionalDatabaseReadTimeoutMs();
const dashboardDatabaseReadTimeoutMs = resolveDashboardDatabaseReadTimeoutMs();
const dashboardLiveRecordsCacheMaxAgeMs = 10 * 60 * 1000;

type DashboardRecords = {
  bills: Bill[];
  votes: Vote[];
};

let dashboardLiveRecordsCache: { cachedAt: number; records: DashboardRecords } | null = null;

const memberCaucusMemberships: Record<string, MemberCaucusMembership[]> = {
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

function databaseBillSearchClauses(terms: string[]): Prisma.BillWhereInput[] {
  return terms.flatMap((term) => [
    { billNumber: { contains: term, mode: "insensitive" } },
    { billType: { contains: term, mode: "insensitive" } },
    { latestActionText: { contains: term, mode: "insensitive" } },
    { policyArea: { contains: term, mode: "insensitive" } },
    { shortTitle: { contains: term, mode: "insensitive" } },
    { summary: { contains: term, mode: "insensitive" } },
    { title: { contains: term, mode: "insensitive" } }
  ]);
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

function deriveTermsFromRaw(rawTerms: RawMemberTermRecord[], chamber: Chamber, fallbackTermLabel?: string) {
  const chamberTerms = rawTerms.filter((term) => {
    const rawChamber = normalizeRawChamber(term.chamber);
    return !rawChamber || rawChamber === chamber;
  });
  const workingTerms = chamberTerms.length ? chamberTerms : rawTerms;
  const starts = workingTerms.map((term) => term.startYear).filter((value): value is number => Number.isFinite(value));

  if (!starts.length) return estimateTermsInOfficeFromCongressLabel(fallbackTermLabel, chamber);

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

function deriveElectionDatesFromRaw(rawTerms: RawMemberTermRecord[], chamber: Chamber) {
  const chamberTerms = rawTerms.filter((term) => {
    const rawChamber = normalizeRawChamber(term.chamber);
    return !rawChamber || rawChamber === chamber;
  });
  const workingTerms = chamberTerms.length ? chamberTerms : rawTerms;
  const starts = workingTerms.map((term) => term.startYear).filter((value): value is number => Number.isFinite(value));
  if (!starts.length) return { firstElectedDate: undefined, nextElectionDate: undefined } as const;

  const firstStart = Math.min(...starts);
  const activeTerm =
    workingTerms.find((term) => !Number.isFinite(term.endYear) && Number.isFinite(term.startYear)) ??
    [...workingTerms]
      .filter((term): term is RawMemberTermRecord & { endYear: number; startYear: number } => Number.isFinite(term.endYear) && Number.isFinite(term.startYear))
      .sort((a, b) => b.startYear - a.startYear)[0];

  const termLength = chamber === "Senate" ? 6 : 2;
  const activeStart = Number.isFinite(activeTerm?.startYear) ? (activeTerm?.startYear as number) : firstStart;
  const activeEnd = Number.isFinite(activeTerm?.endYear) ? (activeTerm?.endYear as number) : activeStart + termLength;
  const firstElectionYear = firstStart % 2 === 0 ? firstStart : firstStart - 1;
  let nextElectionYear = activeEnd - 1;
  const currentYear = new Date().getUTCFullYear();

  while (nextElectionYear < currentYear - 1) {
    nextElectionYear += termLength;
  }

  return {
    firstElectedDate: federalElectionDateIso(firstElectionYear),
    nextElectionDate: federalElectionDateIso(nextElectionYear)
  } as const;
}

function mapDatabaseMember(member: PrismaMember): Member {
  const rawTerms = readRawMemberTerms(member.rawJson ?? null);
  const chamber = dbChamberMap[member.chamber];
  const termLabel = currentCongressLabel();
  const serviceFallback = memberServiceFallbacks[member.bioguideId];
  const rawService = readRawMemberService(member.rawJson ?? null);
  const termsInOffice = serviceFallback?.termsInOffice ?? rawService.termsInOffice ?? (rawTerms.length ? deriveTermsFromRaw(rawTerms, chamber, termLabel) : estimateTermsInOfficeFromCongressLabel(termLabel, chamber));
  const derivedElectionDates = deriveElectionDatesFromRaw(rawTerms, chamber);
  const firstElectedDate = serviceFallback?.firstElectedDate ?? rawService.firstElectedDate ?? derivedElectionDates.firstElectedDate;
  const nextElectionDate = serviceFallback?.nextElectionDate ?? rawService.nextElectionDate ?? derivedElectionDates.nextElectionDate;

  return {
    active: member.active,
    bioguideId: member.bioguideId,
    chamber,
    description: `${chamber} member from ${member.state} synced from Congress.gov.`,
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
    summary: bill.summary ?? "Live Congress.gov bill record synced into Capitol Ledger.",
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
    explanation: "Live roll-call vote synced from Congress.gov.",
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
    const data = await fetchBillSummaries(bill.congress, bill.billType, bill.billNumber, { limit: 5 });
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
  } catch (error) {
    if (!(error instanceof CongressApiError)) throw error;
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
    memberVotes: getMemberVotes(member.bioguideId) as MemberVoteRecord[],
    sponsoredBills: getSponsoredBills(member.bioguideId)
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
      memberVotes: memberRow.memberVotes.map((memberVote) => ({
        memberBioguideId: memberVote.memberBioguideId,
        position: dbVotePositionMap[memberVote.position],
        vote: mapDatabaseVote(memberVote.vote),
        voteId: memberVote.voteId
      })),
      sponsoredBills: memberRow.sponsoredBills.map(mapDatabaseBill)
    };
  } catch {
    return null;
  }
}

export async function getMemberDetailWithLiveData(bioguideId: string): Promise<MemberDetailData | null> {
  return (await withOptionalDatabaseReadTimeout(() => getDatabaseMemberDetailData(bioguideId))) ?? getDemoMemberDetailData(bioguideId);
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

  return mergeBy(liveMembers, members, (member) => member.bioguideId);
}

export function getBillVotes(billId: string) {
  return votes.filter((vote) => vote.billId === billId);
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
    billVideos: getBillVideos(bill.id),
    billVotes,
    cosponsors: getBillCosponsors(bill.id),
    sourceMatches: getBillSourceMatches(bill.id),
    sponsor: getBillSponsor(bill),
    voteMemberPositionsByVoteId: getDemoVoteMemberPositionsByVoteId(billVotes)
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
    const sponsor = billRow.sponsor ? mapDatabaseMember(billRow.sponsor) : getBillSponsor(bill);
    const liveCosponsors = billRow.cosponsors.map((cosponsor) => mapDatabaseMember(cosponsor.member));
    const billVideos = getBillVideos(bill.id);
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
      billVideos,
      billVotes,
      cosponsors: liveCosponsors.length ? liveCosponsors : getBillCosponsors(bill.id),
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

export async function getBillDetailWithLiveData(billId: string): Promise<BillDetailData | null> {
  const demoDetail = getDemoBillDetailData(billId);

  if (billId.startsWith("demo-") && demoDetail) {
    return demoDetail;
  }

  return (await withOptionalDatabaseReadTimeout(() => getDatabaseBillDetailData(billId))) ?? demoDetail;
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
  const sortedBills = [...sourceBills].sort((a, b) => Date.parse(b.latestActionDate) - Date.parse(a.latestActionDate));
  const sortedVotes = [...sourceVotes].sort((a, b) => Date.parse(b.voteDate) - Date.parse(a.voteDate));
  const recentVote = sortedVotes[0];
  const recentVoteBill = recentVote?.billId ? sourceBills.find((bill) => bill.id === recentVote.billId) : undefined;
  const voteFeed = sortedVotes.map((vote) => ({
    bill: vote.billId ? sourceBills.find((bill) => bill.id === vote.billId) : undefined,
    memberBioguideIds: getVoteMemberBioguideIds(vote),
    sourceKind: dashboardVoteSourceKind(vote),
    totals: getVoteTotals(vote),
    vote
  }));
  const trackedBill = sortedBills.find((bill) => getBillStatus(bill) === "In Committee") ?? sortedBills[0];
  const statusCounts = sourceBills.reduce(
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
    billsInAction: sourceBills.length,
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
      bills: sourceBills.map((bill) => ({
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
      bills: mergeBy([...billRows, ...voteBills].map(mapDatabaseBill), bills, (bill) => bill.id),
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

export function searchRecords(filters: SearchFilters) {
  const q = filters.q?.trim() ?? "";
  const billSearchTerms = q ? getIssueSearchTerms(q) : [];
  const statusFilter = normalizeBillStatusFilter(filters.status);
  const chamber = filters.chamber as Chamber | undefined;
  const party = filters.party as Party | undefined;
  const state = filters.state?.toUpperCase();
  const type = filters.type ?? "all";

  const memberResults =
    type === "all" || type === "members"
      ? members.filter((member) => {
          if (q && !matchesText([member.fullName, member.state, member.party, member.chamber], q)) return false;
          if (chamber && member.chamber !== chamber) return false;
          if (party && member.party !== party) return false;
          if (state && member.state !== state) return false;
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

async function searchDatabaseRecords(filters: SearchFilters): Promise<SearchRecordsResult | null> {
  if (!hasDatabaseUrl()) return null;

  try {
    const prisma = getPrisma();
    const q = filters.q?.trim();
    const billSearchTerms = q ? getIssueSearchTerms(q) : [];
    const statusFilter = normalizeBillStatusFilter(filters.status);
    const chamber = filters.chamber && filters.chamber in filterChamberMap ? filterChamberMap[filters.chamber as Chamber] : undefined;
    const party = filters.party && filters.party in filterPartyMap ? filterPartyMap[filters.party as Party] : undefined;
    const state = filters.state?.toUpperCase();
    const type = filters.type ?? "all";

    const [memberRows, billRows, voteRows] = await Promise.all([
      type === "all" || type === "members"
        ? prisma.member.findMany({
            orderBy: [{ state: "asc" }, { lastName: "asc" }],
            take: 30,
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
                party ? { party } : {},
                state ? { state } : {}
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
                  OR: databaseBillSearchClauses(billSearchTerms)
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
        : Promise.resolve([])
    ]);

    const mappedBills = billRows.map(mapDatabaseBill);

    return {
      bills: statusFilter ? mappedBills.filter((bill) => matchesBillStatusFilter(bill, statusFilter)) : mappedBills,
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
      bills: mergeBy(liveResults.bills, demoResults.bills, (bill) => bill.id),
      members: mergeBy(liveResults.members, demoResults.members, (member) => member.bioguideId),
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
