import { readFileSync } from "node:fs";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const briefPage = readFileSync("app/brief/page.tsx", "utf8");
const gdeltClient = readFileSync("lib/gdelt/client.ts", "utf8");
const weeklyBrief = readFileSync("lib/weekly-brief.ts", "utf8");
const appDocsDir = ["Capitol", "Ledger App"].join(" ");
const nextSteps = readFileSync(`${appDocsDir}/Next Steps.md`, "utf8");

assert(briefPage.includes("In-app brief"), "Daily Brief page should present the brief as in-app.");
assert(briefPage.includes("Daily Brief"), "Brief page should present the in-app brief as daily.");
assert(briefPage.includes("Written summary"), "Daily Brief page should include a prose written summary.");
assert(briefPage.includes("DailySourceDigestCard"), "Brief page should include a daily source watch section.");
assert(briefPage.includes("BriefSourceItemLink"), "Daily Brief source items should support external source links.");
assert(briefPage.includes("Official updates and story signals"), "Brief page should surface official updates and story signals.");
assert(briefPage.includes("Brief inputs"), "Daily Brief page should show the data signals behind the in-app brief.");
assert(briefPage.includes("Recent briefs"), "Daily Brief page should surface in-app brief history.");
assert(briefPage.includes("Following officials"), "Daily Brief page should surface followed officials in the in-app watchlist.");
assert(!briefPage.includes("MailCheck"), "Daily Brief action queue should avoid email-delivery iconography for beta.");

assert(weeklyBrief.includes('channel: "In app"'), "Daily Brief model should keep the channel in app.");
assert(weeklyBrief.includes('const defaultCadence = "Daily at 8:00 AM"'), "Brief model should use a daily cadence.");
assert(weeklyBrief.includes("majorStoryCatalog"), "Brief model should define major story watch lanes.");
assert(weeklyBrief.includes("fetchGdeltDailyBriefItems"), "Brief model should fetch GDELT U.S. politics results.");
assert(weeklyBrief.includes("gdelt-media"), "Brief model should label GDELT-backed items.");
assert(weeklyBrief.includes("sourceDigest"), "Brief model should expose daily source digest data.");
assert(weeklyBrief.includes('title: "Source watch"'), "Daily Brief model should label the source digest.");
assert(weeklyBrief.includes("writtenSummary"), "Daily Brief model should expose written summary data.");
assert(weeklyBrief.includes("buildWrittenSummary"), "Daily Brief model should build written summary from account signals.");
assert(weeklyBrief.includes("publicBrandName"), "Daily Brief copy should use the public brand helper.");
assert(weeklyBrief.includes("This brief stays inside ${publicBrandName}"), "Daily Brief copy should explain in-app behavior.");
assert(!weeklyBrief.includes("source-pull"), "Daily Brief copy should avoid internal source-pull language.");
assert(!weeklyBrief.includes("voter-facing"), "Daily Brief summary copy should avoid internal audience labels.");
assert(!weeklyBrief.includes("email-ready later"), "Daily Brief model should not present outbound delivery as part of the beta page.");
assert(!weeklyBrief.includes("future scheduled delivery"), "Daily Brief beta copy should not promise future scheduled delivery in the app surface.");

assert(gdeltClient.includes("sourcecountry:US"), "GDELT client should filter source outlets to the United States.");
assert(gdeltClient.includes("sourcelang:english"), "GDELT client should filter to English-language sources for the first build.");
assert(gdeltClient.includes("GDELT_DAILY_BRIEF_TIMEOUT_MS"), "GDELT client should use a bounded timeout.");
assert(gdeltClient.includes("GDELT_DAILY_BRIEF_CACHE_MS"), "GDELT client should cache Daily Brief GDELT results.");
assert(gdeltClient.includes("mode\", \"artlist\""), "GDELT client should request DOC 2.0 article-list mode.");
assert(!gdeltClient.includes("Promise.all(lanes.map"), "GDELT client should avoid parallel per-lane requests because GDELT rate limits frequent calls.");

assert(nextSteps.includes("Post-Launch Next Build"), "Next Steps should include a post-launch build section.");
assert(nextSteps.includes("Daily Brief outbound delivery"), "Post-launch build should track outbound Daily Brief delivery.");

console.log("Daily Brief in-app guard passed.");
