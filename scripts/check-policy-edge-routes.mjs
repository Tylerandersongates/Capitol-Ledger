#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

const dashboard = read("components/dashboard-client.tsx");
const priorityPage = read("app/priority-feed/page.tsx");
const riskPage = read("app/risk-watch/page.tsx");
const sharedFeed = read("components/policy-edge-feed.tsx");

assert.ok(dashboard.includes('href="/priority-feed"'), "Open Priority Feed should route to the dedicated Priority Feed page");
assert.ok(dashboard.includes('href="/risk-watch"'), "Open Risk Watch should route to the dedicated Risk Watch page");
assert.ok(/href="\/priority-feed"[\s\S]*?Open Priority Feed/.test(dashboard), "Open Priority Feed CTA should use the dedicated route");
assert.ok(/href="\/risk-watch"[\s\S]*?Open Risk Watch/.test(dashboard), "Open Risk Watch CTA should use the dedicated route");
assert.ok(!/href="\/search\?[^"]*"[\s\S]{0,260}Open Priority Feed/.test(dashboard), "Open Priority Feed should not open Search Discovery");
assert.ok(!/href="\/search\?[^"]*"[\s\S]{0,260}Open Risk Watch/.test(dashboard), "Open Risk Watch should not open Search Discovery");

assert.ok(priorityPage.includes('mode="priority"'), "Priority Feed page should render the priority mode");
assert.ok(riskPage.includes('mode="risk"'), "Risk Watch page should render the risk mode");
assert.ok(sharedFeed.includes("Priority Feed") && sharedFeed.includes("Risk Watch"), "Dedicated policy edge feed labels should render");
assert.ok(!priorityPage.includes("redirect(\"/search") && !riskPage.includes("redirect(\"/search"), "Policy edge routes should not redirect to Search");

console.log("Policy edge route check passed.");
