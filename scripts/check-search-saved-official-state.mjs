#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";

const searchPage = fs.readFileSync("app/search/page.tsx", "utf8");
const searchSetupChips = fs.readFileSync("components/search-setup-chips.tsx", "utf8");
const browserAccountProfile = fs.readFileSync("lib/browser-account-profile.ts", "utf8");
const officialStates = fs.readFileSync("lib/official-states.ts", "utf8");

const stateCodes = Array.from(officialStates.matchAll(/\{ code: "([A-Z]{2})", label: "[^"]+" \}/g), (match) => match[1]);

assert.equal(stateCodes.length, 56, "Saved Officials state should include all states and represented jurisdictions");
assert.equal(new Set(stateCodes).size, stateCodes.length, "Saved Officials state options should not contain duplicates");
assert.ok(searchPage.includes("<SearchSetupChips activeType={activeType}"), "Search should give saved topics the active result type");
assert.ok(searchPage.includes("state={searchParams.state}"), "Search should give saved topics the current state override");
assert.ok(searchPage.includes('state: nextStates?.length ? nextStates : "all"'), "The State filter's All option should explicitly save the all-officials selection");
assert.ok(searchSetupChips.includes('id="officials-state"'), "Edit topics should expose an Officials state selector");
assert.ok(searchSetupChips.includes('<option value="all">All</option>'), "The Officials state selector should include All");
assert.ok(searchSetupChips.includes("officialStateOptions.map"), "The Officials state selector should render every supported state");
assert.ok(searchSetupChips.includes("readLocalOfficialSearchState"), "Officials search should read the saved state preference");
assert.ok(searchSetupChips.includes("writeLocalOfficialSearchState"), "Officials search should save state preference changes");
assert.ok(searchSetupChips.includes('const explicitOfficialState = activeType === "members"'), "URL state overrides should apply only to Officials results");
assert.ok(searchSetupChips.includes("router.replace(officialsStateHref"), "Saved Officials state changes should refresh the visible results");
assert.ok(browserAccountProfile.includes("officialSearchStateKey"), "The Officials state preference should be part of local account state");
assert.ok(browserAccountProfile.includes("officialSearchStateKey,"), "Account-state reset should clear the saved Officials state");

console.log("Saved Officials state check passed.");
