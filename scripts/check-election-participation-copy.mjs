#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";

const component = fs.readFileSync("components/election-participation-card.tsx", "utf8");

assert.ok(component.includes("remainingElections"), "Election participation helper should explain remaining elections");
assert.ok(component.includes("more unique election"), "Election participation helper should use remaining-count wording");
assert.ok(component.includes('label: "Voter Badge"'), "Election participation helper should identify Voter as a badge");
assert.ok(!component.includes("Log ${voterElectionGoal} of ${totalElectionCount}"), "Election participation helper should not use confusing goal-of-total wording");
assert.ok(component.includes("electionBadgeMilestones"), "Election participation helper should share milestone copy across badge thresholds");
assert.ok(component.includes("<span className=\"block\">{nextElectionBadgeMessage(electionCount)}</span>"), "Election participation helper should always show the countdown");
assert.ok(component.includes("{status ? <span className=\"mt-1 block text-white/48\">{status}</span> : null}"), "Election participation helper should keep action status as secondary text");
assert.ok(!component.includes("status || nextElectionBadgeMessage"), "Election participation helper should not let status replace the countdown");

console.log("Election participation copy check passed.");
