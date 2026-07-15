import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const data = readFileSync("lib/data.ts", "utf8");
const memberPage = readFileSync("app/members/[bioguideId]/page.tsx", "utf8");

const rolesStart = data.indexOf("const memberCaucusMemberships");
const rolesEnd = data.indexOf("const memberIssueScores");
const rolesBlock = data.slice(rolesStart, rolesEnd);

const doggettStart = rolesBlock.indexOf("D000399: [");
const doggettEnd = rolesBlock.indexOf("],\n  S001150", doggettStart);
const doggettBlock = rolesBlock.slice(doggettStart, doggettEnd);

const committeesTabStart = memberPage.indexOf("function CommitteesTab");
const committeesTabEnd = memberPage.indexOf("function FinanceTab");
const committeesTabBlock = memberPage.slice(committeesTabStart, committeesTabEnd);

assert.ok(doggettStart >= 0, "Doggett should have current roles listed in memberCaucusMemberships.");
assert.ok(doggettBlock.includes('caucusName: "House Committee on Ways and Means"'), "Doggett should list Ways and Means full committee membership.");
assert.ok(doggettBlock.includes('caucusName: "Ways and Means Subcommittee on Health"'), "Doggett should list the Ways and Means Health subcommittee.");
assert.ok(doggettBlock.includes('role: "Ranking Member"'), "Doggett should be shown as Ranking Member on the Health subcommittee.");
assert.ok(doggettBlock.includes('caucusName: "Ways and Means Subcommittee on Trade"'), "Doggett should list the Ways and Means Trade subcommittee.");
assert.ok(doggettBlock.includes('caucusName: "Ways and Means Subcommittee on Oversight"'), "Doggett should list the Ways and Means Oversight subcommittee.");
assert.ok(doggettBlock.includes('caucusName: "House Committee on the Budget"'), "Doggett should list House Budget Committee membership.");
assert.ok(!doggettBlock.includes("Tax"), "Doggett should not be listed on Ways and Means Tax for the 119th Congress.");
assert.ok(doggettBlock.includes('verifiedAt: "2026-07-06"'), "Doggett role verification date should be explicit.");
assert.ok(
  committeesTabBlock.includes("{membership.sourceLabel}"),
  "Roles tab should show the specific official roster source for each role."
);
assert.ok(
  committeesTabBlock.includes("grid-cols-[minmax(0,1fr)_auto]"),
  "Roles tab rows should keep long role names from crowding the role pill."
);
assert.ok(
  committeesTabBlock.includes("No source-linked roles yet"),
  "Roles tab should avoid implying sparse role coverage is a broken profile."
);
assert.ok(
  committeesTabBlock.includes("member.officialUrl ?? member.sourceUrl"),
  "Roles tab should give profiles without verified role records an official source link."
);
assert.ok(
  committeesTabBlock.includes("Committee and caucus assignments are pending source review"),
  "Roles tab empty state should be clear when an official has no curated source-linked roles yet."
);

console.log("Member roles guard passed.");
