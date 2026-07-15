import { z } from "zod";

export type GdeltDailyBriefArticle = {
  domain: string;
  id: string;
  issueMatches: string[];
  seenAt?: string;
  sourceCountry?: string;
  title: string;
  url: string;
};

type GdeltLane = {
  id: string;
  issueMatches: string[];
  queryTerms: string[];
};

type FetchGdeltDailyBriefItemsOptions = {
  interests: string[];
  maxItems?: number;
};

const GDELT_DOC_API_URL = "https://api.gdeltproject.org/api/v2/doc/doc";
const defaultCacheMaxAgeMs = 15 * 60 * 1000;
const defaultMaxRecords = 6;
const defaultTimeoutMs = 2500;
const defaultTimespan = "24h";

const federalPoliticsTerms = [
  '"Congress"',
  '"U.S. Senate"',
  '"House of Representatives"',
  '"White House"',
  '"Supreme Court"',
  '"federal agency"',
  '"federal government"',
  '"federal rule"',
  '"federal court"',
  '"Department of"',
  "legislation",
  "lawmaker",
  "lawmakers"
];

const dailyBriefLanes: GdeltLane[] = [
  {
    id: "affordability",
    issueMatches: ["Affordability", "Inflation", "Federal Budget Deficit", "Jobs"],
    queryTerms: ['"cost of living"', "inflation", '"federal budget"', "taxes", '"food prices"', '"housing costs"']
  },
  {
    id: "border-security",
    issueMatches: ["Border Security", "Immigration", "Public Safety"],
    queryTerms: ['"border security"', "immigration", "asylum", '"homeland security"', "migrant", "migrants"]
  },
  {
    id: "healthcare",
    issueMatches: ["Healthcare", "Healthcare Affordability", "Drug Addiction"],
    queryTerms: ["healthcare", "Medicare", "Medicaid", '"drug prices"', "opioid", "opioids", '"health insurance"']
  },
  {
    id: "public-investment",
    issueMatches: ["Education", "Infrastructure", "Climate Change", "Veterans Affairs"],
    queryTerms: ["education", "infrastructure", "climate", "veterans", '"student loans"', "transportation"]
  },
  {
    id: "gun-violence",
    issueMatches: ["Gun Violence", "Public Safety"],
    queryTerms: ['"gun violence"', "firearms", "guns", '"public safety"', '"mass shooting"']
  },
  {
    id: "federal-politics",
    issueMatches: ["Federal Policy", "Elections", "Congress"],
    queryTerms: ['"federal policy"', "elections", "voting", '"executive order"', '"committee hearing"']
  }
];

const GdeltDocArticleSchema = z
  .object({
    domain: z.string().optional(),
    language: z.string().optional(),
    seendate: z.string().optional(),
    sourcecountry: z.string().optional(),
    title: z.string().optional(),
    url: z.string().optional()
  })
  .passthrough();

const GdeltDocResponseSchema = z
  .object({
    articles: z.array(GdeltDocArticleSchema).optional()
  })
  .passthrough();

declare global {
  // eslint-disable-next-line no-var
  var __capitolLedgerGdeltDailyBriefCache: Map<string, { cachedAt: number; items: GdeltDailyBriefArticle[] }> | undefined;
}

const gdeltDailyBriefCache = globalThis.__capitolLedgerGdeltDailyBriefCache ?? new Map<string, { cachedAt: number; items: GdeltDailyBriefArticle[] }>();
globalThis.__capitolLedgerGdeltDailyBriefCache = gdeltDailyBriefCache;

function normalizeInterest(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function boundedNumber(value: string | undefined, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.floor(parsed), min), max);
}

function gdeltEnabled() {
  return process.env.GDELT_DAILY_BRIEF_ENABLED !== "false";
}

function cacheMaxAgeMs() {
  return boundedNumber(process.env.GDELT_DAILY_BRIEF_CACHE_MS, defaultCacheMaxAgeMs, 60 * 1000, 60 * 60 * 1000);
}

function maxRecords() {
  return boundedNumber(process.env.GDELT_DAILY_BRIEF_MAX_RECORDS, defaultMaxRecords, 1, 20);
}

function requestTimeoutMs() {
  return boundedNumber(process.env.GDELT_DAILY_BRIEF_TIMEOUT_MS, defaultTimeoutMs, 500, 8000);
}

function timespan() {
  const value = process.env.GDELT_DAILY_BRIEF_TIMESPAN?.trim() || defaultTimespan;
  return /^\d+(min|h|d)$/i.test(value) ? value : defaultTimespan;
}

function matchesInterest(lane: GdeltLane, interests: string[]) {
  const normalizedInterests = interests.map(normalizeInterest);
  return lane.issueMatches.some((issue) => normalizedInterests.includes(normalizeInterest(issue)));
}

function selectLanes(interests: string[]) {
  const matched = dailyBriefLanes.filter((lane) => matchesInterest(lane, interests));
  return (matched.length ? matched : dailyBriefLanes.filter((lane) => lane.id === "federal-politics")).slice(0, 3);
}

