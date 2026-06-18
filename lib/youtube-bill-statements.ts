import type { OfficialYoutubeChannel } from "./official-youtube-channels";
import type { Bill, BillVideoMatchConfidence, BillVideoReviewStatus } from "../types/capitol";

export type YoutubeStatementCandidate = {
  id: string;
  title: string;
  description?: string;
  publishedAt?: string;
  channelId?: string;
  channelTitle?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
};

export type YoutubeStatementMatch = {
  confidence: BillVideoMatchConfidence;
  matchedTerms: string[];
  reason: string;
  reviewStatus: BillVideoReviewStatus;
  score: number;
};

const stopWords = new Set([
  "about",
  "after",
  "american",
  "before",
  "bill",
  "congress",
  "federal",
  "from",
  "house",
  "into",
  "more",
  "national",
  "public",
  "senate",
  "services",
  "that",
  "their",
  "this",
  "united",
  "with"
]);

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function normalizeForMatch(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function includesNormalized(text: string, term: string) {
  const normalizedTerm = normalizeForMatch(term);
  if (!normalizedTerm) return false;
  return normalizeForMatch(text).includes(normalizedTerm);
}

function billNumberAliases(bill: Pick<Bill, "billNumber" | "billType" | "displayNumber">) {
  const billType = bill.billType.toUpperCase();
  const billNumber = bill.billNumber;

  if (billType === "HR") {
    return [bill.displayNumber, `H.R. ${billNumber}`, `HR ${billNumber}`, `H R ${billNumber}`, `House Bill ${billNumber}`];
  }

  if (billType === "S") {
    return [bill.displayNumber, `S. ${billNumber}`, `S ${billNumber}`, `Senate Bill ${billNumber}`];
  }

  return [bill.displayNumber, `${billType} ${billNumber}`];
}

function meaningfulTitleWords(bill: Pick<Bill, "policyArea" | "shortTitle" | "title">) {
  return uniqueStrings([bill.title, bill.shortTitle, bill.policyArea].flatMap((value) => normalizeForMatch(value).split(" "))).filter(
    (word) => word.length >= 5 && !stopWords.has(word)
  );
}

export function buildBillStatementSearchTerms(bill: Pick<Bill, "billNumber" | "billType" | "displayNumber" | "policyArea" | "shortTitle" | "title">) {
  return uniqueStrings([...billNumberAliases(bill), bill.shortTitle, bill.title, bill.policyArea]);
}

export function scoreYoutubeBillStatementMatch({
  bill,
  channel,
  video
}: {
  bill: Pick<Bill, "billNumber" | "billType" | "displayNumber" | "policyArea" | "shortTitle" | "title">;
  channel: Pick<OfficialYoutubeChannel, "channelId" | "officialName" | "verificationStatus">;
  video: YoutubeStatementCandidate;
}): YoutubeStatementMatch {
  const titleText = video.title;
  const bodyText = [video.title, video.description ?? ""].join(" ");
  const numberTerms = billNumberAliases(bill);
  const titleTerms = [bill.shortTitle, bill.title].filter((term) => normalizeForMatch(term).length >= 8);
  const matchedTerms = uniqueStrings([...numberTerms, ...titleTerms].filter((term) => includesNormalized(bodyText, term)));
  const exactNumberHit = numberTerms.some((term) => includesNormalized(titleText, term));
  const exactTitleHit = titleTerms.some((term) => includesNormalized(titleText, term));
  const descriptionHit = matchedTerms.length > 0 && !exactNumberHit && !exactTitleHit;
  const keywordHits = meaningfulTitleWords(bill).filter((word) => includesNormalized(bodyText, word));
  const officialChannelHit = channel.verificationStatus === "verified" && (!channel.channelId || !video.channelId || channel.channelId === video.channelId);

  let score = 0;
  if (officialChannelHit) score += 30;
  if (exactNumberHit) score += 45;
  if (exactTitleHit) score += 40;
  if (descriptionHit) score += 22;
  score += Math.min(keywordHits.length * 8, 24);

  const confidence: BillVideoMatchConfidence = score >= 70 ? "high" : score >= 45 ? "medium" : "low";
  const reviewStatus: BillVideoReviewStatus = confidence === "low" ? "needs-review" : "auto-matched";
  const reasons: string[] = [];

  if (officialChannelHit) reasons.push(`${channel.officialName} is on the verified official-channel registry`);
  if (exactNumberHit) reasons.push(`the video title names ${bill.displayNumber}`);
  if (exactTitleHit) reasons.push("the video title names the bill title");
  if (descriptionHit) reasons.push("the description includes bill-specific text");
  if (keywordHits.length) reasons.push(`matched ${keywordHits.slice(0, 4).join(", ")}`);

  return {
    confidence,
    matchedTerms: uniqueStrings([...matchedTerms, ...keywordHits]),
    reason: reasons.length ? reasons.join("; ") : "No strong bill-specific signal found.",
    reviewStatus,
    score
  };
}
