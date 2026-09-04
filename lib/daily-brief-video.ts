import { z } from "zod";
import videoContent from "@/content/daily-brief-videos.json";

const videoIdPattern = /^[A-Za-z0-9_-]{11}$/;
const youtubeHosts = new Set(["youtube.com", "www.youtube.com", "m.youtube.com"]);

function secureUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.port ? url : null;
  } catch {
    return null;
  }
}

export function getYoutubeVideoId(value: string) {
  const url = secureUrl(value);
  if (!url) return null;
  const segments = url.pathname.split("/").filter(Boolean);
  let id: string | null = null;

  if (url.hostname === "youtu.be" && segments.length === 1) id = segments[0];
  if (youtubeHosts.has(url.hostname)) {
    if (url.pathname === "/watch") id = url.searchParams.get("v");
    if (segments.length === 2 && ["shorts", "embed"].includes(segments[0])) id = segments[1];
  }

  return id && videoIdPattern.test(id) ? id : null;
}

export function normalizeYoutubeChannelUrl(value?: string | null) {
  const url = value ? secureUrl(value) : null;
  if (!url || !youtubeHosts.has(url.hostname)) return null;
  const path = url.pathname.replace(/\/$/, "");
  const channelPath = /^\/@[A-Za-z0-9._-]+$|^\/channel\/UC[A-Za-z0-9_-]{22}$|^\/(?:c|user)\/[A-Za-z0-9._-]+$/;
  return channelPath.test(path) ? `https://www.youtube.com${path}` : null;
}

const episodeSchema = z.object({
  title: z.string().trim().min(1),
  videoUrl: z.string().refine((value) => Boolean(getYoutubeVideoId(value))),
  publishedAt: z.string().datetime({ offset: true }),
  format: z.enum(["short", "video"]),
  transcript: z.array(z.string().trim().min(1)),
  sources: z.array(z.object({
    label: z.string().trim().min(1),
    url: z.string().refine((value) => Boolean(secureUrl(value)))
  }))
});

export type DailyBriefVideoEpisode = z.infer<typeof episodeSchema>;
export type DailyBriefVideoContent = {
  channelUrl: string | null;
  episodes: DailyBriefVideoEpisode[];
};
export type DailyBriefVideoPageData = ReturnType<typeof getDailyBriefVideoPageData>;

export function getDailyBriefVideoPageData(content: unknown = videoContent, now = new Date()) {
  const catalog = z.object({ channelUrl: z.string().nullable(), episodes: z.array(z.unknown()) }).safeParse(content);
  const channelUrl = normalizeYoutubeChannelUrl(catalog.success ? catalog.data.channelUrl : null);
  const episodes = catalog.success ? catalog.data.episodes : [];
  const episode = episodes
    .flatMap((entry) => {
      const parsed = episodeSchema.safeParse(entry);
      return parsed.success && Date.parse(parsed.data.publishedAt) <= now.getTime() ? [parsed.data] : [];
    })
    .sort((left, right) => Date.parse(right.publishedAt) - Date.parse(left.publishedAt))[0] ?? null;
  const videoId = episode ? getYoutubeVideoId(episode.videoUrl) : null;

  return {
    channelUrl,
    subscribeUrl: channelUrl ? `${channelUrl}?sub_confirmation=1` : null,
    episode,
    embedUrl: videoId ? `https://www.youtube-nocookie.com/embed/${videoId}?playsinline=1&rel=0` : null,
    watchUrl: videoId ? `https://www.youtube.com/${episode?.format === "short" ? "shorts/" : "watch?v="}${videoId}` : null
  };
}

export function formatDailyBriefVideoDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric", month: "long", year: "numeric", timeZone: "America/New_York"
  }).format(new Date(value));
}
