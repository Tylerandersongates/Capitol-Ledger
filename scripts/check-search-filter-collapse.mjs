import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const searchPage = readFileSync("app/search/page.tsx", "utf8");
const searchSetupChips = readFileSync("components/search-setup-chips.tsx", "utf8");
const smartFilterRowStart = searchPage.indexOf("function SmartFilterRow");
const smartFilterRowEnd = searchPage.indexOf("function FilterChip");
const smartFilterRow = searchPage.slice(smartFilterRowStart, smartFilterRowEnd);

assert.ok(smartFilterRow.includes("<details"), "Smart filter categories should be individually collapsible");
assert.ok(smartFilterRow.includes("<summary"), "Smart filter categories should expose a compact summary row");
assert.ok(smartFilterRow.includes("currentLabel"), "Collapsed filter rows should show the current selection");
assert.ok(smartFilterRow.includes("hasActiveValue"), "Smart filters should compute active state before opening a category");
assert.ok(smartFilterRow.includes("open={hasActiveValue}"), "Only active filter categories should open by default");
assert.ok(smartFilterRow.includes("currentStates"), "State filters should support multiple selected states");
assert.ok(smartFilterRow.includes("group-open:rotate-90"), "Collapsed rows should include an expand/collapse affordance");
assert.ok(smartFilterRow.includes('option.value ?? "all"'), "Expanded rows should still include the All filter option");
assert.ok(
  searchPage.includes('open={(activeType === "members" || hasSmartFilters) && !prioritizeResults}'),
  "Officials search should keep compact filter summaries visible so clearing a state visibly confirms All"
);
assert.ok(
  searchSetupChips.includes("They filter only when selected."),
  "Saved search shortcuts should explain that they are not active filters"
);
assert.ok(
  searchSetupChips.includes("`${district.districtState} officials`"),
  "The district shortcut should identify itself as an Officials search"
);

console.log("Search filter collapse check passed.");
