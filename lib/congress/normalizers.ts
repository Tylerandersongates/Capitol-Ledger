import type {
  CongressBillCosponsorItem,
  CongressBillListItem,
  CongressBillSummaryItem,
  CongressCommitteeListItem,
  CongressMemberDetailItem,
  CongressHouseVoteItem,
  CongressHouseVoteMemberItem,
  CongressMemberListItem
} from "./client";
import { currentCongressLabel, federalElectionDateIso } from "../utils";
import type { Bill, CapitolSourceLink, Chamber, CommitteeRecord, Member, Party, VotePosition } from "../../types/capitol";

const VERIFIED_AT = "2026-05-19";

const BILL_TYPE_SLUGS: Record<string, string> = {
  HR: "house-bill",
  HRES: "house-resolution",
  HJRES: "house-joint-resolution",
  HCONRES: "house-concurrent-resolution",
  S: "senate-bill",
  SRES: "senate-resolution",
  SJRES: "senate-joint-resolution",
  SCONRES: "senate-concurrent-resolution"
};

function normalizeDate(value?: string) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString().slice(0, 10);
}

function normalizeParty(value?: string): Party {
  const party = value?.toLowerCase() ?? "";
  if (party === "d" || party === "democratic") return "Democrat";
  if (party === "r") return "Republican";
  if (party === "i") return "Independent";
  if (party.includes("democrat")) return "Democrat";
  if (party.includes("republican")) return "Republican";
  if (party.includes("independent")) return "Independent";
  return "Independent";
}

function normalizeChamber(value?: string): Chamber | undefined {
  const chamber = value?.toLowerCase() ?? "";
  if (chamber.includes("house")) return "House";
  if (chamber.includes("senate")) return "Senate";
  return undefined;
}

function normalizeVotePosition(value?: string): VotePosition | undefined {
  const position = value?.toLowerCase().replace(/[_-]+/g, " ").trim() ?? "";
  if (!position) return undefined;
  if (position.includes("not") && position.includes("vot")) return "Not Voting";
  if (position === "nv") return "Not Voting";
  if (position.includes("present")) return "Present";
  if (position.includes("yea") || position.includes("aye") || position === "yes" || position === "y") return "Yes";
  if (position.includes("nay") || position === "no" || position === "n") return "No";
  return undefined;
}

