import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const types = readFileSync("types/capitol.ts", "utf8");
const demoData = readFileSync("lib/demo-data.ts", "utf8");
const congressClient = readFileSync("lib/congress/client.ts", "utf8");
const congressNormalizers = readFileSync("lib/congress/normalizers.ts", "utf8");
const data = readFileSync("lib/data.ts", "utf8");
const billPage = readFileSync("app/bills/[billId]/page.tsx", "utf8");

assert.ok(types.includes("export type BillAction"), "Shared Capitol types should include BillAction");
assert.ok(types.includes('timePrecision: "date" | "minute"'), "BillAction should keep date-vs-minute precision");

assert.ok(demoData.includes("export const billActions"), "Demo data should include official bill action rows");
assert.ok(demoData.includes("demo-hr-22-action-20250410-roll-102"), "H.R. 22 demo actions should include the final passage roll call");
assert.ok(demoData.includes("Received in the Senate."), "H.R. 22 demo actions should include Senate receipt");
assert.ok(demoData.includes('time: "11:23am"'), "H.R. 22 action log should preserve minute-level House action times");

assert.ok(congressClient.includes("export async function fetchBillActions"), "Congress client should expose bill action fetching");
assert.ok(congressClient.includes("/actions"), "Congress client should target the bill actions endpoint");
assert.ok(congressNormalizers.includes("normalizeCongressBillAction"), "Congress action normalizer should exist");
assert.ok(congressNormalizers.includes("rollCallFromText"), "Congress action normalizer should detect roll-call references");

assert.ok(data.includes("billActions: BillAction[]"), "Bill detail data should carry bill actions");
assert.ok(data.includes("buildBillActionsForDetail"), "Bill detail data should build an action ledger");
assert.ok(data.includes("fetchOfficialBillActionsForBill"), "Bill detail data should optionally fetch official actions");
assert.ok(data.includes("hydrateBillActionVoteLinks"), "Bill actions should link to vote detail records when possible");
assert.ok(data.includes("getDemoBillActionsForBill"), "Live beta records should be able to reuse matching demo action rows");

assert.ok(billPage.includes("OfficialActionLogCard"), "Timeline tab should render the official action log");
assert.ok(billPage.includes('ariaLabel="Official bill action log"'), "Official action log should be a labeled scroll box");
assert.ok(billPage.includes("Vote Detail"), "Action rows should link roll-call actions to vote detail");
assert.ok(billPage.includes("Date only"), "Action rows should disclose date-only source precision");

console.log("Bill action log check passed.");
