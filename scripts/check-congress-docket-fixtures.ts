#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  alignDocketVoteFeedAliases,
  buildDocketSponsorNames,
  getConfiguredCongressDocketCongress,
  mergeRecentAndSavedDocketBills,
  reconcileCongressDocketFreshnessWithVisibleBills,
  resolveCongressDocketFreshness,
  sponsorUnavailableLabel,
  withStableSavedDocketBillId,
  type CongressDocketSyncEvidence
} from "@/lib/congress-docket";
import {
  authorizeCongressDocketSyncTask,
  congressDocketSyncMaximumLimit,
  CongressDocketSyncInputError,
  parseCongressDocketIdempotencyKey,
  parseCongressDocketSyncLimit,
  runCongressDocketSync,
  type CongressDocketSyncClaim,
  type CongressDocketSyncCounts,
  type CongressDocketSyncDependencies
} from "@/lib/congress-docket-sync";
import type { CongressBillListItem } from "@/lib/congress/client";
import type { Bill, Member, Vote } from "@/types/capitol";

function billFixture(index: number, sponsorBioguideId?: string): Bill {
  return {
    billNumber: String(index),
    billType: "HR",
    congress: 119,
    displayNumber: `H.R. ${index}`,
    id: `bill-${index}`,
    latestActionDate: `2026-09-${String((index % 18) + 1).padStart(2, "0")}`,
    latestActionText: "Referred to committee.",
    policyArea: "Government Operations and Politics",
    shortTitle: `Fixture bill ${index}`,
    sourceUrl: `https://www.congress.gov/bill/119th-congress/house-bill/${index}`,
    sponsorBioguideId,
    summary: "Fixture summary.",
    title: `Fixture bill ${index}`
  };
}

function voteFixtureForBill(bill: Bill): Vote {
  return {
    billId: bill.id,
    chamber: "House",
    congress: bill.congress,
    explanation: "Fixture vote.",
    id: `vote-${bill.id}`,
    question: "On Passage",
    result: "Passed",
    rollCall: bill.billNumber,
    sourceUrl: "https://clerk.house.gov/Votes",
    voteDate: "2026-09-19"
  };
}

function memberFixture(bioguideId: string): Member {
  return {
    active: true,
    bioguideId,
    chamber: "House",
    description: "Fixture member.",
    district: "1",
    firstName: "Alex",
    fullName: "Rep. Alex Example",
    lastName: "Example",
    party: "Independent",
    sourceUrl: `https://www.congress.gov/member/${bioguideId}`,
    state: "CA",
    term: "119th Congress"
  };
}

function rawBillFixture(number: number, sponsorBioguideId?: string): CongressBillListItem {
  return {
    congress: 119,
    latestAction: {
      actionDate: "2026-09-19",
      text: "Referred to the House Committee on Oversight and Government Reform."
    },
    number: String(number),
    policyArea: { name: "Government Operations and Politics" },
    sponsors: sponsorBioguideId
      ? [{
          bioguideId: sponsorBioguideId,
          district: 1,
          firstName: "Alex",
          fullName: "Alex Example",
          lastName: "Example",
          party: "Independent",
          state: "CA"
        }]
      : [],
    title: `Fixture bill ${number}`,
    type: "HR",
    updateDate: "2026-09-19"
  };
}

function evidence(
  status: CongressDocketSyncEvidence["status"],
  timestamp: string
): CongressDocketSyncEvidence {
  return {
    ...(status === "succeeded" ? { completedAt: timestamp } : { failedAt: timestamp }),
    congress: 119,
    fetchedBillCount: status === "succeeded" ? 25 : 0,
    id: `${status}-${timestamp}`,
    normalizedBillCount: status === "succeeded" ? 25 : 0,
    requestedLimit: 25,
    status,
    upsertedBillCount: status === "succeeded" ? 25 : 0,
    upsertedMemberCount: status === "succeeded" ? 8 : 0
  };
}

