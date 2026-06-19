import { readFileSync } from "node:fs";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const briefPage = readFileSync("app/brief/page.tsx", "utf8");
const weeklyBrief = readFileSync("lib/weekly-brief.ts", "utf8");
const nextSteps = readFileSync("Capitol Ledger App/Next Steps.md", "utf8");

assert(briefPage.includes("In-App Brief"), "Weekly Brief page should present the beta brief as in-app.");
assert(briefPage.includes("Built From"), "Weekly Brief page should show the data signals behind the in-app brief.");
assert(briefPage.includes("Recent Briefs"), "Weekly Brief page should surface in-app brief history.");
assert(briefPage.includes("Following Officials"), "Weekly Brief page should surface followed officials in the in-app watchlist.");
assert(!briefPage.includes("MailCheck"), "Weekly Brief action queue should avoid email-delivery iconography for beta.");

assert(weeklyBrief.includes('channel: "In-app beta"'), "Weekly Brief model should keep beta channel as in-app.");
assert(weeklyBrief.includes("This beta brief stays inside Capitol Ledger"), "Weekly Brief copy should explain in-app beta behavior.");
assert(!weeklyBrief.includes("email-ready later"), "Weekly Brief model should not present outbound delivery as part of the beta page.");

assert(nextSteps.includes("Post-Launch Next Build"), "Next Steps should include a post-launch build section.");
assert(nextSteps.includes("Weekly Brief outbound delivery"), "Post-launch build should track outbound Weekly Brief delivery.");

console.log("Weekly Brief in-app guard passed.");
