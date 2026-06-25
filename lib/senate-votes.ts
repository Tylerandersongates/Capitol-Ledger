import type { Member, Vote, VotePosition } from "@/types/capitol";
import { memberStateCode } from "@/lib/member-display";
import { senateVoteSnapshotGeneratedAt, senateVoteSnapshots } from "@/lib/senate-vote-snapshot";

type SenateMenuVote = {
  congress: number;
  rollCall: string;
  session: number;
  sourceUrl: string;
  voteNumberPadded: string;
};

export type SenateMemberVoteRecord = {
  memberBioguideId: string;
  position: VotePosition;
  vote?: Vote;
  voteId: string;
};

const SENATE_ROLL_CALL_BASE_URL = "https://www.senate.gov/legislative/LIS";
const senateMemberVoteCache = new Map<string, { cachedAt: number; records: SenateMemberVoteRecord[] }>();
const senateMemberVoteCacheMaxAgeMs = 10 * 60 * 1000;
const senateVoteDetailBatchSize = 4;
const senateXmlFetchHeaders: HeadersInit[] = [
  {
    Accept: "application/xml,text/xml,*/*",
    "Accept-Language": "en-US,en;q=0.9",
    "User-Agent": "Mozilla/5.0 Capitol Ledger civic data reader"
  },
  {
    Accept: "application/xml,text/xml,*/*"
  }
];

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

function normalizeMemberSnapshotKey(member: Pick<Member, "lastName" | "state">) {
  const lastName = normalizeWhitespace(member.lastName)
    .toLowerCase()
    .replace(/[^a-z]/g, "");
  return `${lastName}:${memberStateCode(member.state).toUpperCase()}`;
}

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

function senateVoteSourceUrl(congress: number, session: number, voteNumberPadded: string) {
  return `${SENATE_ROLL_CALL_BASE_URL}/roll_call_votes/vote${congress}${session}/vote_${congress}_${session}_${voteNumberPadded}.xml`;
}

function senateVoteMenuUrl(congress: number, session: number) {
  return `${SENATE_ROLL_CALL_BASE_URL}/roll_call_lists/vote_menu_${congress}_${session}.xml`;
}

async function fetchXml(url: string, timeoutMs: number) {
  for (const headers of senateXmlFetchHeaders) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        cache: "no-store",
        headers,
        signal: controller.signal
      });

      if (!response.ok) continue;

      const text = await response.text();
      if (/<(?:vote_summary|roll_call_vote)\b/i.test(text)) return text;
    } catch {
      // Try the next header set before giving up.
    } finally {
      clearTimeout(timeout);
    }
  }

  return null;
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

function normalizeSenateVoteDate(value?: string, congressYear?: string) {
  const parsed = Date.parse(value?.replace(/\s+/g, " ") ?? "");
  if (Number.isFinite(parsed)) return new Date(parsed).toISOString().slice(0, 10);
  return `${congressYear ?? new Date().getUTCFullYear()}-01-01`;
}

function parseSenateVoteMenu(xml: string) {
  const congress = Number(tagValue(xml, "congress"));
  const session = Number(tagValue(xml, "session"));
  if (!Number.isInteger(congress) || !Number.isInteger(session)) return [];

  return tagBlocks(xml, "vote")
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
}

function findMemberBlock(xml: string, member: Pick<Member, "lastName" | "state">) {
  const lastName = normalizeWhitespace(member.lastName).toLowerCase();
  const compactLastName = lastName.replace(/[^a-z]/g, "");
  const state = memberStateCode(member.state).toUpperCase();

  return tagBlocks(xml, "member").find((block) => {
    const blockLastName = tagValue(block, "last_name")?.toLowerCase();
    const blockCompactLastName = blockLastName?.replace(/[^a-z]/g, "");
    const blockState = tagValue(block, "state")?.toUpperCase();
    return blockState === state && (blockLastName === lastName || blockCompactLastName === compactLastName);
  });
}

