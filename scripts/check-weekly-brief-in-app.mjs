import { readFileSync } from "node:fs";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const briefPage = readFileSync("app/brief/page.tsx", "utf8");
const videoPlayer = readFileSync("components/daily-brief-video.tsx", "utf8");
const proOffer = readFileSync("components/daily-brief-pro-offer.tsx", "utf8");
const dashboard = readFileSync("components/dashboard-client.tsx", "utf8");
const accountApi = readFileSync("app/api/account/weekly-brief/route.ts", "utf8");
const middleware = readFileSync("middleware.ts", "utf8");
const gdeltClient = readFileSync("lib/gdelt/client.ts", "utf8");
const weeklyBrief = readFileSync("lib/weekly-brief.ts", "utf8");
const weeklyBriefEditions = readFileSync("lib/weekly-brief-editions.ts", "utf8");
const appDocsDir = ["Capitol", "Ledger App"].join(" ");
const nextSteps = readFileSync(`${appDocsDir}/Next Steps.md`, "utf8");

assert(briefPage.includes("Daily Brief"), "Brief page should present the in-app brief as daily.");
assert(briefPage.includes("Free for everyone"), "Daily Brief video should be free to all visitors.");
assert(briefPage.includes("<DailyBriefVideo data={video}"), "Daily Brief page should lead with the video briefing.");
assert(!briefPage.includes("requireAccountSession"), "The public video page must not require sign-in.");
assert(briefPage.includes('isPlanFeatureEnabled(subscription.plan, "personalizedBrief")'), "Personalized account details must remain gated separately.");
assert(briefPage.includes('if (!session) return <DailyBriefProOffer />'), "Signed-out visitors should see the Pro expansion without losing video access.");
assert(briefPage.includes('<DailyBriefProOffer initialSubscription={subscription} />'), "Free accounts should see the Pro expansion in place of private content.");
assert(briefPage.includes("isDailyBriefProLayoutPreview((await searchParams)?.preview)"), "The layout demonstration must require explicit local preview configuration.");
assert(briefPage.includes("Pro layout preview · Sample content"), "The demonstration must identify its synthetic content.");
assert(briefPage.includes("<PersonalizedBriefContent brief={edition.snapshot}"), "Paid accounts and the sample must reuse the same Pro rendering components.");
assert(briefPage.indexOf("<DailyBriefVideo data={video}") < briefPage.indexOf("<PersonalizedBrief />"), "The free video must precede the paid expansion.");
assert(proOffer.includes('<details id="personalized-brief" open'), "The offer should be expanded initially and use a native accessible disclosure.");
assert(proOffer.includes('PlanActionButton plan="pro"') && proOffer.includes('PlanPrice plan="pro"'), "The purchase expansion should reuse existing purchase controls and prices.");
assert(proOffer.includes("/sign-in?returnTo=%2Fbrief%23personalized-brief"), "Sign-in must return the visitor to the purchase expansion.");
assert(proOffer.includes("The Daily Brief video, transcript, and sources stay free."), "The offer must distinguish the optional paid feature from the free video.");
assert(accountApi.includes('isPlanFeatureEnabled(subscription.plan, "personalizedBrief")'), "Personalized API must enforce the same entitlement.");
assert(accountApi.includes("status: 403") && accountApi.includes("status: 401"), "Personalized API must reject unauthorized requests.");
assert(middleware.includes('pathname === "/brief"'), "Pending email verification must not block the free video.");
assert(!dashboard.includes('feature="weeklyBrief"'), "The dashboard video link should not be subscription-gated.");
assert(videoPlayer.includes("First video coming soon"), "Missing videos should have an honest empty state.");
assert(videoPlayer.includes("episode && embedUrl ?"), "The player must not load without a validated video.");
assert(videoPlayer.includes("aspect-[9/16] max-w-[225px]"), "Portrait videos should retain 9:16 proportions at about 400px tall.");
assert(videoPlayer.includes("allowFullScreen"), "The compact player must retain its fullscreen option.");
assert(videoPlayer.includes('referrerPolicy="strict-origin-when-cross-origin"'), "YouTube playback requires an identifying referrer.");
assert(!videoPlayer.includes("autoPlay") && !videoPlayer.includes("autoplay"), "Playback must be user initiated.");
assert(videoPlayer.includes("Transcript &amp; sources"), "The free video should include transcript and source sections.");
assert(videoPlayer.includes("Watch on YouTube") && videoPlayer.includes("Subscribe on YouTube"), "Real video and channel links should support direct engagement.");
assert(briefPage.includes("publicBrandName} recommends"), "Daily Brief page should identify CapitolWonk as the recommendation editor.");
assert(briefPage.includes("What to watch"), "Daily Brief page should group vote and bill recommendations.");
assert(briefPage.includes("Who to watch"), "Daily Brief page should group official recommendations.");
assert(briefPage.includes("Recommended to watch—not an endorsement"), "Daily Brief recommendations should explicitly avoid endorsement framing.");
assert(briefPage.includes("What happened"), "Daily Brief watch picks should explain what happened.");
assert(briefPage.includes("Why this"), "Daily Brief watch picks should explain why they were selected.");
assert(briefPage.includes("What may happen next"), "Daily Brief watch picks should explain possible next signals.");
assert(briefPage.includes('<details className="group mt-2" data-brief-recommendation>'), "Each recommendation should keep supporting details collapsed initially.");
assert(briefPage.includes("group-open:line-clamp-none"), "Expanding a pick should expose its complete rationale, not permanently truncate it.");
assert(briefPage.includes("{recommendation.whySelected}</span>"), "Each collapsed pick should retain its personalized rationale.");
assert(!briefPage.includes("grid-cols-[92px_minmax(0,1fr)]"), "Recommendation details should use readable full-width text, not cramped label columns.");
assert(!briefPage.includes("{index + 1} of {total}"), "Recommendations should avoid repeated positional counters.");
assert(briefPage.includes("Yesterday in politics"), "Daily Brief page should include the previous 24-hour politics section.");
assert(briefPage.includes("Your watchlist moved"), "Daily Brief page should include meaningful watchlist movement.");
assert(briefPage.includes("Worth checking next"), "Daily Brief page should end with useful next actions.");
assert(briefPage.includes("BriefSourceItemLink"), "Daily Brief source items should support external source links.");
assert(briefPage.includes("Media context"), "Daily Brief page should label media reporting as context.");
assert(briefPage.includes("official records remain the source of truth"), "Daily Brief page should preserve the official-record trust boundary.");
assert(briefPage.includes("About this brief"), "Daily Brief page should relocate inputs and history to secondary details.");
assert(!briefPage.includes("localDemoCanPreviewBrief"), "Public access must not depend on a local demo bypass.");
assert(!briefPage.includes("MetricGrid"), "Daily Brief reading flow should not contain the old metric grid.");
assert(!briefPage.includes("BriefSignalCard"), "Daily Brief reading flow should not contain the old input dashboard.");
assert(!briefPage.includes("MailCheck"), "Daily Brief action queue should avoid email-delivery iconography for beta.");

