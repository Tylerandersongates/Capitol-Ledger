#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";

const searchPage = fs.readFileSync("app/search/page.tsx", "utf8");

assert.ok(searchPage.includes("const shouldScroll = count > 2;"), "Search result sections should scroll when more than two records are present");
assert.ok(searchPage.includes('heightClassName="h-[15.75rem]"'), "Search result scroll frames should use a two-result viewport height");
assert.ok(searchPage.includes("MobileGlassScrollFrame"), "Search result sections should use the shared scroll frame");

console.log("Search results scroll check passed.");
