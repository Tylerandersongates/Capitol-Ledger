#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

const accountGamification = read("lib/account-gamification.ts");
const browserGamification = read("lib/browser-gamification.ts");

assert.ok(
  accountGamification.includes("Math.max(current.dayStreak, Math.min(incoming.dayStreak, current.dayStreak + 1))"),
  "Database gamification merge should allow a same-date streak repair by at most one day"
);
assert.ok(
  browserGamification.includes("creditStreakOnDedupe"),
  "Browser gamification events should support controlled streak credit for deduped actions"
);
assert.ok(
  browserGamification.includes('rule.dedupe === "once-per-target"'),
  "Deduped streak credit should be limited to user actions on previously counted targets"
);
assert.ok(
  browserGamification.includes('recordGamificationEvent("complete-onboarding", district.districtCode, 1, { creditStreakOnDedupe: false })'),
  "Automatic district setup repair should not advance the daily streak when already deduped"
);

console.log("Gamification streak check passed.");
