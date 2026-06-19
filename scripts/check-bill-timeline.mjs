import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const billPage = readFileSync("app/bills/[billId]/page.tsx", "utf8");

assert.ok(billPage.includes("function hasCrossChamberAction"), "Bill page should keep timeline cross-chamber detection explicit");
assert.ok(billPage.includes("receivedByOtherChamber"), "Timeline should detect bills received by the other chamber");
assert.ok(billPage.includes('action.includes("read twice") && action.includes("referred")'), "Timeline should treat Senate read-twice referrals as cross-chamber movement");
assert.ok(billPage.includes("originPassageSignal || receivedByOtherChamber || referredInOtherChamber"), "Cross-chamber timeline should not require a linked roll-call vote");
assert.ok(billPage.includes("Referred to ${receivingChamber} committee"), "Cross-chamber timeline should label receiving-chamber committee referrals");
assert.ok(billPage.includes("a linked roll-call for that step is not available yet"), "Timeline should explain inferred passage when no roll call is linked");
assert.ok(!billPage.includes("originPassageVote?.voteDate ?? bill.latestActionDate"), "Timeline should not reuse the Senate action date as a fake House passage date");
assert.ok(billPage.includes('ariaLabel="Legislative timeline stages"'), "Timeline rows should be wrapped in a labeled scroll frame");
assert.ok(billPage.includes('heightClassName="max-h-[430px]"'), "Timeline scroll frame should keep the row list bounded");

console.log("Bill timeline check passed.");
