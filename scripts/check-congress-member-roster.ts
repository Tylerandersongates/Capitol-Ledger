import assert from "node:assert/strict";
import type { PrismaClient } from "@prisma/client";
import {
  fetchPaginatedMemberRoster,
  hasCompleteMemberRosterCounts,
  mergeMemberRosterWithFallback,
  validateCurrentMemberRoster
} from "@/lib/congress/member-roster";
import { reconcileCongressMemberRoster } from "@/lib/congress/upserts";
import type { CongressMemberListItem } from "@/lib/congress/client";
import type { Member } from "@/types/capitol";

function rawMember(bioguideId: string): CongressMemberListItem {
  return {
    bioguideId,
    name: `Member ${bioguideId}`,
    state: "CA",
    terms: {
      item: [{ chamber: "House of Representatives", startYear: 2025 }]
    }
  };
}

function normalizedMember(index: number, chamber: Member["chamber"]): Member {
  const bioguideId = `${chamber === "House" ? "H" : "S"}${String(index).padStart(6, "0")}`;
  return {
    active: true,
    bioguideId,
    chamber,
    description: "Current Congress member fixture",
    district: chamber === "House" ? String((index % 50) + 1) : undefined,
    firstName: "Test",
    fullName: `${chamber === "House" ? "Rep." : "Sen."} Test ${index}`,
    lastName: `${index}`,
    party: "Independent",
    sourceUrl: `https://www.congress.gov/member/test/${bioguideId}`,
    state: "CA",
    term: "119th Congress"
  };
}

async function main() {
  const requestedOffsets: number[] = [];
  const paginated = await fetchPaginatedMemberRoster({
    fetchPage: async (offset, limit) => {
      requestedOffsets.push(offset);
      assert.equal(limit, 2);

      if (offset === 0) {
        return {
          members: [rawMember("A000001"), rawMember("B000001")],
          pagination: {
            count: 3,
            next: "https://api.congress.gov/v3/member/congress/119?limit=2&offset=2"
          }
        };
      }

      return {
        members: [rawMember("C000001")],
        pagination: {
          count: 3
        }
      };
    },
    maxPages: 3,
    pageSize: 2
  });

  assert.deepEqual(requestedOffsets, [0, 2], "Roster pagination should follow the advertised next offset.");
  assert.equal(paginated.members.length, 3, "Roster pagination should combine every unique member page.");
  assert.equal(paginated.pageCount, 2, "Roster pagination should report the pages fetched.");
  assert.equal(paginated.expectedCount, 3, "Roster pagination should retain the advertised record count.");

  await assert.rejects(
    () =>
      fetchPaginatedMemberRoster({
        fetchPage: async () => ({
          members: [rawMember("A000001")],
          pagination: { count: 3 }
        }),
        pageSize: 2
      }),
    /below the advertised 3/,
    "An incomplete advertised roster must fail closed."
  );

  const completeRoster = [
    ...Array.from({ length: 410 }, (_, index) => normalizedMember(index, "House")),
    ...Array.from({ length: 95 }, (_, index) => normalizedMember(index, "Senate"))
  ];
  const validation = validateCurrentMemberRoster(completeRoster);
  assert.equal(validation.memberCount, 505, "Complete roster validation should report the active member count.");
  assert.equal(validation.houseCount, 410, "Complete roster validation should report House records separately.");
  assert.equal(validation.senateCount, 95, "Complete roster validation should report Senate records separately.");
  assert.equal(
    hasCompleteMemberRosterCounts({ houseCount: validation.houseCount, memberCount: validation.memberCount, senateCount: validation.senateCount }),
    true,
    "Validated chamber totals should satisfy the reusable roster readiness guard."
  );

  const fallbackDuplicate = { ...completeRoster[0], fullName: "Fallback duplicate" };
  const fallbackOnly = normalizedMember(999, "House");
  assert.deepEqual(
    mergeMemberRosterWithFallback(completeRoster, [fallbackDuplicate, fallbackOnly]),
    completeRoster,
    "A complete live roster must exclude fallback-only and fallback-override records."
  );
  const partialLiveMember = { ...completeRoster[0], fullName: "Authoritative live member" };
  const partialMerge = mergeMemberRosterWithFallback([partialLiveMember], [fallbackDuplicate, fallbackOnly]);
  assert.equal(partialMerge.length, 2, "An incomplete live roster should retain fallback-only records.");
  assert.equal(
    partialMerge.find((member) => member.bioguideId === partialLiveMember.bioguideId)?.fullName,
    "Authoritative live member",
    "Live data must win when an incomplete roster overlaps a fallback record."
  );

  assert.throws(
    () => validateCurrentMemberRoster(completeRoster.slice(0, 100)),
    /outside the safe range/,
    "A partial roster must not pass completeness validation."
  );

  let reconciliationInput: unknown;
  const prismaFixture = {
    member: {
      updateMany: async (input: unknown) => {
        reconciliationInput = input;
        return { count: 2 };
      }
    }
  } as unknown as PrismaClient;

  await assert.rejects(
    () => reconcileCongressMemberRoster(prismaFixture, validation.activeMemberIds.slice(0, 499)),
    /Refusing roster reconciliation/,
    "Roster reconciliation must reject an unsafe active-ID set."
  );
  const reconciliation = await reconcileCongressMemberRoster(prismaFixture, validation.activeMemberIds);
  assert.equal(reconciliation.deactivated, 2, "Roster reconciliation should report deactivated records.");
  assert.ok(reconciliationInput, "Roster reconciliation should execute only after the active-ID guard passes.");

  console.log("Congress member roster guard passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
