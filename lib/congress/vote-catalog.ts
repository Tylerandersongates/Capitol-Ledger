import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { CongressHouseVoteItem, CongressHouseVotesResponse } from "@/lib/congress/client";
import type { NormalizedCongressMemberVote, NormalizedCongressVote } from "@/lib/congress/normalizers";
import type { Member, VotePosition } from "@/types/capitol";

type HouseVotePageFetcher = (session: number, offset: number, limit: number) => Promise<CongressHouseVotesResponse>;

type FetchHouseVoteCatalogOptions = {
  congress: number;
  fetchPage: HouseVotePageFetcher;
  maxPages?: number;
  pageSize?: number;
  sessions: number[];
};

export type HouseVoteCatalogResult = {
  expectedCounts: Record<string, number>;
  pageCount: number;
  rawRecordCount: number;
  rawVotes: CongressHouseVoteItem[];
};

export type VoteCatalogValidation = {
  chamberCounts: Record<string, number>;
  sessionCounts: Record<string, number>;
  voteCount: number;
};

export type ParsedVotePositionCatalog = {
  expectedPositionCount: number;
  noCount: number;
  notVotingCount: number;
  otherCount: number;
  positions: NormalizedCongressMemberVote[];
  presentCount: number;
  vote: NormalizedCongressVote;
  yesCount: number;
};

export type SenateMenuVote = {
  congress: number;
  rollCall: string;
  session: number;
  sourceUrl: string;
  voteNumberPadded: string;
};

export type SenateUnmappedPosition = {
  firstName: string;
  lastName: string;
  position: VotePosition;
  positionLabel?: string;
  state: string;
};

export type ParsedSenateVoteCatalog = Omit<ParsedVotePositionCatalog, "positions"> & {
  positions: SenateUnmappedPosition[];
};

const officialVoteHosts = ["api.congress.gov", "clerk.house.gov", "www.senate.gov", "senate.gov"];
const supportedBillTypes = new Set(["HCONRES", "HJRES", "HR", "HRES", "S", "SCONRES", "SJRES", "SRES"]);
const officialVoteXmlCacheDirectory =
  process.env.CONGRESS_SYNC_VOTE_CACHE_DIR?.trim() || path.join(tmpdir(), "capitolwonk-official-vote-cache");

function isVoteXml(value: string) {
  return value.trim().startsWith("<?xml") || /<(?:rollcall-vote|roll_call_vote|vote_summary)\b/i.test(value);
}

function officialVoteXmlCachePath(url: string) {
  return path.join(officialVoteXmlCacheDirectory, `${createHash("sha256").update(url).digest("hex")}.xml`);
}

