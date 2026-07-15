import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const memberPage = readFileSync("app/members/[bioguideId]/page.tsx", "utf8");
const memberEmailAction = readFileSync("components/member-email-action.tsx", "utf8");

const headerStart = memberPage.indexOf('<div id="contact"');
const headerEnd = memberPage.indexOf("</section>", headerStart);
const headerBlock = memberPage.slice(headerStart, headerEnd);

assert.ok(
  memberPage.includes("const officialWebsiteUrl = member.officialUrl ?? member.sourceUrl;"),
  "Member profile header should resolve the official website link with a safe source fallback."
);
assert.ok(headerBlock.includes("grid grid-cols-2 gap-2"), "Member profile actions should use an even two-column grid.");
assert.ok(headerBlock.includes("{member.party}"), "Member profile actions should keep the affiliation pill.");
assert.ok(headerBlock.includes("MemberEmailAction") && headerBlock.includes('className="w-full"'), "Member profile message action should align with the affiliation pill.");
assert.ok(headerBlock.includes('href={officialWebsiteUrl}'), "Member profile actions should include a website link.");
assert.ok(headerBlock.includes("col-span-2"), "Member website pill should sit evenly below affiliation and message.");
assert.ok(headerBlock.includes("<span>Website</span>"), "Member website pill should have a concise label.");
assert.ok(memberEmailAction.includes("min-h-10 w-full items-center justify-center"), "Member message button should support full-width profile-grid alignment.");

console.log("Member profile actions guard passed.");
