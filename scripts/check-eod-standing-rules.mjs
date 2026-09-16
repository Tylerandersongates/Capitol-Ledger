import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const docsDirectory = join(process.cwd(), "docs");
const templatePath = join(docsDirectory, "eod-handoff-template.md");
const promptPath = join(process.cwd(), "Capitol Ledger App", "End of Day Handoff Prompt.md");
const beginMarker = "<!-- BEGIN EOD STANDING RULES -->";
const endMarker = "<!-- END EOD STANDING RULES -->";
const enforcementStart = "2026-09-13";

function standingBlock(path) {
  const source = readFileSync(path, "utf8");
  const begin = source.indexOf(beginMarker);
  const end = source.indexOf(endMarker);
  assert(begin >= 0 && end > begin, `${path}: missing Standing Rules markers`);
  assert.equal(source.indexOf(beginMarker, begin + 1), -1, `${path}: duplicate begin marker`);
  assert.equal(source.indexOf(endMarker, end + 1), -1, `${path}: duplicate end marker`);
  assert(source.slice(0, begin).includes("## Standing Rules"), `${path}: missing Standing Rules heading`);
  return source.slice(begin, end + endMarker.length);
}

const expected = standingBlock(templatePath);
for (const phrase of [
  "Codex makes routine, in-scope decisions",
  "Only major actions need Tyler's exact, action-time approval",
  "Do not re-ask for a completed, verified approval",
  "next best steps",
  "in-app browser open and visible",
  "whole-app diagnostic",
  "Mark live reports resolved only after the fix is verified",
  "CapitolWonk",
  "Daily Brief",
  "Keychain incident is closed",
  "Do not repurchase a subscription",
  "T04 certificate/CSR/private-key/Keychain/profile/signing/device freeze",
  "Keep privacy intake, deletion, retention, operations, monitoring",
  "Do not upload or distribute a build",
  "all unfinished T01–T11/deferred tracks",
  "October 30, 2026 launch target",
  "October 2–6 owner-availability buffer",
]) {
  assert(expected.includes(phrase), `template dropped carry-forward rule: ${phrase}`);
}

const handoffs = readdirSync(docsDirectory)
  .map((file) => ({ file, date: /^eod-handoff-(\d{4}-\d{2}-\d{2})\.md$/.exec(file)?.[1] }))
  .filter(({ date }) => date && date >= enforcementStart)
  .sort((a, b) => a.date.localeCompare(b.date));

assert(handoffs.length >= 2, "expected September 13 and 14 handoffs");
for (const { file } of handoffs) {
  const path = join(docsDirectory, file);
  assert.equal(standingBlock(path), expected, `${file}: Standing Rules differ from the template`);
}

const prompt = readFileSync(promptPath, "utf8");
assert(prompt.includes("Copy its full marked Standing Rules block verbatim"), "EOD prompt must require the full block");
assert(prompt.includes("node scripts/check-eod-standing-rules.mjs"), "EOD prompt must require the check");

console.log(`EOD standing rules: template, prompt, and ${handoffs.length} dated handoffs pass.`);
