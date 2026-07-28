import assert from "node:assert/strict";
import { fetchPaginatedBillCatalog, validateCurrentBillCatalog } from "@/lib/congress/bill-catalog";
import type { CongressBillListItem } from "@/lib/congress/client";
import type { Bill } from "@/types/capitol";

function rawBill(type: string, number: string): CongressBillListItem {
  return {
    congress: 119,
    latestAction: {
      actionDate: "2026-07-28",
      text: "Referred to committee."
    },
    number,
    title: `${type} ${number}`,
    type,
    updateDate: "2026-07-28"
  };
}

function normalizedBill(type: string, number: string): Bill {
  return {
    billNumber: number,
    billType: type,
    congress: 119,
    displayNumber: `${type} ${number}`,
    id: `live-119-${type.toLowerCase()}-${number}`,
    latestActionDate: "2026-07-28",
    latestActionText: "Referred to committee.",
    policyArea: "Legislation",
    shortTitle: `${type} ${number}`,
    sourceUrl: `https://www.congress.gov/bill/119th-congress/${type.toLowerCase()}-bill/${number}`,
    summary: "Referred to committee.",
    title: `${type} ${number}`
  };
}

async function main() {
  const requestedOffsets: number[] = [];
  const paginated = await fetchPaginatedBillCatalog({
    fetchPage: async (offset, limit) => {
      requestedOffsets.push(offset);
      assert.equal(limit, 2);

      if (offset === 0) {
        return {
          bills: [rawBill("HR", "1"), rawBill("S", "1")],
          pagination: {
            count: 3,
            next: "https://api.congress.gov/v3/bill/119?limit=2&offset=2"
          }
        };
      }

      return {
        bills: [rawBill("HJRES", "1")],
        pagination: {
          count: 3
        }
      };
    },
    maxPages: 3,
    pageSize: 2
  });

  assert.deepEqual(requestedOffsets, [0, 2], "Bill pagination should follow the advertised next offset.");
  assert.equal(paginated.bills.length, 3, "Bill pagination should combine every unique page.");
  assert.equal(paginated.expectedCount, 3, "Bill pagination should retain the advertised record count.");
  assert.equal(paginated.pageCount, 2, "Bill pagination should report the fetched page count.");

  await assert.rejects(
    () =>
      fetchPaginatedBillCatalog({
        fetchPage: async () => ({
          bills: [rawBill("HR", "1")],
          pagination: { count: 3 }
        }),
        pageSize: 2
      }),
    /instead of the advertised 3/,
    "An incomplete advertised bill catalog must fail closed."
  );

  const completeCatalog = [normalizedBill("HR", "1"), normalizedBill("S", "1"), normalizedBill("HJRES", "1")];
  const validation = validateCurrentBillCatalog(completeCatalog, {
    congress: 119,
    expectedCount: 3,
    maximumBillCount: 5,
    minimumBillCount: 3
  });
  assert.equal(validation.billCount, 3, "Bill validation should report the complete count.");
  assert.deepEqual(validation.billTypeCounts, { HJRES: 1, HR: 1, S: 1 }, "Bill validation should report type coverage.");

  assert.throws(
    () =>
      validateCurrentBillCatalog(completeCatalog.slice(0, 2), {
        congress: 119,
        expectedCount: 3,
        maximumBillCount: 5,
        minimumBillCount: 2
      }),
    /instead of the advertised 3/,
    "Normalized catalog validation should reject incomplete coverage."
  );

  console.log("Congress bill catalog guard passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
