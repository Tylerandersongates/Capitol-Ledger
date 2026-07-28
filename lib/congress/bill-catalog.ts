import type { CongressBillListItem, CongressBillListResponse } from "@/lib/congress/client";
import type { Bill } from "@/types/capitol";

export type PaginatedBillCatalogResult = {
  bills: CongressBillListItem[];
  expectedCount?: number;
  pageCount: number;
  rawRecordCount: number;
};

export type BillCatalogValidation = {
  billCount: number;
  billTypeCounts: Record<string, number>;
  congress: number;
};

type FetchBillPage = (offset: number, limit: number) => Promise<CongressBillListResponse>;

type PaginatedBillCatalogOptions = {
  fetchPage: FetchBillPage;
  maxPages?: number;
  pageSize?: number;
};

type ValidateBillCatalogOptions = {
  congress: number;
  expectedCount?: number;
  maximumBillCount?: number;
  minimumBillCount?: number;
};

function billCatalogKey(bill: Pick<CongressBillListItem, "congress" | "number" | "type">) {
  if (!bill.congress || !bill.type || !bill.number) return "";
  return `${bill.congress}:${bill.type.toUpperCase()}:${bill.number}`;
}

function normalizedBillKey(bill: Pick<Bill, "billNumber" | "billType" | "congress">) {
  return `${bill.congress}:${bill.billType.toUpperCase()}:${bill.billNumber}`;
}

function paginationOffset(value?: string) {
  if (!value) return undefined;

  try {
    const offset = Number(new URL(value).searchParams.get("offset"));
    return Number.isInteger(offset) && offset >= 0 ? offset : undefined;
  } catch {
    return undefined;
  }
}

function finalizeCatalog(
  billsByKey: Map<string, CongressBillListItem>,
  expectedCount: number | undefined,
  pageCount: number,
  rawRecordCount: number
): PaginatedBillCatalogResult {
  if (expectedCount !== undefined && billsByKey.size !== expectedCount) {
    throw new Error(`Congress.gov bill pagination ended with ${billsByKey.size} unique bills instead of the advertised ${expectedCount}.`);
  }

  return {
    bills: Array.from(billsByKey.values()),
    expectedCount,
    pageCount,
    rawRecordCount
  };
}

export async function fetchPaginatedBillCatalog({
  fetchPage,
  maxPages = 100,
  pageSize = 250
}: PaginatedBillCatalogOptions): Promise<PaginatedBillCatalogResult> {
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 250) {
    throw new Error("Congress.gov bill catalog page size must be an integer from 1 to 250.");
  }
  if (!Number.isInteger(maxPages) || maxPages < 1 || maxPages > 250) {
    throw new Error("Congress.gov bill catalog max pages must be an integer from 1 to 250.");
  }

  const billsByKey = new Map<string, CongressBillListItem>();
  const visitedOffsets = new Set<number>();
  let expectedCount: number | undefined;
  let offset = 0;
  let rawRecordCount = 0;

  for (let pageIndex = 0; pageIndex < maxPages; pageIndex += 1) {
    if (visitedOffsets.has(offset)) {
      throw new Error(`Congress.gov bill catalog pagination repeated offset ${offset}.`);
    }
    visitedOffsets.add(offset);

    const response = await fetchPage(offset, pageSize);
    const pageBills = response.bills ?? [];
    const advertisedCount = response.pagination?.count;

    if (advertisedCount !== undefined && Number.isInteger(advertisedCount) && advertisedCount >= 0) {
      if (expectedCount !== undefined && expectedCount !== advertisedCount) {
        throw new Error(`Congress.gov bill count changed from ${expectedCount} to ${advertisedCount} during pagination.`);
      }
      expectedCount = advertisedCount;
    }

    rawRecordCount += pageBills.length;
    pageBills.forEach((bill) => {
      const key = billCatalogKey(bill);
      if (key) billsByKey.set(key, bill);
    });

    const nextOffset = paginationOffset(response.pagination?.next);
    if (nextOffset !== undefined) {
      if (nextOffset <= offset) {
        throw new Error(`Congress.gov bill catalog pagination returned non-advancing offset ${nextOffset}.`);
      }
      offset = nextOffset;
      continue;
    }

    const reachedAdvertisedCount = expectedCount !== undefined && billsByKey.size >= expectedCount;
    if (!pageBills.length || pageBills.length < pageSize || reachedAdvertisedCount) {
      return finalizeCatalog(billsByKey, expectedCount, pageIndex + 1, rawRecordCount);
    }

    offset += pageSize;
  }

  throw new Error(`Congress.gov bill catalog exceeded the ${maxPages}-page safety limit.`);
}

export function validateCurrentBillCatalog(
  bills: Bill[],
  {
    congress,
    expectedCount,
    maximumBillCount = 50_000,
    minimumBillCount = 10_000
  }: ValidateBillCatalogOptions
): BillCatalogValidation {
  const uniqueBills = new Map(bills.map((bill) => [normalizedBillKey(bill), bill]));
  if (uniqueBills.size !== bills.length) {
    throw new Error(`Current bill catalog contains ${bills.length - uniqueBills.size} duplicate bill identity record(s).`);
  }
  if (expectedCount !== undefined && bills.length !== expectedCount) {
    throw new Error(`Normalized bill catalog contains ${bills.length} records instead of the advertised ${expectedCount}.`);
  }
  if (bills.length < minimumBillCount || bills.length > maximumBillCount) {
    throw new Error(`Current bill catalog count ${bills.length} is outside the safe range ${minimumBillCount}-${maximumBillCount}.`);
  }

  const wrongCongress = bills.filter((bill) => bill.congress !== congress);
  if (wrongCongress.length) {
    throw new Error(`Current bill catalog contains ${wrongCongress.length} record(s) outside Congress ${congress}.`);
  }

  const invalidRecords = bills.filter(
    (bill) =>
      !bill.billType ||
      !bill.billNumber ||
      !bill.title.trim() ||
      !bill.latestActionText.trim() ||
      !Number.isFinite(Date.parse(bill.latestActionDate)) ||
      !bill.sourceUrl.startsWith("https://www.congress.gov/")
  );
  if (invalidRecords.length) {
    throw new Error(`Current bill catalog contains ${invalidRecords.length} record(s) missing required official data.`);
  }

  const billTypeCounts = bills.reduce<Record<string, number>>((counts, bill) => {
    counts[bill.billType] = (counts[bill.billType] ?? 0) + 1;
    return counts;
  }, {});

  return {
    billCount: bills.length,
    billTypeCounts,
    congress
  };
}
