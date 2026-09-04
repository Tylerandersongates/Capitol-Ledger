import assert from "node:assert/strict";
import {
  formatDailyBriefVideoDate,
  getDailyBriefVideoPageData,
  getYoutubeVideoId,
  normalizeYoutubeChannelUrl
} from "../lib/daily-brief-video";
import { isPlanFeatureEnabled } from "../lib/subscription-plans";
import { getDailyBriefProLayoutFixture, isDailyBriefProLayoutPreview } from "../lib/daily-brief-layout-preview";

assert.equal(isDailyBriefProLayoutPreview("pro", {}), false);
assert.equal(isDailyBriefProLayoutPreview("pro", { DAILY_BRIEF_LAYOUT_PREVIEW: "true" }), true);
assert.equal(isDailyBriefProLayoutPreview(undefined, { DAILY_BRIEF_LAYOUT_PREVIEW: "true" }), false);
for (const deployed of [{ DATABASE_URL: "configured" }, { VERCEL: "1" }, { VERCEL_ENV: "production" }]) {
  assert.equal(isDailyBriefProLayoutPreview("pro", { DAILY_BRIEF_LAYOUT_PREVIEW: "true", ...deployed }), false);
}
const proLayout = getDailyBriefProLayoutFixture();
assert.equal(proLayout.plan.id, "pro");
assert.equal(proLayout.delivery.enabled, false);
assert.ok(proLayout.watchToday.length && proLayout.watchlistMovement.items.length);
assert.ok(proLayout.watchToday.every((item) => item.title.startsWith("Sample") && item.sourceUrl === "#pro-preview-notes"));
assert.ok(proLayout.yesterdayInPolitics.every((item) => item.href === "#pro-preview-notes"));

// Synthetic IDs are parsed locally only; no test videos are embedded or fetched.
const id = "testVideo01";
for (const url of [
  `https://www.youtube.com/watch?v=${id}&t=3`,
  `https://youtube.com/shorts/${id}?si=tracking`,
  `https://m.youtube.com/embed/${id}`,
  `https://youtu.be/${id}?si=tracking`
]) assert.equal(getYoutubeVideoId(url), id);
for (const url of [
  `http://youtube.com/watch?v=${id}`,
  `https://youtube.com.evil.example/watch?v=${id}`,
  `https://evil.example/youtube.com/watch?v=${id}`,
  `https://user:password@youtube.com/watch?v=${id}`,
  `https://youtube.com:444/watch?v=${id}`,
  "https://youtube.com/watch?v=too-short",
  `https://youtu.be/${id}/extra`,
  "javascript:alert(1)"
]) assert.equal(getYoutubeVideoId(url), null);

assert.equal(normalizeYoutubeChannelUrl("https://youtube.com/@CapitolWonk/?tracking=1"), "https://www.youtube.com/@CapitolWonk");
assert.equal(normalizeYoutubeChannelUrl(`https://youtube.com/watch?v=${id}`), null);
assert.equal(normalizeYoutubeChannelUrl("https://youtube.com.evil.example/@CapitolWonk"), null);
assert.equal(normalizeYoutubeChannelUrl("http://youtube.com/@CapitolWonk"), null);
assert.equal(normalizeYoutubeChannelUrl(null), null);

const empty = getDailyBriefVideoPageData({ channelUrl: null, episodes: [] });
assert.equal(empty.episode, null);
assert.equal(empty.embedUrl, null);
assert.equal(empty.watchUrl, null);
assert.equal(empty.subscribeUrl, null);
assert.equal(getDailyBriefVideoPageData(null).episode, null);
const channelOnly = getDailyBriefVideoPageData({ channelUrl: "https://youtube.com/@CapitolWonk", episodes: [] });
assert.equal(channelOnly.subscribeUrl, "https://www.youtube.com/@CapitolWonk?sub_confirmation=1");
assert.equal(channelOnly.embedUrl, null);

const episode = {
  title: "Fixture edition",
  videoUrl: `https://youtube.com/shorts/${id}?si=tracking`,
  publishedAt: "2026-09-02T12:00:00Z",
  format: "short",
  transcript: ["Test transcript paragraph."],
  sources: [{ label: "Official record", url: "https://www.congress.gov/" }]
};
const now = new Date("2026-09-03T15:00:00Z");
const current = { ...episode, title: "Latest edition", publishedAt: "2026-09-03T12:00:00Z" };
const selected = getDailyBriefVideoPageData({ channelUrl: null, episodes: [
  current,
  { ...episode, publishedAt: "2026-09-04T12:00:00Z" },
  { ...episode, videoUrl: "https://evil.example/watch", publishedAt: "2026-09-03T14:00:00Z" },
  episode
] }, now);
assert.equal(selected.episode?.title, "Latest edition", "Select latest valid, published video regardless of file order.");
assert.equal(selected.watchUrl, `https://www.youtube.com/shorts/${id}`);
assert.equal(selected.embedUrl, `https://www.youtube-nocookie.com/embed/${id}?playsinline=1&rel=0`);
assert.ok(!selected.embedUrl?.includes("autoplay") && !selected.embedUrl?.includes("loop"));
assert.deepEqual(selected.episode?.transcript, current.transcript);
assert.deepEqual(selected.episode?.sources, current.sources);
assert.equal(formatDailyBriefVideoDate("2026-09-03T01:00:00Z"), "September 2, 2026", "Display actual publication date in Eastern time.");
const longForm = getDailyBriefVideoPageData({ channelUrl: null, episodes: [{ ...episode, format: "video" }] }, now);
assert.equal(longForm.watchUrl, `https://www.youtube.com/watch?v=${id}`);
assert.equal(getDailyBriefVideoPageData({ channelUrl: null, episodes: [{ ...episode, sources: [{ label: "Bad URL", url: "javascript:alert(1)" }] }] }, now).episode, null);
assert.equal(getDailyBriefVideoPageData({ channelUrl: null, episodes: [{ ...episode, publishedAt: "2026-09-04T12:00:00Z" }] }, now).episode, null);

assert.equal(isPlanFeatureEnabled("free", "weeklyBrief"), true);
assert.equal(isPlanFeatureEnabled("free", "personalizedBrief"), false);
assert.equal(isPlanFeatureEnabled("pro", "personalizedBrief"), true);
assert.equal(isPlanFeatureEnabled("team", "personalizedBrief"), true);
console.log("Daily Brief video fixtures passed.");
