import type { Bill, BillSourceMatch, BillVideo, Member, Vote } from "../types/capitol";

const MATCHED_AT = "2026-05-19";

const billTypeSlugs: Record<string, string> = {
  HCONRES: "house-concurrent-resolution",
  HJRES: "house-joint-resolution",
  HR: "house-bill",
  HRES: "house-resolution",
  S: "senate-bill",
  SCONRES: "senate-concurrent-resolution",
  SJRES: "senate-joint-resolution",
  SRES: "senate-resolution"
};

const committeeSources = [
  {
    keywords: ["help", "health", "childcare", "child care"],
    label: "Senate HELP committee hearings",
    source: "U.S. Senate HELP Committee",
    url: "https://www.help.senate.gov/hearings"
  },
  {
    keywords: ["homeland", "border"],
    label: "Senate Homeland Security hearings",
    source: "U.S. Senate HSGAC",
    url: "https://www.hsgac.senate.gov/hearings/"
  },
  {
    keywords: ["commerce", "transportation", "ports", "arctic"],
    label: "Senate Commerce committee hearings",
    source: "U.S. Senate Commerce Committee",
    url: "https://www.commerce.senate.gov/hearings"
  },
  {
    keywords: ["oversight", "government operations", "transparency"],
    label: "House Oversight committee records",
    source: "U.S. House Oversight Committee",
    url: "https://oversight.house.gov/"
  },
  {
    keywords: ["house administration", "government operations", "voter", "election", "eligibility"],
    label: "House Administration committee records",
    source: "Committee on House Administration",
    url: "https://cha.house.gov/"
  },
  {
    keywords: ["natural resources", "public lands", "forest", "forests", "wildfire"],
    label: "House Natural Resources committee records",
    source: "House Natural Resources Committee",
    url: "https://naturalresources.house.gov/"
  },
  {
    keywords: ["agriculture", "forestry", "fireshed"],
    label: "Senate Agriculture committee hearings",
    source: "U.S. Senate Agriculture Committee",
    url: "https://www.agriculture.senate.gov/hearings"
  },
  {
    keywords: ["finance", "health", "hospital", "social welfare", "rural"],
    label: "Senate Finance committee hearings",
    source: "U.S. Senate Finance Committee",
    url: "https://www.finance.senate.gov/hearings"
  }
];

function congressOrdinal(congress: number) {
  const mod100 = congress % 100;
  const suffix = mod100 >= 11 && mod100 <= 13 ? "th" : congress % 10 === 1 ? "st" : congress % 10 === 2 ? "nd" : congress % 10 === 3 ? "rd" : "th";
  return `${congress}${suffix}`;
}

function buildCongressGovBillUrl(bill: Bill) {
  const typeSlug = billTypeSlugs[bill.billType.toUpperCase()] ?? bill.billType.toLowerCase();
  return `https://www.congress.gov/bill/${congressOrdinal(bill.congress)}-congress/${typeSlug}/${bill.billNumber}`;
}

function matchCommitteeSource(bill: Bill) {
  const haystack = [bill.committeeName, bill.policyArea, bill.title, bill.shortTitle].join(" ").toLowerCase();
  return committeeSources.find((source) => source.keywords.some((keyword) => haystack.includes(keyword)));
}

function uniqueMatches(matches: BillSourceMatch[]) {
  const seen = new Set<string>();
  return matches.filter((match) => {
    const key = `${match.matchKind}:${match.url}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function videoMatchKind(video: BillVideo): BillSourceMatch["matchKind"] {
  const sourceKind = video.sourceKind?.toLowerCase() ?? "";
  if (sourceKind.includes("committee")) return "Committee Source";
  if (sourceKind.includes("vote")) return "Roll Call Vote";
  return "Floor Video";
}

export function matchBillSources({
  bill,
  sponsor,
  videos,
  votes
}: {
  bill: Bill;
  sponsor?: Member;
  videos: BillVideo[];
  votes: Vote[];
}): BillSourceMatch[] {
  const matches: BillSourceMatch[] = [
    {
      id: `${bill.id}-congress-gov-bill`,
      billId: bill.id,
      confidence: "high",
      label: "Congress.gov bill record",
      matchKind: "Bill Record",
      matchedAt: MATCHED_AT,
      reason: `${bill.displayNumber} can be resolved from congress, bill type, and bill number.`,
      source: "Congress.gov",
      sourceKind: "Official bill record",
      targetId: bill.id,
      targetType: "bill",
      url: buildCongressGovBillUrl(bill),
      verifiedAt: MATCHED_AT
    },
    {
      id: `${bill.id}-congressional-record`,
      billId: bill.id,
      confidence: "medium",
      label: "Congressional Record search",
      matchKind: "Congressional Record",
      matchedAt: MATCHED_AT,
      reason: "Floor statements and debate references can be cross-checked in the official Congressional Record.",
      source: "Congress.gov",
      sourceKind: "Official debate record",
      targetId: bill.id,
      targetType: "bill",
      url: "https://www.congress.gov/congressional-record",
      verifiedAt: MATCHED_AT
    }
  ];

  const committeeSource = matchCommitteeSource(bill);
  if (committeeSource) {
    matches.push({
      id: `${bill.id}-committee-source`,
      billId: bill.id,
      confidence: "high",
      label: committeeSource.label,
      matchKind: "Committee Source",
      matchedAt: MATCHED_AT,
      reason: `Matched from ${bill.committeeName ?? bill.policyArea} and bill subject matter.`,
      source: committeeSource.source,
      sourceKind: "Official committee source",
      targetId: bill.id,
      targetType: "committee",
      url: committeeSource.url,
      verifiedAt: MATCHED_AT
    });
  }

  if (sponsor?.sourceUrl) {
    matches.push({
      id: `${bill.id}-${sponsor.bioguideId}-sponsor-profile`,
      billId: bill.id,
      confidence: "high",
      label: `${sponsor.fullName} profile`,
      matchKind: "Sponsor Profile",
      matchedAt: MATCHED_AT,
      reason: "Matched from the bill sponsor bioguide ID.",
      source: "Congress.gov",
      sourceKind: "Official member record",
      targetId: sponsor.bioguideId,
      targetType: "member",
      url: sponsor.sourceUrl,
      verifiedAt: MATCHED_AT
    });
  }

  votes.forEach((vote) => {
    matches.push({
      id: `${bill.id}-${vote.id}-roll-call`,
      billId: bill.id,
      confidence: "high",
      label: `${vote.chamber} roll call ${vote.rollCall}`,
      matchKind: "Roll Call Vote",
      matchedAt: MATCHED_AT,
      reason: `Matched from recorded vote ${vote.rollCall} linked to this bill.`,
      source: vote.chamber === "House" ? "Office of the Clerk" : "U.S. Senate",
      sourceKind: "Official vote record",
      targetId: vote.id,
      targetType: "vote",
      url: vote.sourceUrl,
      verifiedAt: MATCHED_AT
    });
  });

  videos.forEach((video) => {
    matches.push({
      id: `${bill.id}-${video.id}-source`,
      billId: bill.id,
      confidence: "high",
      label: video.title,
      matchKind: videoMatchKind(video),
      matchedAt: MATCHED_AT,
      reason: `Matched from linked ${video.type.toLowerCase()} source for this bill.`,
      source: video.source,
      sourceKind: video.sourceKind ?? "Official source",
      targetId: bill.id,
      targetType: "bill",
      url: video.videoUrl,
      verifiedAt: video.verifiedAt ?? MATCHED_AT
    });
  });

  return uniqueMatches(matches);
}
