import fs from "node:fs/promises";
import path from "node:path";
import { bills, cosponsors, members } from "../lib/demo-data";
import { getOfficialYoutubeChannelsForMembers, type OfficialYoutubeChannel } from "../lib/official-youtube-channels";
import { buildBillStatementSearchTerms, scoreYoutubeBillStatementMatch, type YoutubeStatementCandidate } from "../lib/youtube-bill-statements";
import type { Bill } from "../types/capitol";

type YoutubeChannelListResponse = {
  items?: Array<{
    id: string;
    snippet?: {
      title?: string;
    };
  }>;
};

type YoutubeSearchResponse = {
  items?: Array<{
    id?: {
      videoId?: string;
    };
    snippet?: {
      channelId?: string;
      channelTitle?: string;
      description?: string;
      publishedAt?: string;
      thumbnails?: {
        high?: { url?: string };
        medium?: { url?: string };
      };
      title?: string;
    };
  }>;
};

type YoutubeVideosResponse = {
  items?: Array<{
    id: string;
    contentDetails?: {
      duration?: string;
    };
    snippet?: {
      channelId?: string;
      channelTitle?: string;
      description?: string;
      publishedAt?: string;
      thumbnails?: {
        high?: { url?: string };
        medium?: { url?: string };
      };
      title?: string;
    };
    status?: {
      privacyStatus?: string;
    };
  }>;
};

type SearchPlanItem = {
  bill: Bill;
  channel: OfficialYoutubeChannel;
  memberName: string;
  publishedAfter?: string;
  term: string;
};

const apiKey = process.env.YOUTUBE_API_KEY?.trim();
const maxTermsPerBill = readIntegerEnv("YOUTUBE_BILL_TERMS_PER_MEMBER", 3, 1, 6);
const maxResultsPerQuery = readIntegerEnv("YOUTUBE_BILL_RESULTS_PER_QUERY", 5, 1, 10);

function readIntegerEnv(name: string, fallback: number, min: number, max: number) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value < min || value > max) return fallback;
  return value;
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function involvedMemberIdsForBill(bill: Bill) {
  return uniqueStrings([bill.sponsorBioguideId ?? "", ...cosponsors.filter((cosponsor) => cosponsor.billId === bill.id).map((cosponsor) => cosponsor.memberBioguideId)]);
}

function publishedAfterForBill(bill: Bill) {
  const anchorDate = bill.introducedDate ?? bill.latestActionDate;
  if (!anchorDate) return undefined;

  const date = new Date(`${anchorDate}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return undefined;

  date.setUTCDate(date.getUTCDate() - 30);
  return date.toISOString();
}

function buildSearchPlan() {
  const plan: SearchPlanItem[] = [];

  for (const bill of bills) {
    const channels = getOfficialYoutubeChannelsForMembers(involvedMemberIdsForBill(bill)).filter((channel) => channel.verificationStatus === "verified");
    const terms = buildBillStatementSearchTerms(bill).slice(0, maxTermsPerBill);
    const publishedAfter = publishedAfterForBill(bill);

    for (const channel of channels) {
      const memberName = members.find((member) => member.bioguideId === channel.memberBioguideId)?.fullName ?? channel.officialName;

      for (const term of terms) {
        plan.push({ bill, channel, memberName, publishedAfter, term });
      }
    }
  }

  return plan;
}

async function youtubeApi<T>(resource: "channels" | "search" | "videos", params: Record<string, string | undefined>) {
  if (!apiKey) throw new Error("YOUTUBE_API_KEY is required for YouTube API calls.");

  const url = new URL(`https://www.googleapis.com/youtube/v3/${resource}`);
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
  }
  url.searchParams.set("key", apiKey);

  const response = await fetch(url);
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`YouTube ${resource} request failed (${response.status}): ${detail.slice(0, 240)}`);
  }

  return (await response.json()) as T;
}

async function resolveChannelId(channel: OfficialYoutubeChannel) {
  if (channel.channelId) return channel.channelId;

  const params =
    channel.youtubeHandle
      ? { forHandle: channel.youtubeHandle, part: "id,snippet" }
      : channel.youtubeUsername
        ? { forUsername: channel.youtubeUsername, part: "id,snippet" }
        : null;

  if (!params) return null;

  const response = await youtubeApi<YoutubeChannelListResponse>("channels", params);
  return response.items?.[0]?.id ?? null;
}