assert(weeklyBrief.includes('channel: "In app"'), "Daily Brief model should keep the channel in app.");
assert(weeklyBrief.includes('const defaultCadence = "Daily at 8:00 AM"'), "Brief model should use a daily cadence.");
assert(weeklyBrief.includes("fetchGdeltDailyBriefItems"), "Brief model should fetch GDELT U.S. politics results.");
assert(weeklyBrief.includes("gdelt-media"), "Brief model should label GDELT-backed items.");
assert(weeklyBrief.includes("watchToday"), "Brief model should expose transparent watch recommendations.");
assert(weeklyBrief.includes("watchlistMovement"), "Brief model should expose meaningful movement since the prior brief.");
assert(weeklyBrief.includes("worthCheckingNext"), "Brief model should expose no more than two next actions.");
assert(weeklyBrief.includes("yesterdayInPolitics"), "Brief model should expose the prior 24-hour media context.");
assert(weeklyBrief.includes(".slice(0, 3)"), "Daily Brief model should cap editorial sections at three items.");
assert(weeklyBrief.includes("writtenSummary"), "Daily Brief model should expose written summary data.");
assert(weeklyBrief.includes("buildWrittenSummary"), "Daily Brief model should build written summary from account signals.");
assert(weeklyBrief.includes("publicBrandName"), "Daily Brief copy should use the public brand helper.");
assert(weeklyBrief.includes("This is media context, not a verified official finding"), "Daily Brief model should keep media signals distinct from official facts.");
assert(weeklyBrief.includes("Nothing meaningful changed"), "Daily Brief model should honestly report an unchanged watchlist.");
assert(weeklyBrief.includes("previousBrief.watchlist"), "Daily Brief movement should compare durable item-level snapshots.");
assert(!weeklyBrief.includes("majorStoryCatalog"), "Daily Brief should not present evergreen watch lanes as yesterday's news.");
assert(!weeklyBrief.includes("source-pull"), "Daily Brief copy should avoid internal source-pull language.");
assert(!weeklyBrief.includes("voter-facing"), "Daily Brief summary copy should avoid internal audience labels.");
assert(!weeklyBrief.includes("email-ready later"), "Daily Brief model should not present outbound delivery as part of the beta page.");
assert(!weeklyBrief.includes("future scheduled delivery"), "Daily Brief beta copy should not promise future scheduled delivery in the app surface.");

assert(weeklyBriefEditions.includes("getDailyBriefEditionDate"), "Daily Brief editions should use the reader's dated reporting day.");
assert(weeklyBriefEditions.includes("readPreviousWeeklyBriefEditionFromDatabase"), "Daily Brief editions should load the prior snapshot for comparison.");
assert(weeklyBriefEditions.includes("getDailyBriefEditorialOverride"), "Daily Brief generation should support CapitolWonk editorial pins.");

assert(gdeltClient.includes("sourcecountry:US"), "GDELT client should filter source outlets to the United States.");
assert(gdeltClient.includes("sourcelang:english"), "GDELT client should filter to English-language sources for the first build.");
assert(gdeltClient.includes("GDELT_DAILY_BRIEF_TIMEOUT_MS"), "GDELT client should use a bounded timeout.");
assert(gdeltClient.includes("GDELT_DAILY_BRIEF_CACHE_MS"), "GDELT client should cache Daily Brief GDELT results.");
assert(gdeltClient.includes("mode\", \"artlist\""), "GDELT client should request DOC 2.0 article-list mode.");
assert(!gdeltClient.includes("Promise.all(lanes.map"), "GDELT client should avoid parallel per-lane requests because GDELT rate limits frequent calls.");

assert(nextSteps.includes("Post-Launch Next Build"), "Next Steps should include a post-launch build section.");
assert(nextSteps.includes("Daily Brief outbound delivery"), "Post-launch build should track outbound Daily Brief delivery.");

console.log("Daily Brief in-app guard passed.");
