#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");

const data = read("lib/data.ts");
const mapPage = read("app/map/page.tsx");
const mapCards = read("components/map-account-cards.tsx");
const alertPage = read("app/alerts/page.tsx");
const alertDetail = read("app/alerts/detail/page.tsx");
const alertSummary = read("lib/alert-summary.ts");
const memberPage = read("app/members/[bioguideId]/page.tsx");
const onboardingPage = read("app/onboarding/page.tsx");
const onboardingControls = read("components/account-profile-controls.tsx");
const searchSuggestions = read("lib/search-suggestions.ts");
const accountGamification = read("lib/account-gamification.ts");
const browserGamification = read("lib/browser-gamification.ts");
const teamPage = read("app/team/page.tsx");
const weeklyBrief = read("lib/weekly-brief.ts");

assert.ok(mapPage.includes("getDashboardDataWithLiveData"), "Map must use live dashboard records.");
assert.ok(mapPage.includes("<MapDistrictCard />"), "Map district must come from account state.");
assert.ok(mapPage.includes("<MapTrackedBills bills={trackedBills} />"), "Map tracker must use saved live bills.");
assert.ok(mapPage.includes("<MapCivicScoreCard />"), "Map score must use account gamification.");
assert.ok(mapPage.includes("<MobileAlertsBadge />"), "Map alert badge must use the live alert summary.");
for (const demoText of ["Austin, Texas", "Travis County · TX-10", ">1,250<", "↑ 75 this month", "getDemoStats", "getAllBills"]) {
  assert.ok(!mapPage.includes(demoText), `Map must not contain blank-state fixture: ${demoText}`);
}
assert.ok(mapCards.includes('!record.id.startsWith("demo-")'), "Saved Map bills must reject legacy demo IDs.");
assert.ok(mapCards.includes("No saved bills yet"), "Map must render an honest empty tracker.");

assert.ok(data.includes("return liveMembers ?? [];"), "Customer member catalogs must not fall back to seeded officials.");
assert.ok(searchSuggestions.includes("getAllMembersWithLiveData"), "Search suggestions must use the customer-safe member catalog.");
assert.ok(data.includes('if (voteId.startsWith("demo-")) return null;'), "Demo vote detail URLs must be rejected.");
assert.ok(data.includes('if (billId.startsWith("demo-")) return null;'), "Demo bill detail URLs must be rejected.");
assert.ok(!memberPage.includes('params.bioguideId === "FCA030"'), "The development-only member alias must not be customer reachable.");

assert.ok(alertPage.includes("getRecentUpdatesWithLiveData()"), "Alerts inbox must use live update events.");
assert.ok(alertSummary.includes("getRecentUpdatesWithLiveData()"), "Alert badges must use live update events.");
assert.ok(alertDetail.includes("getDashboardDataWithLiveData()"), "Alert details must use live dashboard data.");
assert.ok(alertDetail.includes("No alert selected"), "Direct alert detail visits need a blank state.");
assert.ok(!alertDetail.includes('member.state === "TX"'), "Alert details must not hardcode a Texas representative.");

assert.ok(accountGamification.includes("const accountCreationDayStreak = 0;"), "New accounts must begin with a zero-day streak.");
assert.ok(accountGamification.includes("hasCivicActions || lastStreakCreditDate"), "Legacy baseline streaks must reset when no activity exists.");
assert.ok(!browserGamification.includes("baselineStreakCredit"), "First-action streak logic must start from zero without a fake baseline.");

assert.ok(onboardingPage.includes("getAllMembersWithLiveData"), "Onboarding must use live official records.");
assert.ok(!onboardingControls.includes("saveDistrictDelegationFollows"), "Choosing a district must not silently seed saved officials.");
assert.ok(onboardingControls.includes("without adding placeholder officials"), "Unavailable onboarding officials need an honest empty state.");

assert.ok(teamPage.includes("getRecentUpdatesWithLiveData"), "Team alerts must not use fixture events.");
assert.ok(teamPage.includes('!record.id.startsWith("demo-")'), "Team watchlists must reject legacy demo bill IDs.");
assert.ok(weeklyBrief.includes("getDashboardDataWithLiveData()"), "Paid Brief generation must use live dashboard data.");
assert.ok(weeklyBrief.includes("getAllMembersWithLiveData()"), "Paid Brief generation must use live officials.");
assert.ok(weeklyBrief.includes("getRecentUpdatesWithLiveData()"), "Paid Brief generation must use live update events.");

console.log("Blank-account demo isolation check passed.");
