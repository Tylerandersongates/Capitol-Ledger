import { Chamber, Party, PrismaClient } from "@prisma/client";
import { fetchMembersByCongress } from "@/lib/congress/client";
import { fetchPaginatedMemberRoster, validateCurrentMemberRoster } from "@/lib/congress/member-roster";
import { normalizeCongressMember } from "@/lib/congress/normalizers";
import type { Member } from "@/types/capitol";

const congress = Number(process.env.CONGRESS_SYNC_CONGRESS ?? 119);
const pageSize = Number(process.env.CONGRESS_SYNC_MEMBER_PAGE_LIMIT ?? 250);
const maxPages = Number(process.env.CONGRESS_SYNC_MEMBER_MAX_PAGES ?? 10);

function requireEnvironment() {
  if (!process.env.CONGRESS_API_KEY) throw new Error("CONGRESS_API_KEY is required for the roster audit.");
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for the roster audit.");
}

function increment(counts: Record<string, number>, key: string) {
  counts[key] = (counts[key] ?? 0) + 1;
}

function mappedChamber(chamber: Chamber): Member["chamber"] {
  return chamber === Chamber.HOUSE ? "House" : "Senate";
}

function mappedParty(party: Party): Member["party"] {
  if (party === Party.DEMOCRAT) return "Democrat";
  if (party === Party.REPUBLICAN) return "Republican";
  return "Independent";
}