function buildOrClause(values: string[]) {
  return `(${values.join(" OR ")})`;
}

export function buildGdeltUsPoliticsQuery(lane: GdeltLane) {
  return `${buildOrClause(federalPoliticsTerms)} ${buildOrClause(lane.queryTerms)} sourcecountry:US sourcelang:english`;
}

export function buildGdeltDailyBriefQuery(lanes: GdeltLane[]) {
  const issueTerms = Array.from(new Set(lanes.flatMap((lane) => lane.queryTerms)));
  return `${buildOrClause(federalPoliticsTerms)} ${buildOrClause(issueTerms)} sourcecountry:US sourcelang:english`;
}

function normalizeTitle(value: string) {
  return value
    .toLowerCase()
    .replace(/['"`]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function stableArticleId(article: Pick<GdeltDailyBriefArticle, "title" | "url">) {
  const slug = normalizeTitle(article.title).slice(0, 80).replace(/\s+/g, "-") || "article";
  let host = "source";

  try {
    host = new URL(article.url).hostname.replace(/^www\./, "");
  } catch {
    // The caller has already filtered invalid URLs; this keeps IDs stable if URL parsing changes.
  }

  return `gdelt-${host}-${slug}`;
}

function safeUrl(value?: string) {
  if (!value) return undefined;

  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

function normalizeDomain(articleDomain: string | undefined, url: string) {
  if (articleDomain?.trim()) return articleDomain.trim().replace(/^www\./, "");

  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "GDELT source";
  }
}

function normalizeSeenDate(value?: string) {
  if (!value) return undefined;
  const compactMatch = value.match(/^(\d{4})(\d{2})(\d{2})T?(\d{2})?(\d{2})?(\d{2})?Z?$/);

  if (compactMatch) {
    const [, year, month, day, hour = "00", minute = "00", second = "00"] = compactMatch;
    return `${year}-${month}-${day}T${hour}:${minute}:${second}Z`;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function normalizeArticle(article: z.infer<typeof GdeltDocArticleSchema>, lanes: GdeltLane[]): GdeltDailyBriefArticle | null {
  const url = safeUrl(article.url);
  const title = article.title?.replace(/\s+/g, " ").trim();
  if (!url || !title) return null;
  const issueMatches = Array.from(new Set(lanes.flatMap((lane) => lane.issueMatches))).slice(0, 6);

  const normalized: GdeltDailyBriefArticle = {
    domain: normalizeDomain(article.domain, url),
    id: stableArticleId({ title, url }),
    issueMatches,
    seenAt: normalizeSeenDate(article.seendate),
    sourceCountry: article.sourcecountry,
    title,
    url
  };

  return normalized;
}

async function fetchArticlesForLanes(lanes: GdeltLane[]) {
  const url = new URL(GDELT_DOC_API_URL);
  url.searchParams.set("query", buildGdeltDailyBriefQuery(lanes));
  url.searchParams.set("mode", "artlist");
  url.searchParams.set("format", "json");
  url.searchParams.set("maxrecords", String(maxRecords()));
  url.searchParams.set("sort", "datedesc");
  url.searchParams.set("timespan", timespan());

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs());

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json"
      },
      cache: "no-store",
      signal: controller.signal
    });

    if (!response.ok) return null;

    const json = GdeltDocResponseSchema.parse(await response.json());
    return (json.articles ?? [])
      .map((article) => normalizeArticle(article, lanes))
      .filter((article): article is GdeltDailyBriefArticle => Boolean(article));
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function dedupeArticles(articles: GdeltDailyBriefArticle[]) {
  const seen = new Set<string>();
  const unique: GdeltDailyBriefArticle[] = [];

  articles.forEach((article) => {
    const key = `${article.domain}:${normalizeTitle(article.title).slice(0, 90)}`;
    if (seen.has(key)) return;

    seen.add(key);
    unique.push(article);
  });

  return unique;
}

export async function fetchGdeltDailyBriefItems({ interests, maxItems = 3 }: FetchGdeltDailyBriefItemsOptions) {
  if (!gdeltEnabled()) return [];

  const lanes = selectLanes(interests);
  const cacheKey = JSON.stringify({
    interests: interests.map(normalizeInterest).sort(),
    lanes: lanes.map((lane) => lane.id),
    maxItems,
    timespan: timespan()
  });
  const cached = gdeltDailyBriefCache.get(cacheKey);

  if (cached && cached.cachedAt + cacheMaxAgeMs() > Date.now()) {
    return cached.items;
  }

  const articles = await fetchArticlesForLanes(lanes);
  if (!articles) return cached?.items ?? [];

  const items = dedupeArticles(articles).slice(0, Math.max(1, maxItems));
  gdeltDailyBriefCache.set(cacheKey, { cachedAt: Date.now(), items });

  return items;
}