function congressOrdinal(congress: number) {
  const mod100 = congress % 100;
  const suffix = mod100 >= 11 && mod100 <= 13 ? "th" : congress % 10 === 1 ? "st" : congress % 10 === 2 ? "nd" : congress % 10 === 3 ? "rd" : "th";
  return `${congress}${suffix}`;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function splitMemberName(name?: string) {
  const cleanName =
    name
      ?.replace(/\[[^\]]+\]/g, "")
      .replace(/\([^)]*\)/g, "")
      .replace(/^(rep\.|representative|sen\.|senator|mr\.|mrs\.|ms\.|miss|dr\.)\s+/i, "")
      .replace(/\s+/g, " ")
      .trim() ?? "";
  if (!cleanName) {
    return {
      firstName: "Unknown",
      lastName: "Member",
      displayName: "Unknown Member",
      slug: "unknown-member"
    };
  }

  if (cleanName.includes(",")) {
    const [lastName, rest] = cleanName.split(",", 2).map((part) => part.trim());
    const firstName = rest.trim() || "Unknown";
    const displayName = `${firstName} ${lastName}`.trim();
    return {
      firstName,
      lastName: lastName || "Member",
      displayName,
      slug: slugify(displayName)
    };
  }

  const parts = cleanName.split(" ");
  const lastName = parts.at(-1) ?? "Member";
  const firstName = parts.slice(0, -1).join(" ") || "Unknown";

  return {
    firstName,
    lastName,
    displayName: cleanName,
    slug: slugify(cleanName)
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

function normalizeBillType(value?: string) {
  const normalized = value?.toUpperCase().replace(/[^A-Z]/g, "") ?? "";
  if (normalized === "H" || normalized === "HOUSEBILL") return "HR";
  if (normalized === "HRES" || normalized === "HOUSERESOLUTION") return "HRES";
  if (normalized === "HJRES" || normalized === "HOUSEJOINTRESOLUTION") return "HJRES";
  if (normalized === "HCONRES" || normalized === "HOUSECONCURRENTRESOLUTION") return "HCONRES";
  if (normalized === "S" || normalized === "SENATEBILL") return "S";
  if (normalized === "SRES" || normalized === "SENATERESOLUTION") return "SRES";
  if (normalized === "SJRES" || normalized === "SENATEJOINTRESOLUTION") return "SJRES";
  if (normalized === "SCONRES" || normalized === "SENATECONCURRENTRESOLUTION") return "SCONRES";
  return normalized || undefined;
}

function normalizeStringNumber(value?: number | string) {
  if (value === undefined || value === null) return undefined;
  return String(value).trim() || undefined;
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

function billSourceUrl(congress: number, type: string, number: string) {
  const slug = BILL_TYPE_SLUGS[type.toUpperCase()] ?? slugify(type);
  return `https://www.congress.gov/bill/${congressOrdinal(congress)}-congress/${slug}/${number}`;
}

function chamberFromBillType(type: string): Chamber {
  return type.toUpperCase().startsWith("H") ? "House" : "Senate";
}

function memberSourceUrl(member: Pick<Member, "bioguideId" | "firstName" | "lastName">) {
  return `https://www.congress.gov/member/${slugify(`${member.firstName} ${member.lastName}`)}/${member.bioguideId}`;
}

function deriveMemberServiceFromTerms(
  terms: NonNullable<CongressMemberListItem["terms"]>["item"],
  chamber: Chamber
): Pick<Member, "firstElectedDate" | "nextElectionDate" | "termsInOffice"> {
  const rawTerms = terms ?? [];
  const chamberTerms = rawTerms.filter((term) => {
    const normalizedChamber = normalizeChamber(term.chamber);
    return !normalizedChamber || normalizedChamber === chamber;
  });
  const workingTerms = chamberTerms.length ? chamberTerms : rawTerms;
  const startYears = workingTerms.map((term) => term.startYear).filter((year): year is number => Number.isFinite(year));

  if (!startYears.length) return {};

  const termLength = chamber === "Senate" ? 6 : 2;
  const firstStart = Math.min(...startYears);
  const currentYear = new Date().getUTCFullYear();
  const latestEnd = Math.max(
    ...workingTerms.map((term) => (Number.isFinite(term.endYear) ? (term.endYear as number) : currentYear))
  );
  const servedYears = Math.max(1, latestEnd - firstStart + 1);
  const termsInOffice = Math.max(1, Math.ceil(servedYears / termLength));
  const activeTerm =
    workingTerms.find((term) => !Number.isFinite(term.endYear) && Number.isFinite(term.startYear)) ??
    [...workingTerms].filter((term) => Number.isFinite(term.startYear)).sort((a, b) => (b.startYear ?? 0) - (a.startYear ?? 0))[0];
  const activeStart = Number.isFinite(activeTerm?.startYear) ? (activeTerm?.startYear as number) : firstStart;
  const activeEnd = Number.isFinite(activeTerm?.endYear) ? (activeTerm?.endYear as number) : activeStart + termLength;
  const firstElectionYear = firstStart % 2 === 0 ? firstStart : firstStart - 1;

  return {
    firstElectedDate: federalElectionDateIso(firstElectionYear),
    nextElectionDate: federalElectionDateIso(activeEnd - 1),
    termsInOffice
  };
}

export function normalizeCongressMember(raw: CongressMemberListItem): Member | null {
  if (!raw.bioguideId) return null;

  const terms = raw.terms?.item ?? [];
  const activeTerm = terms.find((term) => !term.endYear) ?? terms.at(-1);
  const chamber = normalizeChamber(activeTerm?.chamber) ?? (raw.district ? "House" : "Senate");
  const service = deriveMemberServiceFromTerms(terms, chamber);
  const { displayName, firstName, lastName } = splitMemberName(raw.name);
  const prefix = chamber === "Senate" ? "Sen." : "Rep.";
  const state = raw.state ?? "US";

  return {
    bioguideId: raw.bioguideId,
    firstName,
    lastName,
    fullName: `${prefix} ${displayName}`,
    party: normalizeParty(raw.partyName),
    state,
    district: typeof raw.district === "number" ? String(raw.district) : undefined,
    chamber,
    active: Boolean(activeTerm && !activeTerm.endYear),
    term: currentCongressLabel(),
    termsInOffice: service.termsInOffice,
    firstElectedDate: service.firstElectedDate,
    nextElectionDate: service.nextElectionDate,
    photoUrl: raw.depiction?.imageUrl,
    officialUrl: undefined,
    sourceUrl: memberSourceUrl({ bioguideId: raw.bioguideId, firstName, lastName }),
    description: `${chamber} member from ${state} normalized from Congress.gov for Capitol Ledger live data.`
  };
}

export function normalizeCongressMemberDetail(raw: CongressMemberDetailItem): Member | null {
  if (!raw.bioguideId) return null;

  const terms = raw.terms ?? [];
  const activeTerm = terms.find((term) => !term.endYear) ?? terms.at(-1);
  const chamber = normalizeChamber(activeTerm?.chamber) ?? (activeTerm?.memberType?.toLowerCase().includes("senator") ? "Senate" : "House");
  const service = deriveMemberServiceFromTerms(
    terms.map((term) => ({
      chamber: term.chamber,
      endYear: term.endYear,
      startYear: term.startYear
    })),
    chamber
  );
  const nameParts = splitMemberName(raw.directOrderName ?? raw.invertedOrderName ?? [raw.firstName, raw.lastName].filter(Boolean).join(" "));
  const firstName = raw.firstName ?? nameParts.firstName;
  const lastName = raw.lastName ?? nameParts.lastName;
  const displayName = nameParts.displayName;
  const prefix = chamber === "Senate" ? "Sen." : "Rep.";
  const latestParty = [...(raw.partyHistory ?? [])]
    .filter((party) => party.partyName || party.partyAbbreviation)
    .sort((a, b) => (b.startYear ?? 0) - (a.startYear ?? 0))[0];
  const state = activeTerm?.stateCode ?? raw.state ?? "US";

  return {
    active: raw.currentMember ?? Boolean(activeTerm && !activeTerm.endYear),
    bioguideId: raw.bioguideId,
    chamber,
    description: `${chamber} member from ${state} normalized from Congress.gov member detail for Capitol Ledger live data.`,
    district: typeof activeTerm?.district === "number" ? String(activeTerm.district) : typeof raw.district === "number" ? String(raw.district) : undefined,
    firstElectedDate: service.firstElectedDate,
    firstName,
    fullName: `${prefix} ${displayName}`,
    lastName,
    nextElectionDate: service.nextElectionDate,
    officialUrl: raw.officialWebsiteUrl,
    party: normalizeParty(latestParty?.partyName ?? latestParty?.partyAbbreviation),
    photoUrl: raw.depiction?.imageUrl,
    sourceUrl: memberSourceUrl({ bioguideId: raw.bioguideId, firstName, lastName }),
    state,
    term: currentCongressLabel(),
    termsInOffice: service.termsInOffice
  };
}

export function normalizeCongressBill(raw: CongressBillListItem): Bill | null {
  if (!raw.congress || !raw.type || !raw.number || !raw.title) return null;

  const billType = raw.type.toUpperCase();
  const latestActionDate = normalizeDate(raw.latestAction?.actionDate) ?? normalizeDate(raw.updateDate) ?? "1970-01-01";
  const sponsorBioguideId = raw.sponsors?.find((sponsor) => sponsor.bioguideId)?.bioguideId;
  const sourceUrl = billSourceUrl(raw.congress, billType, raw.number);

  return {
    id: `live-${raw.congress}-${billType.toLowerCase()}-${raw.number}`,
    congress: raw.congress,
    billType,
    billNumber: raw.number,
    displayNumber: formatBillDisplay(billType, raw.number),
    title: raw.title,
    shortTitle: raw.title,
    sponsorBioguideId,
    policyArea: raw.policyArea?.name ?? "Legislation",
    introducedDate: normalizeDate(raw.introducedDate),
    committeeName: raw.committees?.count ? `${raw.committees.count} committee record${raw.committees.count === 1 ? "" : "s"}` : undefined,
    latestActionText: raw.latestAction?.text ?? "Latest action pending from Congress.gov.",
    latestActionDate,
    summary: raw.latestAction?.text ?? "Live Congress.gov bill record normalized for Capitol Ledger.",
    sourceUrl
  };
}

export function normalizeCongressCommittee(raw: CongressCommitteeListItem): CommitteeRecord | null {
  if (!raw.name && !raw.systemCode) return null;

  const chamber = normalizeChamber(raw.chamber);
  const id = raw.systemCode ?? slugify(`${raw.chamber ?? "committee"}-${raw.name ?? "record"}`);

  return {
    id,
    name: raw.name ?? id,
    chamber,
    systemCode: raw.systemCode,
    sourceUrl: raw.url,
    updatedAt: normalizeDate(raw.updateDate)
  };
}

export type NormalizedCongressBillSummary = {
  actionDate?: string;
  publishedAt?: string;
  text: string;
  versionCode?: string;
};

export function resolveCongressBillSummary(summaries: CongressBillSummaryItem[]): NormalizedCongressBillSummary | null {
  const officialSummary = summaries
    .filter((summary) => summary.text?.trim())
    .sort((a, b) => Date.parse(b.updateDate ?? b.actionDate ?? "0") - Date.parse(a.updateDate ?? a.actionDate ?? "0"))[0];

  if (!officialSummary?.text) return null;

  return {
    actionDate: normalizeDate(officialSummary.actionDate),
    publishedAt: normalizeDate(officialSummary.updateDate ?? officialSummary.actionDate),
    text: stripSummaryMarkup(officialSummary.text),
    versionCode: officialSummary.versionCode
  };
}

export type NormalizedCongressCosponsor = {
  bill: Pick<Bill, "billNumber" | "billType" | "congress">;
  member: Member;
  memberBioguideId: string;
  joinedAt?: string;
  withdrawnAt?: string;
};

export type NormalizedCongressVote = {
  bill?: Pick<Bill, "billNumber" | "billType" | "congress">;
  chamber: Chamber;
  congress: number;
  question: string;
  result?: string;
  rollCall: string;
  session?: string;
  sourceUrl?: string;
  voteDate: string;
};

export type NormalizedCongressMemberVote = {
  member: Member;
  memberBioguideId: string;
  position: VotePosition;
  vote: Pick<NormalizedCongressVote, "chamber" | "congress" | "rollCall">;
};

export function normalizeCongressBillCosponsor(raw: CongressBillCosponsorItem, bill: Bill): NormalizedCongressCosponsor | null {
  if (!raw.bioguideId) return null;

  const chamber = chamberFromBillType(bill.billType);
  const rawName = [raw.firstName, raw.middleName, raw.lastName].filter(Boolean).join(" ") || raw.fullName;
  const { displayName, firstName, lastName } = splitMemberName(rawName);
  const prefix = chamber === "Senate" ? "Sen." : "Rep.";
  const state = raw.state ?? "US";

  const member: Member = {
    active: true,
    bioguideId: raw.bioguideId,
    chamber,
    description: `${chamber} cosponsor from ${state} normalized from Congress.gov for ${bill.displayNumber}.`,
    district: typeof raw.district === "number" ? String(raw.district) : undefined,
    firstName,
    fullName: `${prefix} ${displayName}`,
    lastName,
    officialUrl: undefined,
    party: normalizeParty(raw.party),
    photoUrl: undefined,
    sourceUrl: raw.url ?? memberSourceUrl({ bioguideId: raw.bioguideId, firstName, lastName }),
    state,
    term: currentCongressLabel()
  };

  return {
    bill,
    joinedAt: normalizeDate(raw.sponsorshipDate),
    member,
    memberBioguideId: raw.bioguideId,
    withdrawnAt: normalizeDate(raw.withdrawnDate)
  };
}

export function normalizeCongressHouseVote(raw: CongressHouseVoteItem, fallbackCongress: number, fallbackSession: number): NormalizedCongressVote | null {
  const congress = Number(raw.congress ?? fallbackCongress);
  const rollCall = normalizeStringNumber(raw.rollCallNumber);
  const session = normalizeStringNumber(raw.sessionNumber ?? fallbackSession);
  const question = raw.voteQuestion ?? raw.question;
  const voteDate = normalizeDate(raw.startDate ?? raw.voteDate ?? raw.updateDate);

  if (!Number.isInteger(congress) || !rollCall || !question || !voteDate) return null;

  const billType = normalizeBillType(raw.legislationType);
  const billNumber = normalizeStringNumber(raw.legislationNumber);

  return {
    bill: billType && billNumber ? { billNumber, billType, congress } : undefined,
    chamber: "House",
    congress,
    question,
    result: raw.result,
    rollCall,
    session,
    sourceUrl: raw.sourceDataURL ?? raw.sourceUrl ?? raw.legislationUrl ?? raw.url,
    voteDate
  };
}

export function normalizeCongressHouseMemberVote(
  raw: CongressHouseVoteMemberItem,
  vote: NormalizedCongressVote
): NormalizedCongressMemberVote | null {
  const bioguideId = raw.bioguideId ?? raw.bioguideID;
  const position = normalizeVotePosition(raw.voteCast ?? raw.vote);
  if (!bioguideId || !position) return null;

  const rawName = raw.name ?? raw.memberName ?? [raw.firstName, raw.lastName].filter(Boolean).join(" ");
  const { displayName, firstName, lastName } = splitMemberName(rawName);
  const state = raw.state ?? "US";

  const member: Member = {
    active: true,
    bioguideId,
    chamber: "House",
    description: `House member from ${state} normalized from a Congress.gov roll-call vote record.`,
    district: normalizeStringNumber(raw.district),
    firstName,
    fullName: `Rep. ${displayName}`,
    lastName,
    officialUrl: undefined,
    party: normalizeParty(raw.party),
    photoUrl: undefined,
    sourceUrl: memberSourceUrl({ bioguideId, firstName, lastName }),
    state,
    term: currentCongressLabel()
  };

  return {
    member,
    memberBioguideId: bioguideId,
    position,
    vote
  };
}

export function buildMemberSourceLinks(member: Member): CapitolSourceLink[] {
  return [
    {
      id: `${member.bioguideId}-congress-profile`,
      targetType: "member",
      targetId: member.bioguideId,
      label: "Congress.gov member profile",
      url: member.sourceUrl,
      source: "Congress.gov",
      sourceKind: "Official member record",
      verifiedAt: VERIFIED_AT
    }
  ];
}

export function buildBillSourceLinks(bill: Bill, raw?: CongressBillListItem): CapitolSourceLink[] {
  const links: CapitolSourceLink[] = [
    {
      id: `${bill.id}-congress-bill`,
      targetType: "bill",
      targetId: bill.id,
      label: "Congress.gov bill record",
      url: bill.sourceUrl,
      source: "Congress.gov",
      sourceKind: "Official bill record",
      verifiedAt: VERIFIED_AT
    }
  ];

  if (raw?.committees?.url) {
    links.push({
      id: `${bill.id}-committee-records`,
      targetType: "bill",
      targetId: bill.id,
      label: "Committee records",
      url: raw.committees.url,
      source: "Congress.gov API",
      sourceKind: "Official committee reference",
      verifiedAt: VERIFIED_AT
    });
  }

  return links;
}

export function buildCommitteeSourceLinks(committee: CommitteeRecord): CapitolSourceLink[] {
  if (!committee.sourceUrl) return [];

  return [
    {
      id: `${committee.id}-committee-source`,
      targetType: "committee",
      targetId: committee.id,
      label: "Congress.gov committee record",
      url: committee.sourceUrl,
      source: "Congress.gov API",
      sourceKind: "Official committee record",
      verifiedAt: VERIFIED_AT
    }
  ];
}
