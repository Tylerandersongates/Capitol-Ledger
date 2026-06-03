import { searchRecordsWithLiveData } from "@/lib/data";
import type { Bill, Member, Vote } from "@/types/capitol";

type SuggestionKind = "members" | "bills" | "votes";
type SuggestionScope = "all" | SuggestionKind;

type SuggestionEntry = {
  href: string;
  id: string;
  kind: SuggestionKind;
  label: string;
  searchTerms: string[];
  subtitle: string;
};

export type SearchSuggestion = {
  href: string;
  id: string;
  kind: SuggestionKind;
  label: string;
  subtitle: string;
};

export type SuggestionRequest = {
  limit?: number;
  q: string;
  type?: string;
};

const CATALOG_CACHE_TTL_MS = 60_000;

const catalogCache = new Map<SuggestionScope, { entries: SuggestionEntry[]; expiresAt: number }>();

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripMemberPrefix(fullName: string) {
  return fullName.replace(/^Sen\.\s+|^Rep\.\s+/i, "").trim();
}

function parseSuggestionScope(value?: string): SuggestionScope {
  if (value === "members" || value === "bills" || value === "votes") return value;
  return "all";
}

function distanceThreshold(queryLength: number) {
  if (queryLength <= 4) return 1;
  if (queryLength <= 8) return 2;
  return 3;
}

function boundedLevenshtein(a: string, b: string, threshold: number) {
  const lengthA = a.length;
  const lengthB = b.length;

  if (Math.abs(lengthA - lengthB) > threshold) return threshold + 1;
  if (lengthA === 0) return lengthB;
  if (lengthB === 0) return lengthA;

  const previous = new Array<number>(lengthB + 1);
  const current = new Array<number>(lengthB + 1);

  for (let index = 0; index <= lengthB; index += 1) previous[index] = index;

  for (let row = 1; row <= lengthA; row += 1) {
    current[0] = row;
    let rowMin = current[0];

    for (let column = 1; column <= lengthB; column += 1) {
      const substitutionCost = a[row - 1] === b[column - 1] ? 0 : 1;
      const substitution = previous[column - 1] + substitutionCost;
      const insertion = current[column - 1] + 1;
      const deletion = previous[column] + 1;
      const cell = Math.min(substitution, insertion, deletion);

      current[column] = cell;
      if (cell < rowMin) rowMin = cell;
    }

    if (rowMin > threshold) return threshold + 1;

    for (let column = 0; column <= lengthB; column += 1) previous[column] = current[column];
  }

  return previous[lengthB];
}

function scoreTextMatch(term: string, query: string) {
  if (!term) return Number.NEGATIVE_INFINITY;
  if (term === query) return 120;

  if (term.startsWith(query)) {
    return 106 - Math.min(term.length - query.length, 22) * 0.45;
  }

  const containsIndex = term.indexOf(query);
  if (containsIndex >= 0) {
    return 88 - Math.min(containsIndex, 22) * 0.65;
  }

  const queryThreshold = distanceThreshold(query.length);
  const termTokens = term.split(" ");
  let fuzzyScore = Number.NEGATIVE_INFINITY;

  for (const token of termTokens) {
    if (!token) continue;
    const comparable = token.length > query.length + 2 ? token.slice(0, query.length + 2) : token;
    const distance = boundedLevenshtein(query, comparable, queryThreshold);
    if (distance <= queryThreshold) {
      const score = 70 - distance * 11 - Math.max(comparable.length - query.length, 0) * 0.5;
      if (score > fuzzyScore) fuzzyScore = score;
    }
  }

  return fuzzyScore;
}

function scoreSuggestion(entry: SuggestionEntry, query: string) {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return Number.NEGATIVE_INFINITY;

  let best = Number.NEGATIVE_INFINITY;

  for (const term of entry.searchTerms) {
    const normalizedTerm = normalizeText(term);
    if (!normalizedTerm) continue;
    const score = scoreTextMatch(normalizedTerm, normalizedQuery);
    if (score > best) best = score;
  }

  return best;
}

function buildMemberEntry(member: Member): SuggestionEntry {
  const displayName = stripMemberPrefix(member.fullName);
  const districtLabel = member.district ? `-${member.district}` : "";

  return {
    href: `/members/${member.bioguideId}`,
    id: member.bioguideId,
    kind: "members",
    label: displayName,
    searchTerms: [
      member.fullName,
      displayName,
      `${member.firstName} ${member.lastName}`,
      member.lastName,
      member.state,
      member.party,
      member.chamber,
      member.district
    ].filter(Boolean) as string[],
    subtitle: `${member.chamber} · ${member.state}${districtLabel} · ${member.party}`
  };
}

function buildBillEntry(bill: Bill): SuggestionEntry {
  return {
    href: `/bills/${bill.id}`,
    id: bill.id,
    kind: "bills",
    label: bill.shortTitle,
    searchTerms: [bill.displayNumber, bill.shortTitle, bill.title, bill.policyArea],
    subtitle: `${bill.displayNumber} · ${bill.policyArea}`
  };
}

function buildVoteEntry(vote: Vote): SuggestionEntry {
  return {
    href: `/votes/${vote.id}`,
    id: vote.id,
    kind: "votes",
    label: vote.question,
    searchTerms: [vote.question, vote.rollCall, vote.result, vote.chamber],
    subtitle: `${vote.chamber} roll call ${vote.rollCall} · ${vote.result}`
  };
}

async function getSuggestionCatalog(scope: SuggestionScope) {
  const cached = catalogCache.get(scope);
  if (cached && cached.expiresAt > Date.now()) return cached.entries;

  const { results } = await searchRecordsWithLiveData({ type: scope });
  const entries: SuggestionEntry[] = [
    ...results.members.map(buildMemberEntry),
    ...results.bills.map(buildBillEntry),
    ...results.votes.map(buildVoteEntry)
  ];

  catalogCache.set(scope, {
    entries,
    expiresAt: Date.now() + CATALOG_CACHE_TTL_MS
  });

  return entries;
}

function matchesScope(entry: SuggestionEntry, scope: SuggestionScope) {
  if (scope === "all") return true;
  return entry.kind === scope;
}

export async function getSearchSuggestions({ limit = 8, q, type }: SuggestionRequest): Promise<SearchSuggestion[]> {
  const query = q.trim();
  if (query.length < 2) return [];

  const scope = parseSuggestionScope(type);
  const normalizedLimit = Math.min(Math.max(limit, 3), 12);
  const entries = await getSuggestionCatalog(scope);

  const scored = entries
    .filter((entry) => matchesScope(entry, scope))
    .map((entry) => ({
      entry,
      score: scoreSuggestion(entry, query)
    }))
    .filter((candidate) => Number.isFinite(candidate.score))
    .sort((a, b) => b.score - a.score || a.entry.label.localeCompare(b.entry.label))
    .slice(0, normalizedLimit)
    .map(({ entry }) => ({
      href: entry.href,
      id: entry.id,
      kind: entry.kind,
      label: entry.label,
      subtitle: entry.subtitle
    }));

  return scored;
}