type MemoryRun = {
  attemptCount: number;
  congress: number;
  counts: CongressDocketSyncCounts;
  requestedLimit: number;
  runId: string;
  status: "failed" | "running" | "succeeded";
};

function memoryDependencies({
  failAtomicPersistence = false,
  fetchBillDetail = async (bill: CongressBillListItem) => bill,
  fetchRecentBills,
  fetchSponsorMember = async (bioguideId: string) => memberFixture(bioguideId),
  onPersistSponsors
}: {
  failAtomicPersistence?: boolean;
  fetchBillDetail?: CongressDocketSyncDependencies["fetchBillDetail"];
  fetchRecentBills: CongressDocketSyncDependencies["fetchRecentBills"];
  fetchSponsorMember?: CongressDocketSyncDependencies["fetchSponsorMember"];
  onPersistSponsors?: (sponsors: Member[]) => void;
}) {
  const runs = new Map<string, MemoryRun>();
  let nowTick = 0;
  let persistCalls = 0;
  let visibleBillWrites = 0;

  const dependencies: CongressDocketSyncDependencies = {
    claimRun: async ({ congress, idempotencyKey, requestedLimit }): Promise<CongressDocketSyncClaim> => {
      const existing = runs.get(idempotencyKey);
      if (!existing) {
        const created: MemoryRun = {
          attemptCount: 1,
          congress,
          counts: {
            fetchedBillCount: 0,
            missingSponsorCount: 0,
            normalizedBillCount: 0,
            upsertedBillCount: 0,
            upsertedMemberCount: 0
          },
          requestedLimit,
          runId: `run-${runs.size + 1}`,
          status: "running"
        };
        runs.set(idempotencyKey, created);
        return {
          attemptCount: created.attemptCount,
          congress: created.congress,
          kind: "claimed",
          requestedLimit: created.requestedLimit,
          runId: created.runId
        };
      }
      if (existing.congress !== congress || existing.requestedLimit !== requestedLimit) {
        throw new CongressDocketSyncInputError(
          "Congress docket sync idempotency key is already bound to different sync bounds."
        );
      }
      if (existing.status === "succeeded") {
        return {
          ...existing.counts,
          attemptCount: existing.attemptCount,
          congress: existing.congress,
          kind: "replayed",
          requestedLimit: existing.requestedLimit,
          runId: existing.runId
        };
      }
      if (existing.status === "running") {
        return {
          attemptCount: existing.attemptCount,
          congress: existing.congress,
          kind: "in-progress",
          requestedLimit: existing.requestedLimit,
          runId: existing.runId
        };
      }

      existing.status = "running";
      existing.attemptCount += 1;
      existing.counts = {
        fetchedBillCount: 0,
        missingSponsorCount: 0,
        normalizedBillCount: 0,
        upsertedBillCount: 0,
        upsertedMemberCount: 0
      };
      return {
        attemptCount: existing.attemptCount,
        congress: existing.congress,
        kind: "claimed",
        requestedLimit: existing.requestedLimit,
        runId: existing.runId
      };
    },
    failRun: async (runId, { attemptCount, counts }) => {
      const run = Array.from(runs.values()).find((candidate) => candidate.runId === runId);
      assert.ok(run, "the claimed run should exist before failure recording");
      if (run.attemptCount !== attemptCount || run.status !== "running") return;
      run.status = "failed";
      run.counts = counts;
    },
    fetchBillDetail,
    fetchRecentBills,
    fetchSponsorMember,
    now: () => new Date(1_779_271_200_000 + nowTick++ * 1_000),
    persistBatchAndComplete: async ({ attemptCount, bills, counts, runId, sponsors }) => {
      persistCalls += 1;
      const run = Array.from(runs.values()).find((candidate) => candidate.runId === runId);
      assert.ok(run, "the claimed run should exist before atomic persistence");
      if (run.attemptCount !== attemptCount || run.status !== "running") {
        throw new Error("Congress docket sync completion was rejected for a superseded attempt.");
      }
      if (failAtomicPersistence) throw new Error("synthetic atomic persistence failure");

      const sponsorIds = new Set(
        sponsors.filter((member) => member.active).map((member) => member.bioguideId)
      );
      const completedCounts = {
        ...counts,
        missingSponsorCount: bills.filter(
          (bill) => !bill.sponsorBioguideId || !sponsorIds.has(bill.sponsorBioguideId)
        ).length,
        upsertedBillCount: bills.length,
        upsertedMemberCount: sponsors.length
      };
      onPersistSponsors?.(sponsors);
      visibleBillWrites += bills.length;
      run.status = "succeeded";
      run.counts = completedCounts;
      return completedCounts;
    }
  };

  return {
    dependencies,
    getPersistCalls: () => persistCalls,
    getVisibleBillWrites: () => visibleBillWrites,
    supersedeRun: (idempotencyKey: string) => {
      const run = runs.get(idempotencyKey);
      assert.ok(run, "a running attempt must exist before it can be superseded");
      run.attemptCount += 1;
      run.status = "running";
    },
    runs
  };
}

