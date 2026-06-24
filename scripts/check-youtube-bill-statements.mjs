#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

const checks = [];

function addCheck(name, passed, detail) {
  checks.push({ detail, name, passed });
}

const packageJson = read("package.json");
const videoTypes = read("types/capitol.ts");
const registry = read("lib/official-youtube-channels.ts");
const matching = read("lib/youtube-bill-statements.ts");
const syncScript = read("scripts/sync-youtube-bill-statements.ts");
const billPage = read("app/bills/[billId]/page.tsx");

const verifiedRegistryCount = (registry.match(/verificationStatus: "verified"/g) ?? []).length;

console.log("Checking Capitol Ledger YouTube bill-statement readiness");

addCheck("Verified official-channel registry exists", verifiedRegistryCount >= 7, `${verifiedRegistryCount} verified channels`);
addCheck("Ted Cruz channel is source-verified", registry.includes("UCOTZ-6H1rri1lSsj6IzhUyw") && registry.includes("https://www.cruz.senate.gov/"), "Cruz official site channel wired");
addCheck("Bernie Sanders channel is source-verified", registry.includes("https://www.youtube.com/senatorsanders") && registry.includes("https://www.sanders.senate.gov/"), "Sanders official site channel wired");
addCheck("Elizabeth Warren channel is source-verified", registry.includes("https://www.youtube.com/senelizabethwarren") && registry.includes("https://www.warren.senate.gov/"), "Warren official site channel wired");
addCheck("Demo bill sponsors and cosponsors have coverage", registry.includes("MichaelTMcCaul") && registry.includes("SenatorTimScott") && registry.includes("UC7tXCm8gKlAhTFo2kuf5ylw") && registry.includes("senatorwarnock"), "demo-involved official channels wired");
addCheck("BillVideo can carry YouTube metadata", videoTypes.includes("youtubeVideoId") && videoTypes.includes("matchConfidence") && videoTypes.includes("reviewStatus"), "optional metadata fields present");
addCheck("Matching helper scores bill-specific signals", matching.includes("buildBillStatementSearchTerms") && matching.includes("scoreYoutubeBillStatementMatch") && matching.includes("confidence"), "search terms and confidence scoring wired");
addCheck("Sync script is API-key gated", syncScript.includes("YOUTUBE_API_KEY") && syncScript.includes("skipped API calls"), "no key means no network call");
addCheck("Sync script uses required YouTube endpoints", syncScript.includes('"channels"') && syncScript.includes('"search"') && syncScript.includes('"videos"'), "channels/search/videos endpoints referenced");
addCheck("Sync script writes ignored review artifacts", syncScript.includes("artifacts") && syncScript.includes("youtube-bill-statement-matches.json"), "review artifact path wired");
addCheck("Package scripts expose sync and check", packageJson.includes("youtube-statements:sync") && packageJson.includes("youtube-statements:check"), "npm scripts present");
addCheck("Bill detail page still renders official video actions", billPage.includes("VideoCard") && billPage.includes("watch-speech-video") && billPage.includes("Statements and video"), "official statements card wired");

const failures = checks.filter((check) => !check.passed);

checks.forEach((check) => {
  console.log(`${check.passed ? "PASS" : "WARN"} ${check.name} - ${check.detail}`);
});

if (failures.length) {
  console.error(`YouTube bill-statement readiness needs attention: ${failures.length} check${failures.length === 1 ? "" : "s"} failed.`);
  process.exit(1);
}

console.log("PASS YouTube bill-statement pipeline is ready for API-keyed review sync.");
