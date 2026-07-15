import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { buildBillAnalysisSourcePacket, resolveAiBillAnalysis } from "../lib/ai-bill-analysis-agent";
import { buildAiBillAnalysis, type AiBillAnalysis } from "../lib/ai-policy-lens";
import { getBillDetailWithLiveData, getBillSummary } from "../lib/data";

const defaultBillIds = ["demo-hr-22", "demo-hr-471", "demo-s-2237"];

loadLocalEnv();

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const billIds = args.filter((arg) => arg !== "--dry-run" && arg !== "--");
const targetBillIds = billIds.length ? billIds : defaultBillIds;

function loadLocalEnv() {
  if (!existsSync(".env.local")) return;

  const lines = readFileSync(".env.local", "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;

    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    const rawValue = trimmed.slice(index + 1).trim();
    if (!key || process.env[key] !== undefined) continue;

    process.env[key] = rawValue.replace(/^['"]|['"]$/g, "");
  }
}

function normalizedText(value: string) {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function analysisText(analysis: AiBillAnalysis) {
  return [analysis.context, ...analysis.pros, ...analysis.cons].map(normalizedText).join("\n");
}

function assertLiveEnvironment() {
  assert.equal(
    process.env.CAPITOL_LEDGER_AI_BILL_ANALYSIS_PROVIDER,
    "openai",
    "Set CAPITOL_LEDGER_AI_BILL_ANALYSIS_PROVIDER=openai before running the live OpenAI bill-analysis check."
  );
  assert.ok(process.env.OPENAI_API_KEY?.trim(), "Set OPENAI_API_KEY outside source control before running the live OpenAI bill-analysis check.");
}

async function checkBill(billId: string) {
  const detail = await getBillDetailWithLiveData(billId);
  assert.ok(detail, `Bill ${billId} should resolve through demo, database, or live Congress.gov data.`);

  const summary = await getBillSummary(detail.bill);
  const sourcePacket = buildBillAnalysisSourcePacket({
    bill: detail.bill,
    billActions: detail.billActions,
    billVotes: detail.billVotes,
    sourceMatches: detail.sourceMatches,
    summaryText: summary.text
  });
  assert.ok(sourcePacket.sources.length >= 2, `${detail.bill.displayNumber} should provide at least two analysis sources.`);

  if (dryRun) {
    console.log(`PASS ${detail.bill.displayNumber} source packet is ready (${sourcePacket.sources.length} sources).`);
    return null;
  }

  const fallback = buildAiBillAnalysis(detail.bill, summary.text);
  const live = await resolveAiBillAnalysis(detail.bill, {
    billActions: detail.billActions,
    billVotes: detail.billVotes,
    enableLive: true,
    sourceMatches: detail.sourceMatches,
    summaryText: summary.text
  });

  assert.equal(live.pros.length, 3, `${detail.bill.displayNumber} live analysis should include exactly 3 benefits.`);
  assert.equal(live.cons.length, 3, `${detail.bill.displayNumber} live analysis should include exactly 3 drawbacks.`);
  assert.notEqual(
    analysisText(live),
    analysisText(fallback),
    `${detail.bill.displayNumber} returned deterministic fallback output instead of validated live OpenAI output.`
  );

  console.log(`PASS ${detail.bill.displayNumber} live OpenAI analysis validated (${sourcePacket.sources.length} sources).`);
  return analysisText(live);
}

async function main() {
  console.log(dryRun ? "Checking AI bill-analysis source packets" : "Checking live OpenAI bill analysis");

  if (!dryRun) assertLiveEnvironment();

  const liveTexts = (await Promise.all(targetBillIds.map((billId) => checkBill(billId)))).filter(Boolean) as string[];
  if (!dryRun) {
    assert.equal(new Set(liveTexts).size, liveTexts.length, "Live OpenAI analysis should be distinct across the selected bills.");
  }

  console.log(dryRun ? "AI bill-analysis dry run passed." : "Live OpenAI bill-analysis check passed.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
