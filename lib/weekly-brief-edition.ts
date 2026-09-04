import { randomUUID } from "crypto";
import type { WeeklyBriefSnapshot } from "@/lib/weekly-brief";

export const defaultDailyBriefTimeZone = "America/New_York";

export type WeeklyBriefEditionRecord = {
  editionDate: string;
  generatedAt: string;
  id: string;
  snapshot: WeeklyBriefSnapshot;
  userId: string;
};

declare global {
  // eslint-disable-next-line no-var
  var __capitolLedgerWeeklyBriefEditionStore: Map<string, WeeklyBriefEditionRecord> | undefined;
}

const editionStore = globalThis.__capitolLedgerWeeklyBriefEditionStore ?? new Map<string, WeeklyBriefEditionRecord>();
globalThis.__capitolLedgerWeeklyBriefEditionStore = editionStore;

function editionKey(userId: string, editionDate: string) {
  return `${userId}:${editionDate}`;
}

export function normalizeDailyBriefTimeZone(value?: string) {
  const candidate = value?.trim() || defaultDailyBriefTimeZone;

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: candidate }).format(new Date());
    return candidate;
  } catch {
    return defaultDailyBriefTimeZone;
  }
}

export function getDailyBriefEditionDate(date = new Date(), timeZone = defaultDailyBriefTimeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone: normalizeDailyBriefTimeZone(timeZone),
    year: "numeric"
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${value.year}-${value.month}-${value.day}`;
}

export function getDailyBriefLocalHour(date = new Date(), timeZone = defaultDailyBriefTimeZone) {
  const hour = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    hourCycle: "h23",
    timeZone: normalizeDailyBriefTimeZone(timeZone)
  }).formatToParts(date).find((part) => part.type === "hour")?.value;

  return Number(hour ?? 0);
}

export function isDailyBriefGenerationWindow(date = new Date(), timeZone = defaultDailyBriefTimeZone) {
  return getDailyBriefLocalHour(date, timeZone) >= 8;
}

export function normalizeWeeklyBriefEditionRecord(
  userId: string,
  value: Partial<WeeklyBriefEditionRecord> & Pick<WeeklyBriefEditionRecord, "editionDate" | "snapshot">
): WeeklyBriefEditionRecord {
  return {
    editionDate: value.editionDate,
    generatedAt: value.generatedAt ?? value.snapshot.generatedAt,
    id: value.id ?? randomUUID(),
    snapshot: value.snapshot,
    userId
  };
}

export function getWeeklyBriefEdition(userId: string, editionDate: string) {
  return editionStore.get(editionKey(userId, editionDate)) ?? null;
}

export function getPreviousWeeklyBriefEdition(userId: string, beforeEditionDate: string) {
  return [...editionStore.values()]
    .filter((record) => record.userId === userId && record.editionDate < beforeEditionDate)
    .sort((left, right) => right.editionDate.localeCompare(left.editionDate))[0] ?? null;
}

export function setWeeklyBriefEdition(
  userId: string,
  value: Partial<WeeklyBriefEditionRecord> & Pick<WeeklyBriefEditionRecord, "editionDate" | "snapshot">
) {
  const record = normalizeWeeklyBriefEditionRecord(userId, value);
  editionStore.set(editionKey(userId, record.editionDate), record);
  return record;
}
