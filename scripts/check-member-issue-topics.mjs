import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const memberPage = readFileSync("app/members/[bioguideId]/page.tsx", "utf8");

const issueTopicsStart = memberPage.indexOf("<h3 className=\"text-[16px] font-medium text-white\">Issue topics</h3>");
const issueTopicsEnd = memberPage.indexOf("</MobileCard>", issueTopicsStart);
const issueTopicsBlock = memberPage.slice(issueTopicsStart, issueTopicsEnd);
const overviewStart = memberPage.indexOf("function OverviewTab");
const overviewEnd = memberPage.indexOf("type AlignmentTopic");
const overviewBlock = memberPage.slice(overviewStart, overviewEnd);
const accountabilityStart = memberPage.indexOf('title="Accountability snapshot"');
const accountabilityBlock = memberPage.slice(Math.max(0, accountabilityStart - 420), accountabilityStart + 120);
const keySignalsStart = memberPage.indexOf('title="What matters now"');
const keySignalsBlock = memberPage.slice(Math.max(0, keySignalsStart - 420), keySignalsStart + 120);

assert.ok(issueTopicsStart >= 0, "Member overview should render the Issue topics section.");
assert.ok(
  accountabilityBlock.includes("What does the public record say about your ${localOfficialLabel} right now."),
  "Accountability snapshot helper text should use the plain local-official copy."
);
assert.ok(
  keySignalsBlock.includes("What is shaping your ${localOfficialLabel}'s accountability score right now."),
  "What matters now helper text should use the plain local-official copy."
);
assert.ok(issueTopicsBlock.includes("MobileGlassScrollFrame"), "Issue topics should use the formatted glass scroll frame.");
assert.ok(
  issueTopicsBlock.includes("How aligned is your {localOfficialLabel} with the issues you care about."),
  "Issue topics helper text should use the plain alignment copy."
);
assert.ok(issueTopicsBlock.includes('ariaLabel="Issue topic match scores"'), "Issue topics scroll frame should be labelled for accessibility.");
assert.ok(issueTopicsBlock.includes('heightClassName="max-h-[176px]"'), "Issue topics scroll frame should have a stable compact height.");
assert.ok(issueTopicsBlock.includes("sortedIssueTopics.map"), "Issue topics should render all sorted topics inside the scroll frame.");
assert.ok(!overviewBlock.includes("hiddenIssueTopicCount"), "Issue topics should not use the old expandable hidden-topic list.");
assert.ok(!issueTopicsBlock.includes("<details"), "Issue topics should not nest an expandable list inside the formatted scroll window.");

console.log("Member issue topics guard passed.");