async function main() {
  const taskRouteSource = readFileSync("app/api/tasks/congress-docket-sync/route.ts", "utf8");
  const docketSource = readFileSync("lib/congress-docket.ts", "utf8");
  const syncSource = readFileSync("lib/congress-docket-sync.ts", "utf8");
  assert.match(taskRouteSource, /process\.env\.CONGRESS_DOCKET_SYNC_SECRET/);
  assert.doesNotMatch(taskRouteSource, /CAPITOL_LEDGER_TASK_SECRET|CRON_SECRET/);
  assert.match(taskRouteSource, /revalidatePath\(path\)/, "successful task writes must invalidate docket views");
  assert.match(syncSource, /prisma\.\$transaction/, "bill, member, and success evidence writes must be atomic");
  assert.match(syncSource, /AND "attemptCount" = \$\{attemptCount\}/, "completion and failure writes must fence stale attempts");
  assert.match(syncSource, /transaction\.member\.findMany/, "missing-sponsor evidence must use post-upsert authoritative member state");
  assert.match(
    syncSource,
    /response\.member \? normalizeCongressMemberDetail\(response\.member\) : null/,
    "bill sponsor list data must not manufacture an active member without authoritative detail"
  );
  assert.match(docketSource, /savedDocketBillReadChunkSize = 100/, "saved bills should be read in bounded chunks");
  assert.doesNotMatch(docketSource, /uniqueTargetIds[\s\S]{0,80}slice\(0, 100\)/, "saved bill inclusion must not truncate the account ledger");
  assert.match(docketSource, /AND "congress" = \$\{congress\}/, "freshness evidence must be scoped to the displayed Congress");
  assert.equal(getConfiguredCongressDocketCongress("120"), 120);
  assert.equal(getConfiguredCongressDocketCongress("invalid"), 119);

  const now = new Date("2026-09-19T18:00:00.000Z");
  const recentSuccess = evidence("succeeded", "2026-09-19T12:00:00.000Z");
  const fresh = resolveCongressDocketFreshness({ available: true, lastSuccess: recentSuccess, now });
  assert.equal(fresh.kind, "fresh");
  assert.match(fresh.label, /Source synced Sep 19, 2026 · 25 bills checked/);
  const unavailableFreshRows = reconcileCongressDocketFreshnessWithVisibleBills(fresh, 0);
  assert.equal(unavailableFreshRows.kind, "unavailable");
  assert.match(unavailableFreshRows.label, /synced bill records unavailable/);
  assert.equal(reconcileCongressDocketFreshnessWithVisibleBills(fresh, 1), fresh);

  const stale = resolveCongressDocketFreshness({
    available: true,
    lastSuccess: evidence("succeeded", "2026-09-17T12:00:00.000Z"),
    now
  });
  assert.equal(stale.kind, "stale");
  assert.match(stale.label, /^Stored activity/);

  const noRun = resolveCongressDocketFreshness({ available: true, now });
  assert.equal(noRun.kind, "not-run");
  assert.match(noRun.label, /no source sync recorded/);

  const latestFailure = resolveCongressDocketFreshness({
    available: true,
    lastFailure: evidence("failed", "2026-09-19T15:00:00.000Z"),
    lastSuccess: recentSuccess,
    now
  });
  assert.equal(latestFailure.kind, "failed");
  assert.match(latestFailure.label, /latest sync failed; last success/);

  const unavailable = resolveCongressDocketFreshness({ available: false, now });
  assert.equal(unavailable.kind, "unavailable");
  assert.match(unavailable.label, /sync evidence unavailable/);

  const knownSponsorBill = billFixture(1, "E000001");
  const missingSponsorBill = billFixture(2, "MISSING001");
  const sponsorNames = buildDocketSponsorNames(
    [knownSponsorBill, missingSponsorBill],
    [memberFixture("E000001")]
  );
  assert.equal(sponsorNames[knownSponsorBill.id], "Rep. Alex Example");
  assert.equal(sponsorNames[missingSponsorBill.id], sponsorUnavailableLabel);

  const recentBills = Array.from({ length: 50 }, (_, index) => billFixture(index + 1));
  const savedOutsideWindow = billFixture(999);
  const mergedBills = mergeRecentAndSavedDocketBills(
    recentBills,
    [recentBills[3], savedOutsideWindow]
  );
  assert.equal(mergedBills.length, 51, "a saved bill outside the recent 50 must remain available");
  assert.ok(mergedBills.some((bill) => bill.id === savedOutsideWindow.id));
  assert.equal(mergedBills.filter((bill) => bill.id === recentBills[3].id).length, 1);
  const databaseBill = { ...billFixture(4), id: "database-row-4" };
  const stableSavedBill = withStableSavedDocketBillId(databaseBill, ["live-119-hr-4"]);
  assert.equal(stableSavedBill.id, "live-119-hr-4", "stored reads must preserve the account's stable bill alias");
  const stableMerged = mergeRecentAndSavedDocketBills([databaseBill], [stableSavedBill]);
  assert.equal(stableMerged.length, 1);
  assert.equal(stableMerged[0].id, "live-119-hr-4", "the saved stable alias must win canonical deduplication");
  const alignedVoteFeed = alignDocketVoteFeedAliases(
    [{ bill: databaseBill, vote: { ...voteFixtureForBill(databaseBill), billId: databaseBill.id } }],
    stableMerged
  );
  assert.equal(alignedVoteFeed[0].bill?.id, "live-119-hr-4");
  assert.equal(
    alignedVoteFeed[0].vote.billId,
    "live-119-hr-4",
    "saved-bill vote labeling must use the same stable alias as account follows"
  );

  assert.equal(parseCongressDocketSyncLimit(undefined), 25);
  assert.equal(parseCongressDocketSyncLimit("1"), 1);
  assert.equal(parseCongressDocketSyncLimit(congressDocketSyncMaximumLimit), 50);
  assert.throws(() => parseCongressDocketSyncLimit(0), CongressDocketSyncInputError);
  assert.throws(() => parseCongressDocketSyncLimit(51), CongressDocketSyncInputError);
  assert.throws(() => parseCongressDocketSyncLimit(1.5), CongressDocketSyncInputError);
  assert.equal(parseCongressDocketIdempotencyKey("docket:2026-09-19:01"), "docket:2026-09-19:01");
  assert.throws(() => parseCongressDocketIdempotencyKey("short"), CongressDocketSyncInputError);

  assert.equal(
    authorizeCongressDocketSyncTask({
      actualSecret: "fixture-secret",
      enabledValue: "false",
      expectedSecret: "fixture-secret"
    }).code,
    "CONGRESS_DOCKET_SYNC_DISABLED",
    "only the exact enabled value should expose the task"
  );
  assert.equal(
    authorizeCongressDocketSyncTask({
      actualSecret: "wrong-secret",
      enabledValue: "true",
      expectedSecret: "fixture-secret"
    }).status,
    401
  );
  assert.equal(
    authorizeCongressDocketSyncTask({
      actualSecret: "fixture-secret",
      enabledValue: "true",
      expectedSecret: "fixture-secret"
    }).ok,
    true
  );

  let idempotentFetches = 0;
  const idempotent = memoryDependencies({
    fetchRecentBills: async () => {
      idempotentFetches += 1;
      return [rawBillFixture(1, "E000001"), rawBillFixture(2)];
    }
  });
  const firstRun = await runCongressDocketSync(
    { idempotencyKey: "docket:fixture:success", limit: 2 },
    idempotent.dependencies
  );
  const replayedRun = await runCongressDocketSync(
    { idempotencyKey: "docket:fixture:success", limit: 2 },
    idempotent.dependencies
  );
  assert.equal(firstRun.outcome, "succeeded");
  assert.equal(firstRun.fetchedBillCount, 2);
  assert.equal(firstRun.upsertedMemberCount, 1);
  assert.equal(replayedRun.outcome, "replayed");
  assert.equal(replayedRun.runId, firstRun.runId);
  assert.equal(idempotentFetches, 1, "a successful idempotency key must not fetch twice");
  assert.equal(idempotent.getPersistCalls(), 1, "a successful idempotency key must not write twice");
  await assert.rejects(
    runCongressDocketSync(
      { idempotencyKey: "docket:fixture:success", limit: 1 },
      idempotent.dependencies
    ),
    /already bound to different sync bounds/
  );
  await assert.rejects(
    runCongressDocketSync(
      { congress: 120, idempotencyKey: "docket:fixture:success", limit: 2 },
      idempotent.dependencies
    ),
    /already bound to different sync bounds/
  );
  assert.equal(idempotentFetches, 1, "mismatched idempotency replays must be rejected before fetching");

  let sponsorDetailFetches = 0;
  let sponsorMemberFetches = 0;
  const sponsorEnrichment = memoryDependencies({
    fetchBillDetail: async (bill) => {
      sponsorDetailFetches += 1;
      return { ...bill, sponsors: rawBillFixture(6, "E000001").sponsors };
    },
    fetchRecentBills: async () => [rawBillFixture(6)],
    fetchSponsorMember: async (bioguideId) => {
      sponsorMemberFetches += 1;
      return memberFixture(bioguideId);
    }
  });
  const sponsorEnrichedRun = await runCongressDocketSync(
    { idempotencyKey: "docket:fixture:sponsor-detail", limit: 1 },
    sponsorEnrichment.dependencies
  );
  assert.equal(sponsorDetailFetches, 1, "a list row without sponsors should receive one bounded detail lookup");
  assert.equal(sponsorMemberFetches, 1, "a sponsor ID must receive an authoritative member-detail lookup");
  assert.equal(sponsorEnrichedRun.upsertedMemberCount, 1, "the detail sponsor should enter the live member map");
  assert.equal(sponsorEnrichedRun.missingSponsorCount, 0);

  let persistedInactiveSponsor: Member | undefined;
  const authoritativeInactiveSponsor = memoryDependencies({
    fetchRecentBills: async () => [rawBillFixture(7, "E000002")],
    fetchSponsorMember: async (bioguideId) => ({ ...memberFixture(bioguideId), active: false }),
    onPersistSponsors: (sponsors) => {
      persistedInactiveSponsor = sponsors[0];
    }
  });
  const inactiveSponsorRun = await runCongressDocketSync(
    { idempotencyKey: "docket:fixture:authoritative-inactive", limit: 1 },
    authoritativeInactiveSponsor.dependencies
  );
  assert.equal(
    persistedInactiveSponsor?.active,
    false,
    "authoritative member active state must be preserved instead of forced true"
  );
  assert.equal(inactiveSponsorRun.missingSponsorCount, 1, "inactive sponsors must remain unavailable in live-member evidence");

  const unavailableSponsorSync = memoryDependencies({
    fetchRecentBills: async () => [rawBillFixture(8, "MISSING001")],
    fetchSponsorMember: async () => null
  });
  const unavailableSponsorRun = await runCongressDocketSync(
    { idempotencyKey: "docket:fixture:sponsor-unavailable", limit: 1 },
    unavailableSponsorSync.dependencies
  );
  assert.equal(unavailableSponsorRun.upsertedMemberCount, 0);
  assert.equal(unavailableSponsorRun.missingSponsorCount, 1);

  let retryFetches = 0;
  const retry = memoryDependencies({
    fetchRecentBills: async () => {
      retryFetches += 1;
      if (retryFetches === 1) throw new Error("synthetic upstream failure");
      return [rawBillFixture(3, "E000001")];
    }
  });
  await assert.rejects(
    runCongressDocketSync(
      { idempotencyKey: "docket:fixture:retry", limit: 1 },
      retry.dependencies
    ),
    /synthetic upstream failure/
  );
  assert.equal(retry.runs.get("docket:fixture:retry")?.status, "failed");
  const retried = await runCongressDocketSync(
    { idempotencyKey: "docket:fixture:retry", limit: 1 },
    retry.dependencies
  );
  assert.equal(retried.outcome, "succeeded");
  assert.equal(retried.attemptCount, 2);
  assert.equal(retryFetches, 2);
  assert.equal(retry.getPersistCalls(), 1, "a failed fetch must not reach database persistence");

  const atomicFailure = memoryDependencies({
    failAtomicPersistence: true,
    fetchRecentBills: async () => [rawBillFixture(9, "E000001")]
  });
  await assert.rejects(
    runCongressDocketSync(
      { idempotencyKey: "docket:fixture:atomic-failure", limit: 1 },
      atomicFailure.dependencies
    ),
    /synthetic atomic persistence failure/
  );
  assert.equal(atomicFailure.runs.get("docket:fixture:atomic-failure")?.status, "failed");
  assert.equal(atomicFailure.getVisibleBillWrites(), 0, "a failed atomic commit must expose no bill rows");
  assert.equal(
    atomicFailure.runs.get("docket:fixture:atomic-failure")?.counts.upsertedBillCount,
    0,
    "failure evidence must not claim rolled-back rows"
  );

  let markStaleFetchStarted!: () => void;
  let releaseStaleFetch!: () => void;
  const staleFetchStarted = new Promise<void>((resolve) => {
    markStaleFetchStarted = resolve;
  });
  const staleFetchGate = new Promise<void>((resolve) => {
    releaseStaleFetch = resolve;
  });
  const staleAttempt = memoryDependencies({
    fetchRecentBills: async () => {
      markStaleFetchStarted();
      await staleFetchGate;
      return [rawBillFixture(10, "E000001")];
    }
  });
  const staleWorker = runCongressDocketSync(
    { idempotencyKey: "docket:fixture:stale-fence", limit: 1 },
    staleAttempt.dependencies
  );
  await staleFetchStarted;
  staleAttempt.supersedeRun("docket:fixture:stale-fence");
  releaseStaleFetch();
  await assert.rejects(staleWorker, /superseded attempt/);
  assert.equal(staleAttempt.runs.get("docket:fixture:stale-fence")?.attemptCount, 2);
  assert.equal(staleAttempt.runs.get("docket:fixture:stale-fence")?.status, "running");
  assert.equal(staleAttempt.getVisibleBillWrites(), 0, "a stale worker must not publish rows for a newer attempt");

  let boundedInputCount = 0;
  const bounded = memoryDependencies({
    fetchRecentBills: async (_congress, limit) => {
      boundedInputCount = limit;
      return [rawBillFixture(4), rawBillFixture(5)];
    }
  });
  const boundedRun = await runCongressDocketSync(
    { idempotencyKey: "docket:fixture:bounded", limit: 1 },
    bounded.dependencies
  );
  assert.equal(boundedInputCount, 1);
  assert.equal(boundedRun.fetchedBillCount, 1, "the runner must enforce its limit even if a dependency over-returns");
  assert.equal(boundedRun.upsertedBillCount, 1);

  console.log("Congress docket freshness, sponsor, stable saved-bill, auth, atomicity, stale fencing, bounds, retry, and idempotency fixtures passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