function decodeXml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function normalizeWhitespace(value?: string) {
  return decodeXml(value ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tagValue(xml: string, tag: string) {
  const match = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i"));
  return match ? normalizeWhitespace(match[1]) : undefined;
}

function numericTagValue(xml: string, tag: string) {
  const value = Number(tagValue(xml, tag) ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function tagBlocks(xml: string, tag: string) {
  return Array.from(xml.matchAll(new RegExp(`<${tag}(?:\\s[^>]*)?>[\\s\\S]*?</${tag}>`, "gi"))).map((match) => match[0]);
}

function attributeValue(xml: string, attribute: string) {
  const match = xml.match(new RegExp(`\\s${attribute}=(?:\"([^\"]*)\"|'([^']*)')`, "i"));
  return normalizeWhitespace(match?.[1] ?? match?.[2]);
}

function paginationOffset(value?: string) {
  if (!value) return undefined;
  try {
    const offset = Number(new URL(value).searchParams.get("offset"));
    return Number.isInteger(offset) && offset >= 0 ? offset : undefined;
  } catch {
    return undefined;
  }
}

function rawHouseVoteKey(vote: CongressHouseVoteItem, fallbackCongress: number, fallbackSession: number) {
  const congress = Number(vote.congress ?? fallbackCongress);
  const session = Number(vote.sessionNumber ?? fallbackSession);
  const rollCall = String(vote.rollCallNumber ?? "").trim();
  if (!Number.isInteger(congress) || !Number.isInteger(session) || !rollCall) return "";
  return `${congress}:House:${session}:${rollCall}`;
}

export function voteCatalogKey(vote: Pick<NormalizedCongressVote, "chamber" | "congress" | "rollCall" | "session">) {
  return `${vote.congress}:${vote.chamber}:${vote.session}:${vote.rollCall}`;
}

export function voteMemberKey(member: Pick<Member, "lastName" | "state">) {
  const lastName = normalizeWhitespace(member.lastName)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
  return `${lastName}:${member.state.toUpperCase()}`;
}

export function senatePositionMemberKey(position: Pick<SenateUnmappedPosition, "lastName" | "state">) {
  return voteMemberKey(position);
}

export function houseClerkVoteXmlUrl(vote: Pick<NormalizedCongressVote, "rollCall" | "voteDate">) {
  const year = new Date(vote.voteDate).getUTCFullYear();
  return `https://clerk.house.gov/evs/${year}/roll${vote.rollCall.padStart(3, "0")}.xml`;
}

export function houseClerkVotePageUrl(vote: Pick<NormalizedCongressVote, "rollCall" | "voteDate">) {
  const year = new Date(vote.voteDate).getUTCFullYear();
  return `https://clerk.house.gov/Votes/${year}${vote.rollCall.padStart(3, "0")}`;
}

export async function fetchPaginatedHouseVoteCatalog({
  congress,
  fetchPage,
  maxPages = 10,
  pageSize = 250,
  sessions
}: FetchHouseVoteCatalogOptions): Promise<HouseVoteCatalogResult> {
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 250) {
    throw new Error("House vote catalog page size must be an integer from 1 to 250.");
  }
  if (!Number.isInteger(maxPages) || maxPages < 1 || maxPages > 25) {
    throw new Error("House vote catalog max pages must be an integer from 1 to 25.");
  }

  const uniqueSessions = Array.from(new Set(sessions));
  if (!uniqueSessions.length || uniqueSessions.some((session) => session !== 1 && session !== 2)) {
    throw new Error("House vote catalog sessions must contain session 1, session 2, or both.");
  }

  const rawVotesByKey = new Map<string, CongressHouseVoteItem>();
  const expectedCounts: Record<string, number> = {};
  let pageCount = 0;
  let rawRecordCount = 0;

  for (const session of uniqueSessions) {
    const visitedOffsets = new Set<number>();
    let offset = 0;
    let expectedCount: number | undefined;
    let sessionComplete = false;

    for (let pageIndex = 0; pageIndex < maxPages; pageIndex += 1) {
      if (visitedOffsets.has(offset)) {
        throw new Error(`Congress.gov House vote pagination repeated session ${session} offset ${offset}.`);
      }
      visitedOffsets.add(offset);

      const response = await fetchPage(session, offset, pageSize);
      const pageVotes = response.houseRollCallVotes ?? [];
      const advertisedCount = response.pagination?.count;
      pageCount += 1;
      rawRecordCount += pageVotes.length;

      if (advertisedCount !== undefined && Number.isInteger(advertisedCount) && advertisedCount >= 0) {
        if (expectedCount !== undefined && expectedCount !== advertisedCount) {
          throw new Error(`Congress.gov House vote count changed during session ${session} pagination.`);
        }
        expectedCount = advertisedCount;
      }

      pageVotes.forEach((vote) => {
        const key = rawHouseVoteKey(vote, congress, session);
        if (key) rawVotesByKey.set(key, vote);
      });

      const nextOffset = paginationOffset(response.pagination?.next);
      if (nextOffset !== undefined) {
        if (nextOffset <= offset) {
          throw new Error(`Congress.gov House vote pagination returned a non-advancing session ${session} offset.`);
        }
        offset = nextOffset;
        continue;
      }

      const sessionRecordCount = Array.from(rawVotesByKey.keys()).filter((key) => key.startsWith(`${congress}:House:${session}:`)).length;
      if (!pageVotes.length || pageVotes.length < pageSize || (expectedCount !== undefined && sessionRecordCount >= expectedCount)) {
        if (expectedCount !== undefined && sessionRecordCount !== expectedCount) {
          throw new Error(`House session ${session} ended with ${sessionRecordCount} unique votes instead of ${expectedCount}.`);
        }
        expectedCounts[String(session)] = expectedCount ?? sessionRecordCount;
        sessionComplete = true;
        break;
      }

      offset += pageSize;
    }

    if (!sessionComplete) {
      throw new Error(`Congress.gov House vote session ${session} exceeded the ${maxPages}-page safety limit.`);
    }
  }

  return {
    expectedCounts,
    pageCount,
    rawRecordCount,
    rawVotes: Array.from(rawVotesByKey.values())
  };
}

function isOfficialVoteUrl(value?: string) {
  if (!value) return false;
  try {
    return officialVoteHosts.includes(new URL(value).hostname.toLowerCase());
  } catch {
    return false;
  }
}

export function validateVoteCatalog(
  votes: NormalizedCongressVote[],
  {
    congress,
    expectedCounts,
    minimumVoteCount = 1
  }: {
    congress: number;
    expectedCounts?: Record<string, number>;
    minimumVoteCount?: number;
  }
): VoteCatalogValidation {
  const uniqueVotes = new Map(votes.map((vote) => [voteCatalogKey(vote), vote]));
  if (uniqueVotes.size !== votes.length) {
    throw new Error(`Vote catalog contains ${votes.length - uniqueVotes.size} duplicate vote identity record(s).`);
  }
  if (votes.length < minimumVoteCount) {
    throw new Error(`Vote catalog contains only ${votes.length} records; expected at least ${minimumVoteCount}.`);
  }

  const invalidVotes = votes.filter(
    (vote) =>
      vote.congress !== congress ||
      !vote.session ||
      !vote.rollCall ||
      !vote.question.trim() ||
      !Number.isFinite(Date.parse(vote.voteDate)) ||
      !isOfficialVoteUrl(vote.sourceUrl)
  );
  if (invalidVotes.length) {
    const reasons = {
      invalidDate: invalidVotes.filter((vote) => !Number.isFinite(Date.parse(vote.voteDate))).length,
      invalidSource: invalidVotes.filter((vote) => !isOfficialVoteUrl(vote.sourceUrl)).length,
      missingQuestion: invalidVotes.filter((vote) => !vote.question.trim()).length,
      missingRollCall: invalidVotes.filter((vote) => !vote.rollCall).length,
      missingSession: invalidVotes.filter((vote) => !vote.session).length,
      wrongCongress: invalidVotes.filter((vote) => vote.congress !== congress).length
    };
    throw new Error(
      `Vote catalog contains ${invalidVotes.length} record(s) missing required official data (${Object.entries(reasons)
        .filter(([, count]) => count)
        .map(([reason, count]) => `${reason}: ${count}`)
        .join(", ")}).`
    );
  }

  const sessionCounts = votes.reduce<Record<string, number>>((counts, vote) => {
    const key = `${vote.chamber}:${vote.session}`;
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
  const chamberCounts = votes.reduce<Record<string, number>>((counts, vote) => {
    counts[vote.chamber] = (counts[vote.chamber] ?? 0) + 1;
    return counts;
  }, {});

  Object.entries(expectedCounts ?? {}).forEach(([key, expected]) => {
    if ((sessionCounts[key] ?? 0) !== expected) {
      throw new Error(`Vote catalog session ${key} contains ${sessionCounts[key] ?? 0} records instead of ${expected}.`);
    }
  });

  return {
    chamberCounts,
    sessionCounts,
    voteCount: votes.length
  };
}

function normalizeVotePosition(value?: string): VotePosition | undefined {
  const position = value?.toLowerCase().replace(/[_-]+/g, " ").trim() ?? "";
  if (!position) return undefined;
  if (position.includes("not") && position.includes("vot")) return "Not Voting";
  if (position.includes("present")) return "Present";
  if (position.includes("yea") || position.includes("aye") || position === "yes" || position === "y") return "Yes";
  if (position.includes("nay") || position === "no" || position === "n") return "No";
  return undefined;
}

function validatePositionTotals(
  vote: NormalizedCongressVote,
  positions: Array<{ position: VotePosition }>,
  totals: { noCount: number; notVotingCount: number; otherCount: number; presentCount: number; yesCount: number }
) {
  const expectedPositionCount = totals.yesCount + totals.noCount + totals.presentCount + totals.notVotingCount + totals.otherCount;
  if (positions.length !== expectedPositionCount) {
    throw new Error(
      `${vote.chamber} session ${vote.session} roll call ${vote.rollCall} has ${positions.length} positions but official totals sum to ${expectedPositionCount}.`
    );
  }
  return expectedPositionCount;
}

export function parseHouseClerkVoteXml(xml: string, catalogVote: NormalizedCongressVote): ParsedVotePositionCatalog {
  const metadata = tagBlocks(xml, "vote-metadata")[0] ?? xml;
  const xmlCongress = Number(tagValue(metadata, "congress"));
  const xmlSession = Number(tagValue(metadata, "session")?.match(/\d+/)?.[0]);
  const xmlRollCall = String(Number(tagValue(metadata, "rollcall-num")));
  if (
    (Number.isInteger(xmlCongress) && xmlCongress !== catalogVote.congress) ||
    (Number.isInteger(xmlSession) && String(xmlSession) !== catalogVote.session) ||
    (xmlRollCall !== "NaN" && xmlRollCall !== catalogVote.rollCall)
  ) {
    throw new Error(`House vote detail does not match catalog identity ${voteCatalogKey(catalogVote)}.`);
  }
  const voteQuestion = tagValue(metadata, "vote-question");
  const voteDescription = tagValue(metadata, "vote-desc");
  const question =
    voteQuestion && voteDescription
      ? `${voteQuestion}: ${voteDescription}`
      : voteDescription || voteQuestion || catalogVote.question;
  const vote: NormalizedCongressVote = {
    ...catalogVote,
    question,
    result: tagValue(metadata, "vote-result") || catalogVote.result,
    sourceUrl: houseClerkVotePageUrl(catalogVote)
  };
  const totalsBlock = tagBlocks(metadata, "totals-by-vote")[0] ?? metadata;
  const candidateTotals = tagBlocks(metadata, "totals-by-candidate").reduce(
    (counts, block) => {
      const label = tagValue(block, "candidate") ?? "";
      const count = numericTagValue(block, "candidate-total");
      if (/present/i.test(label)) counts.presentCount += count;
      else if (/not\s+voting/i.test(label)) counts.notVotingCount += count;
      else counts.otherCount += count;
      return counts;
    },
    { notVotingCount: 0, otherCount: 0, presentCount: 0 }
  );
  const totals = {
    noCount: numericTagValue(totalsBlock, "nay-total"),
    notVotingCount: numericTagValue(totalsBlock, "not-voting-total") || candidateTotals.notVotingCount,
    otherCount: candidateTotals.otherCount,
    presentCount: numericTagValue(totalsBlock, "present-total") || candidateTotals.presentCount,
    yesCount: numericTagValue(totalsBlock, "yea-total")
  };
  const positions = tagBlocks(xml, "recorded-vote").flatMap<NormalizedCongressMemberVote>((block) => {
    const legislator = tagBlocks(block, "legislator")[0] ?? "";
    const memberBioguideId = attributeValue(legislator, "name-id");
    const positionLabel = tagValue(block, "vote");
    const position = normalizeVotePosition(positionLabel) ?? (positionLabel ? "Other" : undefined);
    if (!memberBioguideId || !position) return [];

    return [
      {
        memberBioguideId,
        position,
        positionLabel: position === "Other" ? positionLabel : undefined,
        vote: {
          chamber: catalogVote.chamber,
          congress: catalogVote.congress,
          rollCall: catalogVote.rollCall,
          session: catalogVote.session
        }
      }
    ];
  });
  const uniqueMemberIds = new Set(positions.map((position) => position.memberBioguideId));
  if (uniqueMemberIds.size !== positions.length) {
    throw new Error(`House session ${catalogVote.session} roll call ${catalogVote.rollCall} contains duplicate member positions.`);
  }

  return {
    expectedPositionCount: validatePositionTotals(vote, positions, totals),
    positions,
    vote,
    ...totals
  };
}

function normalizeSenateVoteDate(value?: string) {
  const parsed = Date.parse(value?.replace(/\s+/g, " ") ?? "");
  return Number.isFinite(parsed) ? new Date(parsed).toISOString().slice(0, 10) : "";
}

function normalizeBillType(value?: string) {
  const normalized = value?.toUpperCase().replace(/[^A-Z]/g, "") ?? "";
  return supportedBillTypes.has(normalized) ? normalized : undefined;
}

export function senateVoteMenuUrl(congress: number, session: number) {
  return `https://www.senate.gov/legislative/LIS/roll_call_lists/vote_menu_${congress}_${session}.xml`;
}

export function senateVoteSourceUrl(congress: number, session: number, voteNumberPadded: string) {
  return `https://www.senate.gov/legislative/LIS/roll_call_votes/vote${congress}${session}/vote_${congress}_${session}_${voteNumberPadded}.xml`;
}

export function parseSenateVoteMenu(xml: string): SenateMenuVote[] {
  const congress = Number(tagValue(xml, "congress"));
  const session = Number(tagValue(xml, "session"));
  if (!Number.isInteger(congress) || !Number.isInteger(session)) {
    throw new Error("Senate vote menu is missing a valid congress or session.");
  }

  const votes = tagBlocks(xml, "vote")
    .map<SenateMenuVote | null>((block) => {
      const voteNumber = tagValue(block, "vote_number");
      if (!voteNumber) return null;
      const voteNumberPadded = voteNumber.padStart(5, "0");
      const rollCall = String(Number(voteNumber));
      if (!rollCall || rollCall === "NaN") return null;

      return {
        congress,
        rollCall,
        session,
        sourceUrl: senateVoteSourceUrl(congress, session, voteNumberPadded),
        voteNumberPadded
      };
    })
    .filter((vote): vote is SenateMenuVote => Boolean(vote));
  const uniqueVotes = new Map(votes.map((vote) => [`${vote.congress}:${vote.session}:${vote.rollCall}`, vote]));
  if (uniqueVotes.size !== votes.length) {
    throw new Error(`Senate session ${session} vote menu contains duplicate roll calls.`);
  }
  return Array.from(uniqueVotes.values());
}

export function parseSenateVoteXml(xml: string, menuVote: SenateMenuVote): ParsedSenateVoteCatalog {
  const congress = Number(tagValue(xml, "congress"));
  const session = Number(tagValue(xml, "session"));
  const rollCall = String(Number(tagValue(xml, "vote_number")));
  const billType = normalizeBillType(tagValue(xml, "document_type"));
  const billNumber = tagValue(xml, "document_number")?.match(/\d+/)?.[0];
  const vote: NormalizedCongressVote = {
    bill: billType && billNumber ? { billNumber, billType, congress } : undefined,
    chamber: "Senate",
    congress,
    question: tagValue(xml, "vote_title") ?? tagValue(xml, "vote_question_text") ?? tagValue(xml, "question") ?? "",
    result: tagValue(xml, "vote_result") ?? tagValue(xml, "vote_result_text"),
    rollCall,
    session: String(session),
    sourceUrl: menuVote.sourceUrl,
    voteDate: normalizeSenateVoteDate(tagValue(xml, "vote_date"))
  };

  if (
    congress !== menuVote.congress ||
    session !== menuVote.session ||
    rollCall !== menuVote.rollCall ||
    !vote.question ||
    !vote.voteDate
  ) {
    throw new Error(`Senate vote detail does not match menu identity ${menuVote.congress}:${menuVote.session}:${menuVote.rollCall}.`);
  }

  const totals = {
    noCount: numericTagValue(xml, "nays"),
    notVotingCount: numericTagValue(xml, "absent"),
    otherCount: 0,
    presentCount: numericTagValue(xml, "present"),
    yesCount: numericTagValue(xml, "yeas")
  };
  const positions = tagBlocks(xml, "member").flatMap<SenateUnmappedPosition>((block) => {
    const firstName = tagValue(block, "first_name") ?? "";
    const lastName = tagValue(block, "last_name") ?? "";
    const state = tagValue(block, "state")?.toUpperCase() ?? "";
    const positionLabel = tagValue(block, "vote_cast");
    const position = normalizeVotePosition(positionLabel) ?? (positionLabel ? "Other" : undefined);
    if (!lastName || !state || !position) return [];
    return [{ firstName, lastName, position, positionLabel: position === "Other" ? positionLabel : undefined, state }];
  });
  const uniqueMembers = new Set(positions.map(senatePositionMemberKey));
  if (uniqueMembers.size !== positions.length) {
    throw new Error(`Senate session ${vote.session} roll call ${vote.rollCall} contains duplicate member positions.`);
  }

  return {
    expectedPositionCount: validatePositionTotals(vote, positions, totals),
    positions,
    vote,
    ...totals
  };
}

export async function fetchOfficialVoteXml(url: string, timeoutMs = 20_000) {
  const cachePath = officialVoteXmlCachePath(url);
  const cachedXml = await readFile(cachePath, "utf8").catch(() => "");
  if (cachedXml && isVoteXml(cachedXml)) return cachedXml;

  const headers: HeadersInit[] = [
    {
      Accept: "application/xml,text/xml,*/*",
      "Accept-Language": "en-US,en;q=0.9",
      "User-Agent": "CapitolWonk civic data reader"
    },
    {
      Accept: "application/xml,text/xml,*/*"
    }
  ];

  const attempts = 6;
  let lastStatus: number | undefined;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const requestHeaders = headers[attempt % headers.length];
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        cache: "no-store",
        headers: requestHeaders,
        signal: controller.signal
      });
      lastStatus = response.status;
      if (response.ok) {
        const xml = await response.text();
        if (isVoteXml(xml)) {
          await mkdir(officialVoteXmlCacheDirectory, { recursive: true });
          await writeFile(cachePath, xml, "utf8");
          return xml;
        }
      }
    } catch {
      // Try the next official-request header set.
    } finally {
      clearTimeout(timeout);
    }
    if (attempt < attempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, Math.min(3_000, 500 * 2 ** attempt)));
    }
  }

  const hostname = (() => {
    try {
      return new URL(url).hostname;
    } catch {
      return "official source";
    }
  })();
  throw new Error(`Official vote XML request failed for ${hostname}${lastStatus ? ` (status ${lastStatus})` : ""}.`);
}

export async function mapWithConcurrency<T, R>(
  values: T[],
  concurrency: number,
  worker: (value: T, index: number) => Promise<R>
): Promise<R[]> {
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 20) {
    throw new Error("Vote fetch concurrency must be an integer from 1 to 20.");
  }

  const results = new Array<R>(values.length);
  let nextIndex = 0;
  const runners = Array.from({ length: Math.min(concurrency, values.length) }, async () => {
    while (nextIndex < values.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await worker(values[index], index);
    }
  });
  await Promise.all(runners);
  return results;
}
