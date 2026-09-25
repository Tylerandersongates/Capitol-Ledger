#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import { tsImport } from "tsx/esm/api";

const {
  calculateAllTimeActionCount,
  calculateConsecutiveActivityStreak,
  calculateGamificationMonthMetrics,
  calculateGamificationScore,
  civicActivityMetricContract,
  getBadgeCollections,
  getCivicLevelProgress,
  getGamificationEventRule,
  getGamificationEventRules,
  getGamificationSummary,
  getImpactActions,
  getSupportedBadgeCatalog,
  getUnsupportedBadgeCatalog
} = await tsImport("../lib/gamification.ts", import.meta.url);
const { applyAccountGamificationEvent, normalizeAccountGamification } = await tsImport("../lib/account-gamification.ts", import.meta.url);

const productionAuditCounts = [
  { event: "complete-onboarding", count: 1 },
  { event: "complete-voter-registration", count: 1 },
  { event: "track-bill", count: 1 },
  { event: "review-vote", count: 2 },
  { event: "participate-election", count: 1 },
  { event: "read-alert", count: 3 },
  { event: "open-official-source", count: 2 },
  { event: "save-official", count: 3 }
];

assert.equal(calculateGamificationScore(productionAuditCounts), 440, "The audited event counts should reconcile to 440 all-time points");
assert.equal(calculateAllTimeActionCount(productionAuditCounts), 14, "Every accepted event count should contribute to the all-time action total");

const impactActions = getImpactActions(productionAuditCounts);
assert.deepEqual(
  impactActions.map(({ id, value }) => ({ id, value })),
  [
    { id: "letters-sent", value: 0 },
    { id: "bills-tracked", value: 1 },
    { id: "votes-cast", value: 3 },
    { id: "comments-completed", value: 0 }
  ],
  "The selected impact breakdown should remain a four-category subset"
);
assert.equal(impactActions.reduce((total, action) => total + action.value, 0), 4, "The selected subtotal must stay distinct from 14 all-time actions");

assert.deepEqual(
  getCivicLevelProgress(440),
  { level: 3, levelTitle: "Issue Tracker", nextLevelScore: 750, xpProgress: 11 },
  "Level 3 progress should be measured inside the 400–750 tier"
);
assert.equal(getCivicLevelProgress(399).xpProgress, 99, "Progress must not reach 100% before the next threshold");
assert.equal(getCivicLevelProgress(400).xpProgress, 0, "A new tier should begin at 0% within that tier");
assert.equal(getCivicLevelProgress(750).level, 4, "The next threshold should activate the next level");
assert.equal(getCivicLevelProgress(7500).xpProgress, 100, "The maximum level should remain complete");

const septemberMetrics = calculateGamificationMonthMetrics(
  [
    { event: "track-bill", count: 1, dateKey: "2026-08-31" },
    { event: "review-vote", count: 2, dateKey: "2026-09-01" },
    { event: "read-alert", count: 3, dateKey: "2026-09-30" },
    { event: "contact-representative", count: 1, dateKey: "2026-10-01" },
    { event: "track-bill", count: 99, dateKey: "2026-09-31" }
  ],
  "2026-09"
);
assert.deepEqual(septemberMetrics, { actionCount: 5, points: 100 }, "Month metrics should include only valid dated records inside the requested calendar month");
assert.deepEqual(calculateGamificationMonthMetrics([], "2026-13"), { actionCount: 0, points: 0 }, "Invalid month keys should not produce metrics");

const activityDates = ["2026-08-31", "2026-09-01", "2026-09-02", "2026-09-02"];
assert.equal(calculateConsecutiveActivityStreak(activityDates, "2026-09-02"), 3, "Duplicate events on one date should count once across a month boundary");
assert.equal(calculateConsecutiveActivityStreak(activityDates, "2026-09-03"), 3, "Yesterday's activity should keep the current streak alive through today");
assert.equal(calculateConsecutiveActivityStreak(activityDates, "2026-09-04"), 0, "A missed day should reset the current streak");
assert.equal(calculateConsecutiveActivityStreak(["2026-09-17", "2026-09-19"], "2026-09-19"), 1, "A gap should end the earlier run");
assert.equal(calculateConsecutiveActivityStreak(["2026-09-20"], "invalid"), 0, "Invalid as-of dates should not produce a streak");

