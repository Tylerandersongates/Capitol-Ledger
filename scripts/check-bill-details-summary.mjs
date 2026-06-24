import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const billPage = readFileSync("app/bills/[billId]/page.tsx", "utf8");
const summaryCardStart = billPage.indexOf("function BillSummaryCard");
const summaryCardEnd = billPage.indexOf("function AiPolicyLensCard");
const summaryCard = billPage.slice(summaryCardStart, summaryCardEnd);

assert.ok(summaryCard.includes("Summary"), "Details card should keep the summary heading");
assert.ok(summaryCard.includes("summary.label"), "Details card should keep the summary source label");
assert.ok(summaryCard.includes("summary.text"), "Details card should render the summary body");
assert.ok(!summaryCard.includes("{bill.shortTitle}</h2>"), "Bill Summary should not repeat the bill title from the page header");
assert.ok(!summaryCard.includes("{bill.title}</h2>"), "Bill Summary should not repeat the full bill title from the page header");

console.log("Bill details summary check passed.");
