#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";

const component = fs.readFileSync("components/election-participation-card.tsx", "utf8");

assert.ok(component.includes("Election logging is unavailable"), "Election participation must expose the disabled state clearly");
assert.ok(component.includes("verified, dated election catalog"), "Election participation must state the evidence needed before logging returns");
assert.ok(component.includes("legacyElectionEntries"), "Existing undated entries should remain visible as legacy data");
assert.ok(component.includes("not presented as verified participation"), "Legacy entries must not be described as verified participation");
assert.ok(component.includes("do not unlock election badges"), "Legacy entries must not unlock unsupported election badges");
assert.ok(!component.includes("setGamificationEventCount"), "The disabled election card must not mutate Civic Activity totals");
assert.ok(!component.includes("electionLogEntries"), "The UI must not offer undated or future election fixtures for self-reporting");

console.log("Election participation copy check passed.");