const earningPathIds = new Set(
  getGamificationEventRules().flatMap((rule) => rule.badgeProgress.map((progress) => progress.badgeId))
);
const supportedBadgeIds = new Set(getSupportedBadgeCatalog().map((badge) => badge.id));
assert.deepEqual(supportedBadgeIds, earningPathIds, "Every displayed badge should have a deterministic earning path, with no hidden reachable badge");
assert.deepEqual(
  getUnsupportedBadgeCatalog().map((badge) => badge.id).sort(),
  [
    "ballot-veteran",
    "civic-luminary",
    "coalition-builder",
    "committee-pro",
    "committee-watcher",
    "constitution-champion",
    "local-builder",
    "policy-architect",
    "policy-expert",
    "super-voter",
    "transparency-ally",
    "voter"
  ],
  "Catalog-only and election-self-report badge concepts should remain hidden until real earning paths exist"
);

const badgeCollections = getBadgeCollections(["civic-starter", "policy-expert"]);
assert.deepEqual(badgeCollections.earnedBadges.map((badge) => badge.id), ["civic-starter"], "Unsupported badge IDs should not appear even when a legacy snapshot contains one");
assert.equal(badgeCollections.totalBadges, 16, "The badge denominator should include only reachable badges");
assert.equal(getGamificationEventRule("read-alert")?.countLabel, "Alerts opened", "Alert counts should use the literal recorded interaction");
assert.equal(getSupportedBadgeCatalog().find((badge) => badge.id === "civic-streak")?.label, "Alert Reader", "The alert-count badge must not claim a consecutive streak");

const summary = getGamificationSummary(productionAuditCounts, ["civic-starter", "district-finder", "representative-watch", "register-to-vote"]);
assert.equal(summary.totalActions, 14);
assert.equal(summary.totalBadges, 16);
assert.equal(summary.xpProgress, 11);
assert.equal(summary.dayStreak, 0, "An aggregate summary should not invent a consecutive-day streak");
assert.equal(summary.monthlyGain, 0, "An aggregate summary should not invent current-month points");
assert.equal(civicActivityMetricContract.currentMonth.supportedByAccountSnapshot, false, "An undated aggregate must not claim current-month metrics");
assert.equal(civicActivityMetricContract.consecutiveDayStreak.supportedByAccountSnapshot, false, "An aggregate counter must not claim a consecutive streak");

const normalizedAuditSnapshot = normalizeAccountGamification({
  dayStreak: 3,
  earnedBadgeIds: ["civic-starter", "district-finder", "representative-watch", "register-to-vote"],
  eventCounts: productionAuditCounts,
  lastStreakCreditDate: "2026-09-18",
  monthlyGain: 440
});
assert.equal(normalizedAuditSnapshot.civicScore, 440);
assert.equal(normalizedAuditSnapshot.totalActions, 14);
assert.equal(normalizedAuditSnapshot.totalBadges, 16);
assert.equal(normalizedAuditSnapshot.xpProgress, 11);
assert.equal(normalizedAuditSnapshot.dayStreak, 3, "Storage compatibility should preserve the credited-day aggregate without labeling it a streak");
assert.equal(normalizedAuditSnapshot.monthlyGain, 440, "Storage compatibility should preserve the legacy field without displaying it as a month metric");

const nextDayCredit = applyAccountGamificationEvent(normalizedAuditSnapshot, "review-vote", "2026-09-19", true);
assert.equal(nextDayCredit.eventCounts.find((record) => record.event === "review-vote")?.count, 3);
assert.equal(nextDayCredit.civicScore, 475, "A server-owned event command should add exactly the configured event points");
assert.equal(nextDayCredit.dayStreak, 4, "Only the first accepted credit on a date should advance credited activity days");
const sameDayCredit = applyAccountGamificationEvent(nextDayCredit, "open-official-source", "2026-09-19", false);
assert.equal(sameDayCredit.dayStreak, 4, "A second accepted event on one date must not advance credited activity days");
const duplicateOnboardingCredit = applyAccountGamificationEvent(nextDayCredit, "complete-onboarding", "2026-09-19", false);
assert.equal(
  duplicateOnboardingCredit.eventCounts.find((record) => record.event === "complete-onboarding")?.count,
  nextDayCredit.eventCounts.find((record) => record.event === "complete-onboarding")?.count,
  "A one-time event already present in an aggregate must not increment again without legacy credit evidence"
);