async function main() {
  requireEnvironment();
  process.env.CAPITOL_LEDGER_ENABLE_DATABASE_READS = "true";
  process.env.CAPITOL_LEDGER_DISABLE_DATABASE_READS = "false";

  const prisma = new PrismaClient();

  try {
    const roster = await fetchPaginatedMemberRoster({
      fetchPage: (offset, limit) => fetchMembersByCongress(congress, { currentMember: true, limit, offset }),
      maxPages,
      pageSize
    });
    const officialMembers = roster.members.map(normalizeCongressMember).filter((member): member is Member => Boolean(member));
    const validation = validateCurrentMemberRoster(officialMembers);
    const officialById = new Map(officialMembers.map((member) => [member.bioguideId, member]));

    const [databaseMembers, allMemberIds, memberSourceLinks, extraActive, inactiveTotal, appData, suggestionsModule] = await Promise.all([
      prisma.member.findMany({
        select: {
          active: true,
          bioguideId: true,
          chamber: true,
          district: true,
          firstName: true,
          fullName: true,
          lastName: true,
          officialUrl: true,
          party: true,
          photoUrl: true,
          rawJson: true,
          sourceUrl: true,
          state: true,
          updatedAt: true
        },
        where: {
          bioguideId: {
            in: validation.activeMemberIds
          }
        }
      }),
      prisma.member.findMany({ select: { bioguideId: true } }),
      prisma.officialSourceLink.findMany({
        select: {
          targetId: true
        },
        where: {
          source: "Congress.gov",
          targetType: "member"
        }
      }),
      prisma.member.count({
        where: {
          active: true,
          bioguideId: {
            notIn: validation.activeMemberIds
          }
        }
      }),
      prisma.member.count({ where: { active: false } }),
      import("@/lib/data"),
      import("@/lib/search-suggestions")
    ]);

    const databaseById = new Map(databaseMembers.map((member) => [member.bioguideId, member]));
    const allMemberIdSet = new Set(allMemberIds.map((member) => member.bioguideId));
    const currentSourceLinkIds = new Set(
      memberSourceLinks.filter((link) => officialById.has(link.targetId)).map((link) => link.targetId)
    );
    const sourceLinkOrphans = memberSourceLinks.filter((link) => !allMemberIdSet.has(link.targetId)).length;
    const mismatches: Record<string, number> = {};

    officialMembers.forEach((official) => {
      const stored = databaseById.get(official.bioguideId);
      if (!stored) return;

      if (stored.active !== official.active) increment(mismatches, "active");
      if (mappedChamber(stored.chamber) !== official.chamber) increment(mismatches, "chamber");
      if ((stored.district ?? undefined) !== official.district) increment(mismatches, "district");
      if (stored.firstName !== official.firstName) increment(mismatches, "firstName");
      if (stored.fullName !== official.fullName) increment(mismatches, "fullName");
      if (stored.lastName !== official.lastName) increment(mismatches, "lastName");
      if (mappedParty(stored.party) !== official.party) increment(mismatches, "party");
      if ((stored.photoUrl ?? undefined) !== official.photoUrl) increment(mismatches, "photoUrl");
      if ((stored.sourceUrl ?? undefined) !== official.sourceUrl) increment(mismatches, "sourceUrl");
      if (stored.state !== official.state) increment(mismatches, "state");
    });

    const completeness = databaseMembers.reduce(
      (result, member) => {
        if (!member.firstName.trim() || !member.lastName.trim() || !member.fullName.trim()) result.missingName += 1;
        if (!member.photoUrl) result.missingPhotoUrl += 1;
        if (!member.rawJson) result.missingRawJson += 1;
        if (!member.sourceUrl) result.missingSourceUrl += 1;
        if (!member.officialUrl) result.missingOfficialUrl += 1;
        if (!/^[A-Z]{2}$/.test(member.state)) result.invalidState += 1;
        if (member.party === Party.UNKNOWN) result.unknownParty += 1;
        if (member.chamber === Chamber.HOUSE && !member.district) result.houseMissingDistrict += 1;
        if (member.chamber === Chamber.SENATE && member.district) result.senateWithDistrict += 1;
        return result;
      },
      {
        houseMissingDistrict: 0,
        invalidState: 0,
        missingName: 0,
        missingOfficialUrl: 0,
        missingPhotoUrl: 0,
        missingRawJson: 0,
        missingSourceUrl: 0,
        senateWithDistrict: 0,
        unknownParty: 0
      }
    );

    const chamberDistribution: Record<string, number> = {};
    const partyDistribution: Record<string, number> = {};
    const stateDistribution: Record<string, number> = {};
    databaseMembers.forEach((member) => {
      increment(chamberDistribution, mappedChamber(member.chamber));
      increment(partyDistribution, mappedParty(member.party));
      increment(stateDistribution, member.state);
    });

    const appMembers = await appData.getAllMembersWithLiveData();
    const appNonOfficial = appMembers.filter((member) => !officialById.has(member.bioguideId));
    const now = Date.now();
    const futureFirstElectionDates = appMembers.filter(
      (member) => member.firstElectedDate && Date.parse(member.firstElectedDate) > now
    );
    const pastNextElectionDates = appMembers.filter(
      (member) => member.nextElectionDate && Date.parse(member.nextElectionDate) < now
    );
    const missingFirstElectionDates = appMembers.filter((member) => !member.firstElectedDate);
    const missingNextElectionDates = appMembers.filter((member) => !member.nextElectionDate);
    const friedmanSearch = await appData.searchRecordsWithLiveData({ q: "Friedman", type: "members" });
    const friedmanSuggestions = await suggestionsModule.getSearchSuggestions({ limit: 8, q: "Friedman", type: "members" });
    const criticalFailures: string[] = [];
    const warnings: string[] = [];

    if (databaseMembers.length !== validation.memberCount) criticalFailures.push("database member coverage");
    if (databaseMembers.some((member) => !member.active)) criticalFailures.push("official member active status");
    if (extraActive !== 0) criticalFailures.push("extra active members");
    if (Object.values(mismatches).some((count) => count > 0)) criticalFailures.push("Congress.gov field parity");
    if (completeness.missingName || completeness.missingRawJson || completeness.missingSourceUrl) {
      criticalFailures.push("required field completeness");
    }
    if (completeness.invalidState || completeness.unknownParty || completeness.senateWithDistrict) criticalFailures.push("domain validity");
    if (currentSourceLinkIds.size !== validation.memberCount || sourceLinkOrphans) criticalFailures.push("member source-link integrity");
    if (appMembers.length !== validation.memberCount || appNonOfficial.length) criticalFailures.push("app roster authority");
    if (friedmanSearch.results.members.length !== 1 || friedmanSearch.results.members[0]?.bioguideId !== "F000483") {
      criticalFailures.push("member search deduplication");
    }
    if (friedmanSuggestions.length !== 1 || friedmanSuggestions[0]?.id !== "F000483") {
      criticalFailures.push("member suggestion deduplication");
    }
    if (futureFirstElectionDates.length || pastNextElectionDates.length) {
      criticalFailures.push("election-date temporal validity");
    }
    if (completeness.missingPhotoUrl) {
      warnings.push(`${completeness.missingPhotoUrl} current member record(s) use the explicit app-logo portrait fallback.`);
    }
    if (completeness.missingOfficialUrl) {
      warnings.push(`${completeness.missingOfficialUrl} current member record(s) rely on live profile hydration or their Congress.gov source URL.`);
    }
    if (missingFirstElectionDates.length || missingNextElectionDates.length) {
      warnings.push(
        `${missingFirstElectionDates.length} first-election and ${missingNextElectionDates.length} next-election dates remain hidden until a verified election source is connected.`
      );
    }

    const updatedTimestamps = databaseMembers.map((member) => member.updatedAt.getTime());
    const result = {
      appReadiness: {
        appMemberCount: appMembers.length,
        appNonOfficialCount: appNonOfficial.length,
        friedmanSearchCount: friedmanSearch.results.members.length,
        friedmanSuggestionCount: friedmanSuggestions.length
      },
      completeness,
      distributions: {
        chamber: chamberDistribution,
        party: partyDistribution,
        stateCount: Object.keys(stateDistribution).length
      },
      freshness: {
        newestUpdatedAt: new Date(Math.max(...updatedTimestamps)).toISOString(),
        oldestUpdatedAt: new Date(Math.min(...updatedTimestamps)).toISOString()
      },
      integrity: {
        databaseMatches: databaseMembers.length,
        extraActive,
        inactiveTotal,
        sourceLinkCoverage: currentSourceLinkIds.size,
        sourceLinkOrphans
      },
      temporalValidity: {
        futureFirstElectionDates: futureFirstElectionDates.length,
        missingFirstElectionDates: missingFirstElectionDates.length,
        missingNextElectionDates: missingNextElectionDates.length,
        pastNextElectionDates: pastNextElectionDates.length
      },
      mismatches,
      officialRoster: {
        advertisedCount: roster.expectedCount,
        houseCount: validation.houseCount,
        memberCount: validation.memberCount,
        pageCount: roster.pageCount,
        senateCount: validation.senateCount
      },
      status: criticalFailures.length ? "failed" : warnings.length ? "passed_with_warnings" : "passed",
      criticalFailures,
      warnings
    };

    console.log(JSON.stringify(result, null, 2));

    if (criticalFailures.length) {
      throw new Error(`Congress roster data-quality audit failed: ${criticalFailures.join(", ")}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
