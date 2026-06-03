import {
  getGamificationEventRule,
  type GamificationEventType
} from "@/lib/gamification";
import {
  getDefaultAccountGamification,
  normalizeAccountGamification,
  type AccountGamificationSnapshot
} from "@/lib/account-gamification";
import { hasActiveBrowserSession } from "@/lib/browser-auth-state";

export const gamificationChangedEvent = "capitol-ledger:gamification-changed";

const gamificationKey = "capitol-ledger:gamification";
const gamificationDedupeKey = "capitol-ledger:gamification-dedupe";
const gamificationStreakKey = "capitol-ledger:gamification-streak-date";
let gamificationHydrationPromise: Promise<AccountGamificationSnapshot> | null = null;

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined" || !window.localStorage) return fallback;

  try {
    return JSON.parse(window.localStorage.getItem(key) ?? "") as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (typeof window === "undefined" || !window.localStorage) return;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    return;
  }
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function dedupeKey(event: GamificationEventType, targetId?: string) {
  const rule = getGamificationEventRule(event);
  if (!rule || rule.dedupe === "repeatable") return "";
  if (rule.dedupe === "daily") return `${event}:${todayKey()}:${targetId ?? "daily"}`;
  if (rule.dedupe === "once-per-target") return `${event}:${targetId ?? "default"}`;
  return event;
}

function readDedupeKeys() {
  return readJson<string[]>(gamificationDedupeKey, []);
}

function gamificationSignature(snapshot: AccountGamificationSnapshot) {
  const normalized = normalizeAccountGamification(snapshot);
  return JSON.stringify({
    ...normalized,
    earnedBadgeIds: [...normalized.earnedBadgeIds].sort(),
    eventCounts: [...normalized.eventCounts].sort((left, right) => left.event.localeCompare(right.event))
  });
}

function gamificationSnapshotsMatch(left: AccountGamificationSnapshot, right: AccountGamificationSnapshot) {
  return gamificationSignature(left) === gamificationSignature(right);
}

export function readLocalGamificationSnapshot() {
  return normalizeAccountGamification(readJson<Partial<AccountGamificationSnapshot>>(gamificationKey, getDefaultAccountGamification()));
}

export function writeLocalGamificationSnapshot(snapshot: Partial<AccountGamificationSnapshot>) {
  if (typeof window === "undefined") return;

  const next = normalizeAccountGamification(snapshot);
  writeJson(gamificationKey, next);
  window.dispatchEvent(new Event(gamificationChangedEvent));
}

export async function syncGamificationToAccount(snapshot = readLocalGamificationSnapshot()) {
  if (!(await hasActiveBrowserSession())) return null;

  const response = await fetch("/api/account/gamification", {
    body: JSON.stringify(snapshot),
    headers: {
      "Content-Type": "application/json"
    },
    method: "POST"
  }).catch(() => null);

  if (!response?.ok) return null;

  const data = (await response.json().catch(() => null)) as { gamification?: AccountGamificationSnapshot } | null;
  if (!data?.gamification) return null;

  const accountSnapshot = normalizeAccountGamification(data.gamification);
  gamificationHydrationPromise = Promise.resolve(accountSnapshot);
  if (!gamificationSnapshotsMatch(readLocalGamificationSnapshot(), accountSnapshot)) {
    writeLocalGamificationSnapshot(accountSnapshot);
  }
  return accountSnapshot;
}

export async function hydrateGamificationFromAccount() {
  if (typeof window === "undefined") return getDefaultAccountGamification();
  if (!(await hasActiveBrowserSession())) return getDefaultAccountGamification();
  if (gamificationHydrationPromise) return gamificationHydrationPromise;

  gamificationHydrationPromise = hydrateGamificationFromApi();
  return gamificationHydrationPromise;
}

async function hydrateGamificationFromApi() {
  const local = readLocalGamificationSnapshot();

  const response = await fetch("/api/account/gamification", { cache: "no-store" }).catch(() => null);
  if (!response?.ok) {
    gamificationHydrationPromise = null;
    return local;
  }

  const data = (await response.json().catch(() => null)) as { gamification?: AccountGamificationSnapshot } | null;
  if (!data?.gamification) {
    gamificationHydrationPromise = null;
    return local;
  }

  const accountSnapshot = normalizeAccountGamification(data.gamification);
  if (!gamificationSnapshotsMatch(local, accountSnapshot)) {
    writeLocalGamificationSnapshot(accountSnapshot);
  }

  return accountSnapshot;
}

export function recordGamificationEvent(event: GamificationEventType, targetId?: string, amount = 1) {
  if (typeof window === "undefined") return false;

  const rule = getGamificationEventRule(event);
  if (!rule) return false;

  const key = dedupeKey(event, targetId);
  const dedupeKeys = readDedupeKeys();
  if (key && dedupeKeys.includes(key)) return false;

  const current = readLocalGamificationSnapshot();
  const counts = new Map(current.eventCounts.map((record) => [record.event, record.count]));
  const nextCount = (counts.get(event) ?? 0) + Math.max(1, Math.floor(amount));
  counts.set(event, nextCount);

  const earnedBadgeIds = new Set(current.earnedBadgeIds);
  rule.badgeProgress.forEach((progress) => {
    if (nextCount >= progress.threshold) earnedBadgeIds.add(progress.badgeId);
  });

  const currentDay = todayKey();
  const lastStreakCredit = window.localStorage?.getItem(gamificationStreakKey);
  const streakCredit = rule.streakCredit && lastStreakCredit !== currentDay;
  if (streakCredit) {
    try {
      window.localStorage?.setItem(gamificationStreakKey, currentDay);
    } catch {
      // Ignore storage failures in restricted browser contexts.
    }
  }
  if (key) writeJson(gamificationDedupeKey, [...dedupeKeys, key]);

  const next = normalizeAccountGamification({
    ...current,
    dayStreak: streakCredit ? current.dayStreak + 1 : current.dayStreak,
    earnedBadgeIds: Array.from(earnedBadgeIds),
    eventCounts: Array.from(counts.entries()).map(([event, count]) => ({ event, count })),
    monthlyGain: current.monthlyGain + rule.points
  });

  writeLocalGamificationSnapshot(next);
  gamificationHydrationPromise = Promise.resolve(next);
  void syncGamificationToAccount(next);
  return true;
}
