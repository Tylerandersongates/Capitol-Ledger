import assert from "node:assert/strict";
import {
  getDailyBriefEditionDate,
  isDailyBriefGenerationWindow,
  getPreviousWeeklyBriefEdition,
  getWeeklyBriefEdition,
  setWeeklyBriefEdition
} from "../lib/weekly-brief-edition";
import { buildWeeklyBrief } from "../lib/weekly-brief";
import { getDefaultAccountProfile } from "../lib/account-profile";
import { getAccountSubscription } from "../lib/account-subscription";
import { getAccountLedger } from "../lib/account-ledger";

const instant = new Date("2026-09-03T12:30:00.000Z");
assert.equal(getDailyBriefEditionDate(instant, "America/New_York"), "2026-09-03");
assert.equal(getDailyBriefEditionDate(instant, "America/Los_Angeles"), "2026-09-03");
assert.equal(isDailyBriefGenerationWindow(instant, "America/New_York"), true);
assert.equal(isDailyBriefGenerationWindow(instant, "America/Los_Angeles"), false);
assert.equal(getDailyBriefEditionDate(new Date("2026-09-03T02:00:00.000Z"), "America/Los_Angeles"), "2026-09-02");

const snapshot = buildWeeklyBrief({
  generatedAt: instant.toISOString(),
  ledger: getAccountLedger("edition-fixture"),
  profile: getDefaultAccountProfile(),
  subscription: getAccountSubscription("edition-fixture")
});
const first = setWeeklyBriefEdition("edition-fixture", {
  editionDate: "2026-09-02",
  snapshot
});
const current = setWeeklyBriefEdition("edition-fixture", {
  editionDate: "2026-09-03",
  snapshot: { ...snapshot, generatedAt: "2026-09-03T13:00:00.000Z" }
});

assert.equal(getWeeklyBriefEdition("edition-fixture", "2026-09-03")?.id, current.id);
assert.equal(getPreviousWeeklyBriefEdition("edition-fixture", "2026-09-03")?.id, first.id);

console.log("Daily Brief dated-edition fixtures passed.");
