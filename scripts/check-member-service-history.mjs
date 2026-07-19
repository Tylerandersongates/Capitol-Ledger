import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const data = readFileSync("lib/data.ts", "utf8");
const memberPage = readFileSync("app/members/[bioguideId]/page.tsx", "utf8");
const congressClient = readFileSync("lib/congress/client.ts", "utf8");

const deriveTermsStart = data.indexOf("function deriveTermsFromRaw");
const deriveTermsEnd = data.indexOf("function deriveElectionDatesFromRaw");
const deriveTermsBlock = data.slice(deriveTermsStart, deriveTermsEnd);
const deriveElectionDatesStart = data.indexOf("function deriveElectionDatesFromRaw");
const deriveElectionDatesEnd = data.indexOf("function mapDatabaseMember");
const deriveElectionDatesBlock = data.slice(deriveElectionDatesStart, deriveElectionDatesEnd);

const mapDatabaseMemberStart = data.indexOf("function mapDatabaseMember");
const mapDatabaseMemberEnd = data.indexOf("function mapDatabaseBill");
const mapDatabaseMemberBlock = data.slice(mapDatabaseMemberStart, mapDatabaseMemberEnd);

const mergeProfileStart = data.indexOf("function mergeMemberLiveProfile");
const mergeProfileEnd = data.indexOf("async function hydrateMemberDetailWithLiveProfile");
const mergeProfileBlock = data.slice(mergeProfileStart, mergeProfileEnd);

const hydrateProfileStart = data.indexOf("async function hydrateMemberDetailWithLiveProfile");
const hydrateProfileEnd = data.indexOf("function orderMemberLegislationBills");
const hydrateProfileBlock = data.slice(hydrateProfileStart, hydrateProfileEnd);

const memberRenderStart = memberPage.indexOf("export default async function MemberPage");
const memberRenderEnd = memberPage.indexOf("function ProfileStat");
const memberRenderBlock = memberPage.slice(memberRenderStart, memberRenderEnd);
const detailResolutionStart = data.indexOf("export async function getMemberDetailWithLiveData");
const detailResolutionEnd = data.indexOf("async function getDatabaseActiveMembers");
const detailResolutionBlock = data.slice(detailResolutionStart, detailResolutionEnd);

assert.ok(deriveTermsBlock.includes("if (!starts.length) return undefined;"), "Malformed or thin member terms should not invent a term count.");
assert.ok(!mapDatabaseMemberBlock.includes("estimateTermsInOfficeFromCongressLabel"), "Database member mapping should not infer service history from the current Congress label.");
assert.ok(
  mapDatabaseMemberBlock.includes("rawTerms.length ? deriveTermsFromRaw(rawTerms, chamber) : undefined"),
  "Database member mapping should only derive terms from real raw term history."
);
assert.ok(
  deriveElectionDatesBlock.includes("Congress.gov term years describe congressional service intervals"),
  "Database member mapping should document why service years cannot become election dates."
);
assert.ok(!deriveElectionDatesBlock.includes("federalElectionDateIso"), "Congress service years must not be converted into invented election dates.");

assert.ok(hydrateProfileBlock.includes("const liveMember = await getLiveMemberProfile(detail.member.bioguideId);"), "Member detail should request live Congress.gov profile data.");
assert.ok(!hydrateProfileBlock.includes("if (!needsLiveProfile) return detail;"), "Live member profile hydration should not be skipped just because thin local fields are present.");
assert.ok(hydrateProfileBlock.includes("const member = mergeMemberLiveProfile(detail.member, liveMember);"), "Live profile data should merge into the rendered member.");
assert.ok(
  mergeProfileBlock.includes("firstElectedDate: liveMember.firstElectedDate ?? member.firstElectedDate"),
  "Live member profile data should be authoritative for first-elected dates when available."
);
assert.ok(
  mergeProfileBlock.includes("termsInOffice: liveMember.termsInOffice ?? member.termsInOffice"),
  "Live member profile data should be authoritative for tenure when available."
);
assert.ok(hydrateProfileBlock.includes("member\n  };") || hydrateProfileBlock.includes("member\r\n  };"), "Hydrated member should be returned for rendering.");
assert.ok(hydrateProfileBlock.includes("chamberMembers: detail.chamberMembers.map"), "Live profile data should also update the current member in chamber ranking inputs.");
assert.ok(
  detailResolutionBlock.includes("await getLiveMemberDetailData(bioguideId)"),
  "Member detail should fall back to a bounded live Congress.gov profile when optional database reads time out."
);
assert.ok(
  detailResolutionBlock.includes("const [profile, legislation, votes] = await Promise.all(["),
  "Independent member profile, legislation, and vote enrichments should run concurrently."
);
assert.ok(
  detailResolutionBlock.includes("hydrateMemberDetailWithLiveVotes(detail)"),
  "Member detail should request only the vote source for the member's chamber."
);
assert.ok(
  !detailResolutionBlock.includes("const detailWithProfile = await hydrateMemberDetailWithLiveProfile"),
  "Member detail should not serialize independent live enrichment requests."
);

assert.ok(memberRenderBlock.includes("const termsInOffice = member.termsInOffice;"), "Member profile display should use hydrated service history directly.");
assert.ok(
  !memberRenderBlock.includes("const termsInOffice = member.termsInOffice ?? estimateTermsInOfficeFromCongressLabel"),
  "Member profile display should not fall back to a fake current-Congress term count."
);
assert.ok(!memberRenderBlock.includes("fallbackNextElectionDate"), "Member profiles should not invent an election date when no verified date is available.");

assert.ok(
  congressClient.includes("export async function fetchMember(bioguideId: string, options: CongressFetchOptions = {})"),
  "Congress member-detail fetch should support bounded live profile hydration."
);

console.log("Member service-history guard passed.");
