import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const memberPage = readFileSync("app/members/[bioguideId]/page.tsx", "utf8");

const issueTopicsStart = memberPage.indexOf("<h3 className=\"text-[16px] font-medium text-white\">Your issue evidence</h3>");
const issueTopicsEnd = memberPage.indexOf("</MobileCard>", issueTopicsStart);
const issueTopicsBlock = memberPage.slice(issueTopicsStart, issueTopicsEnd);
const overviewStart = memberPage.indexOf("function OverviewTab");
const overviewEnd = memberPage.indexOf("type AlignmentTopic");
const overviewBlock = memberPage.slice(overviewStart, overviewEnd);
const accountabilityStart = memberPage.indexOf('title="Accountability snapshot"');
const accountabilityBlock = memberPage.slice(Math.max(0, accountabilityStart - 420), accountabilityStart + 120);
const keySignalsStart = memberPage.indexOf('title="Verified public record"');
const keySignalsBlock = memberPage.slice(Math.max(0, keySignalsStart - 420), keySignalsStart + 120);

assert.ok(issueTopicsStart >= 0, "Member overview should render the issue-evidence section.");
assert.ok(
  accountabilityBlock.includes("Verified public records about this ${localOfficialLabel}, with missing evidence kept visible."),
  "Accountability snapshot should explain that missing evidence remains visible."
);
assert.ok(
  keySignalsBlock.includes("What verified evidence is currently available for this ${localOfficialLabel}."),
  "Evidence ledger should use the plain local-official copy."
);
assert.ok(issueTopicsBlock.includes("MobileGlassScrollFrame"), "Issue topics should use the formatted glass scroll frame.");
assert.ok(
  issueTopicsBlock.includes("Saved interests surface relevant records without guessing your policy position."),
  "Issue evidence should not claim that a saved interest establishes policy alignment."
);
assert.ok(issueTopicsBlock.includes('ariaLabel="Issue evidence by saved topic"'), "Issue evidence scroll frame should be labelled for accessibility.");
assert.ok(issueTopicsBlock.includes('heightClassName="max-h-[176px]"'), "Issue topics scroll frame should have a stable compact height.");
assert.ok(issueTopicsBlock.includes("sortedIssueTopics.map"), "Issue topics should render all sorted topics inside the scroll frame.");
assert.ok(!overviewBlock.includes("hiddenIssueTopicCount"), "Issue topics should not use the old expandable hidden-topic list.");
assert.ok(!issueTopicsBlock.includes("<details"), "Issue topics should not nest an expandable list inside the formatted scroll window.");
assert.ok(!overviewBlock.includes('label="Movement"'), "Accountability snapshot must not show inferred movement without historical snapshots.");
assert.ok(!overviewBlock.includes("Standing in chamber"), "Accountability snapshot must not imply a full-chamber rank from a partial cohort.");
assert.ok(!overviewBlock.includes("topicScore"), "Issue evidence must not render an unsupported match percentage.");

console.log("Member issue topics guard passed.");