function parseSenateVoteDetail(xml: string, sourceUrl: string, member: Member): SenateMemberVoteRecord | null {
  const congress = Number(tagValue(xml, "congress"));
  const session = Number(tagValue(xml, "session"));
  const rollCall = String(Number(tagValue(xml, "vote_number")));
  const congressYear = tagValue(xml, "congress_year");
  const memberBlock = findMemberBlock(xml, member);
  const position = normalizeVotePosition(memberBlock ? tagValue(memberBlock, "vote_cast") : undefined);

  if (!Number.isInteger(congress) || !Number.isInteger(session) || !rollCall || rollCall === "NaN" || !position) return null;

  const question = tagValue(xml, "vote_title") ?? tagValue(xml, "vote_question_text") ?? tagValue(xml, "question") ?? "Senate roll-call vote";
  const voteDate = normalizeSenateVoteDate(tagValue(xml, "vote_date"), congressYear);
  const vote: Vote = {
    chamber: "Senate",
    congress,
    explanation: "Official Senate roll-call vote normalized from the Senate Legislative Information System.",
    id: `senate-live-${congress}-${session}-${rollCall}`,
    memberBioguideIds: [member.bioguideId],
    noCount: numericTagValue(xml, "nays"),
    notVotingCount: numericTagValue(xml, "absent"),
    presentCount: numericTagValue(xml, "present"),
    question,
    result: tagValue(xml, "vote_result") ?? tagValue(xml, "vote_result_text") ?? "Recorded",
    rollCall,
    sourceUrl,
    voteDate,
    yesCount: numericTagValue(xml, "yeas")
  };

  return {
    memberBioguideId: member.bioguideId,
    position,
    vote,
    voteId: vote.id
  };
}

function getSnapshotMemberVotes(member: Member, limit: number): SenateMemberVoteRecord[] {
  const memberKey = normalizeMemberSnapshotKey(member);

  return senateVoteSnapshots
    .map<SenateMemberVoteRecord | null>((snapshot) => {
      const position = snapshot.positions[memberKey];
      if (!position) return null;

      const vote: Vote = {
        chamber: "Senate",
        congress: snapshot.congress,
        explanation: `Official Senate roll-call vote from a source-backed fallback snapshot generated on ${senateVoteSnapshotGeneratedAt}.`,
        id: `senate-live-${snapshot.congress}-${snapshot.session}-${snapshot.rollCall}`,
        memberBioguideIds: [member.bioguideId],
        noCount: snapshot.noCount,
        notVotingCount: snapshot.notVotingCount,
        presentCount: snapshot.presentCount,
        question: snapshot.question,
        result: snapshot.result,
        rollCall: snapshot.rollCall,
        sourceUrl: snapshot.sourceUrl,
        voteDate: snapshot.voteDate,
        yesCount: snapshot.yesCount
      };

      return {
        memberBioguideId: member.bioguideId,
        position,
        vote,
        voteId: vote.id
      };
    })
    .filter((record): record is SenateMemberVoteRecord => Boolean(record))
    .slice(0, limit);
}

function getFreshCachedMemberVotes(cacheKey: string) {
  const cached = senateMemberVoteCache.get(cacheKey);
  if (!cached) return null;
  if (Date.now() - cached.cachedAt > senateMemberVoteCacheMaxAgeMs) {
    senateMemberVoteCache.delete(cacheKey);
    return null;
  }
  return cached.records;
}

export async function fetchSenateMemberVotes(member: Member, limit = 12, timeoutMs = 5_000) {
  if (member.chamber !== "Senate") return [];

  const congress = readCongressFromTerm(member.term);
  const currentSession = currentSessionForCongress(congress);
  const cacheKey = `${member.bioguideId}:${congress}:${currentSession}:${limit}`;
  const cached = getFreshCachedMemberVotes(cacheKey);
  if (cached) return cached;

  const sessions = currentSession === 2 ? [2, 1] : [1];
  const records: SenateMemberVoteRecord[] = [];

  for (const session of sessions) {
    if (records.length >= limit) break;

    const menuXml = await fetchXml(senateVoteMenuUrl(congress, session), timeoutMs);
    const menuVotes = menuXml ? parseSenateVoteMenu(menuXml).slice(0, limit + 12) : [];

    for (let index = 0; index < menuVotes.length && records.length < limit; index += senateVoteDetailBatchSize) {
      const detailRecords = await Promise.all(
        menuVotes.slice(index, index + senateVoteDetailBatchSize).map(async (menuVote) => {
          const detailXml = await fetchXml(menuVote.sourceUrl, timeoutMs);
          return detailXml ? parseSenateVoteDetail(detailXml, menuVote.sourceUrl, member) : null;
        })
      );

      records.push(...detailRecords.filter((record): record is SenateMemberVoteRecord => Boolean(record)));
    }
  }

  const snapshotRecords = records.length < limit ? getSnapshotMemberVotes(member, limit) : [];
  const mergedRecords = Array.from(new Map([...snapshotRecords, ...records].map((record) => [record.voteId, record])).values());
  const limitedRecords = mergedRecords
    .sort((a, b) => Date.parse(b.vote?.voteDate ?? "0") - Date.parse(a.vote?.voteDate ?? "0"))
    .slice(0, limit);

  senateMemberVoteCache.set(cacheKey, {
    cachedAt: Date.now(),
    records: limitedRecords
  });

  return limitedRecords;
}
