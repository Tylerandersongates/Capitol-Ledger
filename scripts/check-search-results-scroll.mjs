#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";

const searchPage = fs.readFileSync("app/search/page.tsx", "utf8");
const dataSource = fs.readFileSync("lib/data.ts", "utf8");
const databaseSearchStart = dataSource.indexOf("async function searchDatabaseRecords");
const memberSearchStart = dataSource.indexOf("prisma.member.findMany", databaseSearchStart);
const memberSearchEnd = dataSource.indexOf("prisma.bill.findMany", memberSearchStart);
const memberSearchQuery = dataSource.slice(memberSearchStart, memberSearchEnd);

assert.ok(searchPage.includes("const shouldScroll = count > 2;"), "Search result sections should scroll when more than two records are present");
assert.ok(searchPage.includes('heightClassName="h-[15.75rem]"'), "Search result scroll frames should use a two-result viewport height");
assert.ok(searchPage.includes("MobileGlassScrollFrame"), "Search result sections should use the shared scroll frame");
assert.ok(dataSource.includes("const maximumMemberSearchResults = 600;"), "Officials search should use the guarded complete-roster ceiling");
assert.ok(
  memberSearchQuery.includes("take: maximumMemberSearchResults"),
  "Officials search should return the complete populated Congress roster instead of the generic 30-result cap"
);

console.log("Search results scroll check passed.");
