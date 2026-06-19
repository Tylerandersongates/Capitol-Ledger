import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const searchPage = readFileSync("app/search/page.tsx", "utf8");
const smartFilterRowStart = searchPage.indexOf("function SmartFilterRow");
const smartFilterRowEnd = searchPage.indexOf("function FilterChip");
const smartFilterRow = searchPage.slice(smartFilterRowStart, smartFilterRowEnd);

assert.ok(smartFilterRow.includes("<details"), "Smart filter categories should be individually collapsible");
assert.ok(smartFilterRow.includes("<summary"), "Smart filter categories should expose a compact summary row");
assert.ok(smartFilterRow.includes("currentLabel"), "Collapsed filter rows should show the current selection");
assert.ok(smartFilterRow.includes("open={Boolean(currentValue)}"), "Only active filter categories should open by default");
assert.ok(smartFilterRow.includes("group-open:rotate-90"), "Collapsed rows should include an expand/collapse affordance");
assert.ok(smartFilterRow.includes('option.value ?? "all"'), "Expanded rows should still include the All filter option");

console.log("Search filter collapse check passed.");