async function fetchCandidates(planItem: SearchPlanItem, channelId: string) {
  const searchResponse = await youtubeApi<YoutubeSearchResponse>("search", {
    channelId,
    maxResults: String(maxResultsPerQuery),
    order: "date",
    part: "snippet",
    publishedAfter: planItem.publishedAfter,
    q: planItem.term,
    type: "video"
  });
  const videoIds = uniqueStrings((searchResponse.items ?? []).map((item) => item.id?.videoId ?? ""));

  if (!videoIds.length) return [];

  const detailsResponse = await youtubeApi<YoutubeVideosResponse>("videos", {
    id: videoIds.join(","),
    part: "snippet,contentDetails,status"
  });

  return (detailsResponse.items ?? []).map((item) => {
    const thumbnailUrl = item.snippet?.thumbnails?.high?.url ?? item.snippet?.thumbnails?.medium?.url;
    return {
      duration: item.contentDetails?.duration,
      id: item.id,
      privacyStatus: item.status?.privacyStatus,
      video: {
        id: item.id,
        channelId: item.snippet?.channelId,
        channelTitle: item.snippet?.channelTitle,
        description: item.snippet?.description,
        publishedAt: item.snippet?.publishedAt,
        thumbnailUrl,
        title: item.snippet?.title ?? "Untitled YouTube video",
        videoUrl: `https://www.youtube.com/watch?v=${item.id}`
      } satisfies YoutubeStatementCandidate
    };
  });
}

async function runSync() {
  const plan = buildSearchPlan();
  const officialChannelCount = getOfficialYoutubeChannelsForMembers(members.map((member) => member.bioguideId)).filter(
    (channel) => channel.verificationStatus === "verified"
  ).length;

  console.log("YouTube bill statement sync readiness");
  console.log(`Verified official channels in registry: ${officialChannelCount}`);
  console.log(`Bills available for matching: ${bills.length}`);
  console.log(`Planned official-channel bill queries: ${plan.length}`);

  for (const item of plan.slice(0, 5)) {
    console.log(`PLAN ${item.bill.displayNumber} -> ${item.memberName} / "${item.term}"`);
  }

  if (!apiKey) {
    console.log("YOUTUBE_API_KEY is not set; skipped API calls and left artifacts unchanged.");
    return;
  }

  const channelIdCache = new Map<string, string | null>();
  const matches: unknown[] = [];

  for (const planItem of plan) {
    const cacheKey = planItem.channel.memberBioguideId;
    if (!channelIdCache.has(cacheKey)) {
      channelIdCache.set(cacheKey, await resolveChannelId(planItem.channel));
    }

    const channelId = channelIdCache.get(cacheKey);
    if (!channelId) {
      console.warn(`WARN Could not resolve YouTube channel ID for ${planItem.channel.officialName}`);
      continue;
    }

    const resolvedChannel = { ...planItem.channel, channelId };
    const candidates = await fetchCandidates(planItem, channelId);

    for (const candidate of candidates) {
      const match = scoreYoutubeBillStatementMatch({ bill: planItem.bill, channel: resolvedChannel, video: candidate.video });
      if (match.confidence === "low") continue;

      matches.push({
        billId: planItem.bill.id,
        billNumber: planItem.bill.displayNumber,
        channelId,
        duration: candidate.duration,
        match,
        memberBioguideId: planItem.channel.memberBioguideId,
        memberName: planItem.memberName,
        searchTerm: planItem.term,
        video: candidate.video
      });
    }
  }

  const artifactDir = path.join(process.cwd(), "artifacts");
  const artifactPath = path.join(artifactDir, "youtube-bill-statement-matches.json");
  await fs.mkdir(artifactDir, { recursive: true });
  await fs.writeFile(
    artifactPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        matches
      },
      null,
      2
    )
  );

  console.log(`Wrote ${matches.length} candidate matches to ${artifactPath}`);
}

runSync().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
