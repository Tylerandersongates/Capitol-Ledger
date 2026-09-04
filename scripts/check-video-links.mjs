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

const demoData = read("lib/demo-data.ts");
const dataLayer = read("lib/data.ts");
const billPage = read("app/bills/[billId]/page.tsx");
const subscriptionPlans = read("lib/subscription-plans.ts");
const gamification = read("lib/gamification.ts");

const videoUrls = Array.from(demoData.matchAll(/videoUrl:\s*"([^"]+)"/g), (match) => match[1]);
const officialUrls = videoUrls.filter((url) => url.startsWith("https://"));
const billIdsWithVideos = new Set(Array.from(demoData.matchAll(/billId:\s*"([^"]+)"/g), (match) => match[1]));

console.log("Checking CapitolWonk speech/video links");

addCheck("Demo bill video records exist", videoUrls.length >= 3, `${videoUrls.length} video links found`);
addCheck("Video links use secure URLs", officialUrls.length === videoUrls.length, `${officialUrls.length}/${videoUrls.length} links use https`);
addCheck("Multiple bills have video coverage", billIdsWithVideos.size >= 3, `${billIdsWithVideos.size} bills with linked video records`);
addCheck("Data layer exposes bill videos", dataLayer.includes("getBillVideos") && dataLayer.includes("billVideos.filter"), "getBillVideos is wired");
addCheck("Bill detail page renders video card", billPage.includes("VideoCard") && billPage.includes("video.videoUrl"), "VideoCard reads videoUrl");
addCheck("Video links record engagement", billPage.includes("watch-speech-video") && billPage.includes("GamificationEventAnchor"), "video taps feed gamification");
addCheck("Video feature is subscription-gated", billPage.includes('feature="speechVideo"') && subscriptionPlans.includes('id: "speechVideo"'), "speechVideo gate is present");
addCheck("Gamification has video rule", gamification.includes('"watch-speech-video"'), "watch-speech-video event exists");

const failures = checks.filter((check) => !check.passed);

checks.forEach((check) => {
  console.log(`${check.passed ? "PASS" : "WARN"} ${check.name} - ${check.detail}`);
});

if (failures.length) {
  console.error(`Video link readiness needs attention: ${failures.length} check${failures.length === 1 ? "" : "s"} failed.`);
  process.exit(1);
}

console.log("PASS Speech/video links are wired for the current demo build. Vercel only needs the latest deployment.");
