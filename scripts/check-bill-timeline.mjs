import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const billPage = readFileSync("app/bills/[billId]/page.tsx", "utf8");

assert.ok(billPage.includes("function hasCrossChamberAction"), "Bill page should keep timeline cross-chamber detection explicit");
assert.ok(billPage.includes("function isFloorActionText"), "Bill page should keep floor-action detection explicit");
assert.ok(billPage.includes("isFloorActionText(action)"), "Progress steps should use bounded floor-action detection");
assert.ok(!billPage.includes('action.includes("consideration") ||'), "Referral text that says 'for consideration' should not be treated as floor action");
assert.ok(billPage.includes("receivedByOtherChamber"), "Timeline should detect bills received by the other chamber");
assert.ok(billPage.includes('action.includes("read twice") && action.includes("referred")'), "Timeline should treat Senate read-twice referrals as cross-chamber movement");
assert.ok(billPage.includes("originPassageSignal || receivedByOtherChamber || referredInOtherChamber"), "Cross-chamber timeline should not require a linked roll-call vote");
assert.ok(billPage.includes("Referred to ${receivingChamber} committee"), "Cross-chamber timeline should label receiving-chamber committee referrals");
assert.ok(billPage.includes("a linked roll-call for that step is not available yet"), "Timeline should explain inferred passage when no roll call is linked");
assert.ok(!billPage.includes("originPassageVote?.voteDate ?? bill.latestActionDate"), "Timeline should not reuse the Senate action date as a fake House passage date");
assert.ok(!billPage.includes("bill.introducedDate ?? bill.latestActionDate"), "Timeline should not reuse the latest action date as a fake introduced date");
assert.ok(billPage.includes('ariaLabel="Bill timeline updates"'), "Timeline should use official action rows as the primary timeline");
assert.ok(!billPage.includes('ariaLabel="Legislative timeline stages"'), "Timeline should not render the old duplicated stage list");
assert.ok(!billPage.includes("activeStepCount"), "Timeline should not render a redundant progress count");
assert.ok(!billPage.includes("completionPercent"), "Timeline should not render a redundant progress bar");
assert.ok(billPage.includes('heightClassName="max-h-[520px]"'), "Timeline official action list should keep the row list bounded");

console.log("Bill timeline check passed.");