const visibleGamificationPaths = [
  "app/impact/page.tsx",
  "app/badges/page.tsx",
  "components/dashboard-client.tsx",
  "components/gamification-live-stats.tsx",
  "components/map-account-cards.tsx"
];
const visibleGamificationSource = visibleGamificationPaths.map((path) => fs.readFileSync(path, "utf8")).join("\n");
const liveStatsSource = fs.readFileSync("components/gamification-live-stats.tsx", "utf8");
const electionCardSource = fs.readFileSync("components/election-participation-card.tsx", "utf8");
const alertDetailSource = fs.readFileSync("app/alerts/detail/page.tsx", "utf8");
const gamificationRouteSource = fs.readFileSync("app/api/account/gamification/route.ts", "utf8");
const browserGamificationSource = fs.readFileSync("lib/browser-gamification.ts", "utf8");
const accountDatabaseSource = fs.readFileSync("lib/account-database.ts", "utf8");
const accountGamificationSource = fs.readFileSync("lib/account-gamification.ts", "utf8");
const authFlowSource = fs.readFileSync("components/auth-flow-client.tsx", "utf8");
const demoAuthSource = fs.readFileSync("components/demo-auth-controls.tsx", "utf8");
const gamificationMigrationSource = fs.readFileSync("prisma/migrations/20260919110000_gamification_credit_evidence/migration.sql", "utf8");

for (const unsupportedClaim of ["This month", "this month", "Day Streak", "Current streak", "StreakWeekIndicator"]) {
  assert.ok(!visibleGamificationSource.includes(unsupportedClaim), `Visible gamification source should not claim ${unsupportedClaim}`);
}

assert.ok(visibleGamificationSource.includes("Recorded Actions"), "The dashboard should label the all-time action count explicitly");
assert.ok(visibleGamificationSource.includes("Selected action breakdown"), "The four-category subtotal should be labeled as selected");
assert.match(
  liveStatsSource,
  /export function BadgeProgressMetrics\(\)[\s\S]*?const badgeCollections = getBadgeCollections\(snapshot\.earnedBadgeIds\);/,
  "Every badge-progress helper should filter legacy IDs through the reachable badge collection"
);
assert.ok(!liveStatsSource.includes("snapshot.totalBadges"), "Visible badge progress should not trust a legacy snapshot denominator");
assert.ok(!electionCardSource.includes("setGamificationEventCount"), "The undated election self-report control must stay disabled");
assert.ok(electionCardSource.includes("Election logging is unavailable"), "The election card should explain the honest deferred state");
assert.doesNotMatch(
  alertDetailSource,
  /GamificationEventLink[\s\S]{0,300}contact-representative/,
  "Opening a member contact page must not record a completed representative contact"
);
assert.ok(gamificationRouteSource.includes('body.operation !== "record-event"'), "The account API must reject aggregate snapshot writes");
assert.ok(gamificationRouteSource.includes("const event: GamificationEventType = rule.event"), "The validated event rule must provide the typed server event command");
assert.ok(accountGamificationSource.includes("creditKey: string = event"), "Account-memory credits must accept durable string idempotency keys");
assert.ok(gamificationRouteSource.includes("recordGamificationEventToDatabase"), "Authenticated awards must use the server credit ledger");
assert.ok(gamificationRouteSource.includes("authenticated: true"), "Gamification responses must select account-scoped browser storage");
assert.ok(browserGamificationSource.includes('operation: "record-event"'), "Browser actions must submit one event command");
assert.ok(browserGamificationSource.includes("restoreLastAuthoritativeAccountGamificationSnapshot"), "Failed authenticated credits must roll back to the last server-confirmed snapshot");
assert.ok(!gamificationRouteSource.includes("AccountGamificationSnapshot"), "The mutation route must not accept a client-authored snapshot type");
assert.ok(!authFlowSource.includes('/api/account/gamification'), "Authentication must not import an anonymous aggregate over an account");
assert.ok(!demoAuthSource.includes('/api/account/gamification'), "Demo authentication must not import an anonymous aggregate over an account");
assert.ok(accountDatabaseSource.includes('FOR UPDATE'), "Server credits must serialize on an account lock");
assert.ok(accountDatabaseSource.includes('ON CONFLICT ("userId", "dedupeHash") DO NOTHING'), "Server credits must be idempotent across tabs and devices");
assert.ok(accountDatabaseSource.includes("nextEventCount <= currentEventCount"), "Rejected one-time events must not create false credit evidence");
assert.ok(gamificationMigrationSource.includes('UNIQUE INDEX "AccountGamificationCredit_userId_dedupeHash_key"'), "The database must enforce one durable credit identity per account");
assert.ok(gamificationMigrationSource.includes('ON DELETE CASCADE'), "Account deletion must cascade through gamification credit evidence");

console.log("Civic Activity metric contract check passed.");
