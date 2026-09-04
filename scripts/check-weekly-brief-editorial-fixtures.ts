import assert from "node:assert/strict";
import { buildWeeklyBrief } from "../lib/weekly-brief";
import type { AccountLedgerSnapshot, AccountProfileSnapshot, AccountSubscriptionSnapshot } from "../types/capitol";

const ledger: AccountLedgerSnapshot = {
  follows: [
    { id: "demo-hr-471", type: "bill" },
    { id: "W000821", type: "member" }
  ],
  issueInterests: ["Infrastructure", "Public Safety"],
  readAlerts: [],
  savedAlerts: [],
  updatedAt: "2026-09-03T12:00:00.000Z"
};

const profile: AccountProfileSnapshot = {
  districtCode: "CA-30",
  districtLabel: "California's 30th District",
  districtState: "California",
  notificationPreferences: {
    districtAlerts: true,
    voteReminders: true,
    weeklyBrief: true
  },
  partyAffiliation: "",
  updatedAt: "2026-09-03T12:00:00.000Z"
};

const subscription: AccountSubscriptionSnapshot = {
  cycle: "monthly",
  plan: "pro",
  provider: "demo",
  status: "active",
  updatedAt: "2026-09-03T12:00:00.000Z"
};

const gdeltArticles = [
  {
    domain: "example-one.test",
    id: "story-1",
    issueMatches: ["Infrastructure"],
    seenAt: "2026-09-03T11:00:00.000Z",
    title: "Federal infrastructure topic one",
    url: "https://example-one.test/story"
  },
  {
    domain: "example-two.test",
    id: "story-2",
    issueMatches: ["Public Safety"],
    seenAt: "2026-09-03T10:00:00.000Z",
    title: "Federal public safety topic two",
    url: "https://example-two.test/story"
  },
  {
    domain: "example-three.test",
    id: "story-3",
    issueMatches: ["Federal Policy"],
    seenAt: "2026-09-03T09:00:00.000Z",
    title: "Federal policy topic three",
    url: "https://example-three.test/story"
  },
  {
    domain: "example-four.test",
    id: "story-4",
    issueMatches: ["Federal Policy"],
    seenAt: "2026-09-03T08:00:00.000Z",
    title: "Federal policy topic four",
    url: "https://example-four.test/story"
  }
];

const initialBrief = buildWeeklyBrief({
  gdeltArticles,
  ledger,
  generatedAt: "2026-09-02T12:00:00.000Z",
  profile,
  subscription
});
const previousBrief = structuredClone(initialBrief);
previousBrief.watchlist.bills[0].latestActionDate = "2025-03-01";
previousBrief.watchlist.bills[0].latestActionText = "Earlier official action.";
const brief = buildWeeklyBrief({
  gdeltArticles,
  generatedAt: "2026-09-03T12:00:00.000Z",
  ledger,
  previousBrief,
  profile,
  subscription
});

assert.deepEqual(brief.watchToday.map((item) => item.kind), ["vote", "bill", "official"]);
assert.equal(brief.watchToday.length, 3, "data-rich accounts should receive exactly three typed watch recommendations");
assert.ok(brief.watchToday.every((item) => item.whatHappened && item.whySelected && item.next && item.sourceUrl));
assert.match(brief.watchToday[0].whySelected, /saved|followed issues|official you follow/i);
assert.match(brief.watchToday[1].whySelected, /saved this bill/i);
assert.match(brief.watchToday[2].whySelected, /follow this official/i);
assert.equal(brief.yesterdayInPolitics.length, 3, "previous-day media context should be capped at three topics");
assert.ok(brief.yesterdayInPolitics.every((item) => item.sourceKind === "gdelt-media"));
assert.ok(brief.yesterdayInPolitics.every((item) => item.body.includes("media context")));
assert.ok(brief.watchlistMovement.items.some((item) => item.href === "/bills/demo-hr-471"));
assert.ok(brief.worthCheckingNext.length >= 1 && brief.worthCheckingNext.length <= 2);

const firstBrief = buildWeeklyBrief({ ledger, profile, subscription });
assert.equal(firstBrief.yesterdayInPolitics.length, 0, "the model should not invent previous-day topics when the media pull is empty");
assert.equal(firstBrief.watchlistMovement.items.length, 0);
assert.match(firstBrief.watchlistMovement.summary, /first comparable brief/i);

const unchangedBrief = buildWeeklyBrief({
  ledger,
  previousBrief: firstBrief,
  profile,
  subscription
});
assert.equal(unchangedBrief.watchlistMovement.items.length, 0);
assert.match(unchangedBrief.watchlistMovement.summary, /Nothing meaningful changed/i);

const editorialBrief = buildWeeklyBrief({
  editorialOverride: {
    billId: brief.watchToday.find((item) => item.kind === "bill")?.id.replace("watch-bill-", ""),
    billRationale: "CapitolWonk editors selected this bill because a committee deadline is approaching.",
    officialId: "W000821",
    officialRationale: "CapitolWonk editors selected this official because of the linked legislative activity.",
    voteId: brief.watchToday.find((item) => item.kind === "vote")?.id.replace("watch-vote-", ""),
    voteRationale: "CapitolWonk editors selected this roll call because it may shape the next floor action."
  },
  ledger,
  profile,
  subscription
});
assert.match(editorialBrief.watchToday[0].whySelected, /CapitolWonk editors selected this roll call/);
assert.match(editorialBrief.watchToday[1].whySelected, /CapitolWonk editors selected this bill/);
assert.match(editorialBrief.watchToday[2].whySelected, /CapitolWonk editors selected this official/);

console.log("Daily Brief editorial fixtures passed.");
