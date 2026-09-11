#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const data = readFileSync("lib/data.ts", "utf8");
const searchPage = readFileSync("app/search/page.tsx", "utf8");
const searchSuggestions = readFileSync("lib/search-suggestions.ts", "utf8");
const liveSearchStart = data.indexOf("export async function searchRecordsWithLiveData");
const liveSearchEnd = data.indexOf("export function getDemoStats", liveSearchStart);
const liveSearch = data.slice(liveSearchStart, liveSearchEnd);

assert.ok(liveSearch.includes('mode: "unavailable" as const'), "Customer Search should expose an unavailable live source honestly.");
assert.ok(liveSearch.includes("const results: SearchRecordsResult = { bills: [], members: [], votes: [] };"), "Unavailable Search must return empty customer results.");
assert.ok(!liveSearch.includes("demoResults"), "Customer Search must not merge seeded demo results.");
assert.ok(!liveSearch.includes("mergeBillsByRecordKey"), "Customer bill Search must not merge seeded bill records.");
assert.ok(!liveSearch.includes("mergeMemberRosterWithFallback"), "Customer official Search must not merge seeded officials.");
assert.ok(!liveSearch.includes("mergeBy"), "Customer vote Search must not merge seeded votes.");
assert.ok(searchPage.includes("No live bills are available."), "Bills Search should render an honest unavailable-source state.");
assert.ok(searchPage.includes("No live officials are available."), "Officials Search should render an honest unavailable-source state.");
assert.ok(searchPage.includes("No live votes are available."), "Votes Search should render an honest unavailable-source state.");
assert.ok(data.includes("return liveMembers ?? [];"), "Customer official catalogs must not fall back to seeded members.");
assert.ok(searchSuggestions.includes("getAllMembersWithLiveData"), "Search typeahead must use the customer-safe official catalog.");

console.log("Search live-fallback guard passed.");
