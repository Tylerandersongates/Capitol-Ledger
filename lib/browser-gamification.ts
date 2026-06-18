import {
  getGamificationEventRule,
  getGamificationEventRules,
  type GamificationEventType
} from "@/lib/gamification";
import {
  getDefaultAccountGamification,
  normalizeAccountGamification,
  type AccountGamificationSnapshot
} from "@/lib/account-gamification";
import { readLocalDistrictProfile } from "@/lib/browser-account-profile";
import { hasActiveBrowserSession } from "@/lib/browser-auth-state";

export const gamificationChangedEvent = "capitol-ledger:gamification-changed";

const gamificationKey = "capitol-ledger:gamification";
const gamificationDedupeKey = "capitol-ledger:gamification-dedupe";
const gamificationStreakKey = "capitol-ledger:gamification-streak-date";
const anonymousGamificationScope = "anonymous";
let gamificationHydrationPromise: Promise<AccountGamificationSnapshot> | null = null;

type AuthSessionResponse = {
  authenticated?: boolean;
  mode?: string;
  user?: {
    email?: string;
    id?: string;
  } | null;
};
type AccountGamificationResponse = AuthSessionResponse & {
  gamification?: AccountGamificationSnapshot;
};

type GamificationStorageKeys = {
  dedupeKey: string;
  snapshotKey: string;
  streakKey: string;
};

function scopedStorageKey(baseKey: string, scope: string) {
  return `${baseKey}:${scope}`;
}

function buildGamificationStorageKeys(scope = anonymousGamificationScope): GamificationStorageKeys {
  return {
    dedupeKey: scopedStorageKey(gamificationDedupeKey, scope),
    snapshotKey: scopedStorageKey(gamificationKey, scope),
    streakKey: scopedStorageKey(gamificationStreakKey, scope)
  };
}

let activeGamificationStorageKeys = buildGamificationStorageKeys();

function setActiveGamificationStorageScope(scope = anonymousGamificationScope) {
  activeGamificationStorageKeys = buildGamificationStorageKeys(scope);
  return activeGamificationStorageKeys;
}

function storageScopeFromSession(data: AuthSessionResponse | null) {
  if (!data?.authenticated || !data.user) return anonymousGamificationScope;

  const userKey = data.user.id || data.user.email;
  if (!userKey) return anonymousGamificationScope;

  const mode = data.mode === "demo" ? "demo" : "account";
  return `${mode}:${encodeURIComponent(userKey.toLowerCase())}`;
}

function setActiveGamificationStorageScopeFromSession(data: AuthSessionResponse | null) {
  return setActiveGamificationStorageScope(storageScopeFromSession(data));
}

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
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isDateKey(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function readLocalStreakCreditDate() {
  if (typeof window === "undefined" || !window.localStorage) return null;

  try {
    const value = window.localStorage.getItem(activeGamificationStorageKeys.streakKey);
    return isDateKey(value) ? value : null;
  } catch {
    return null;
  }
}

function writeLocalStreakCreditDate(dateKey: string) {
  if (typeof window === "undefined" || !window.localStorage) return;

  try {
    window.localStorage.setItem(activeGamificationStorageKeys.streakKey, dateKey);
  } catch {
    // Ignore storage failures in restricted browser contexts.
  }
}

function dedupeKey(event: GamificationEventType, targetId?: string) {
  const rule = getGamificationEventRule(event);
  if (!rule || rule.dedupe === "repeatable") return "";
  if (rule.dedupe === "daily") return `${event}:${todayKey()}:${targetId ?? "daily"}`;
  if (rule.dedupe === "once-per-target") return `${event}:${targetId ?? "default"}`;
  return event;
}

function readDedupeKeys() {
  return readJson<string[]>(activeGamificationStorageKeys.dedupeKey, []);
}

function gamificationSignature(snapshot: AccountGamificationSnapshot) {
  const normalized = normalizeAccountGamification(snapshot);
  return JSON.stringify({
    earnedBadgeIds: [...normalized.earnedBadgeIds].sort(),
    eventCounts: [...normalized.eventCounts].sort((left, right) => left.event.localeCompare(right.event)),
    civicScore: normalized.civicScore,
    dayStreak: normalized.dayStreak,
    level: normalized.level,
    levelTitle: normalized.levelTitle,
    lastStreakCreditDate: normalized.lastStreakCreditDate,
    monthlyGain: normalized.monthlyGain,
    nextLevelScore: normalized.nextLevelScore,
    totalActions: normalized.totalActions,
    totalBadges: normalized.totalBadges,
    xpProgress: normalized.xpProgress
  });
}

function gamificationSnapshotsMatch(left: AccountGamificationSnapshot, right: AccountGamificationSnapshot) {
  return gamificationSignature(left) === gamificationSignature(right);
}

function deriveEarnedBadgeIdsForCounts(snapshot: AccountGamificationSnapshot, counts: Map<GamificationEventType, number>) {
  const earnedBadgeIds = new Set(snapshot.earnedBadgeIds);
  const ruleBadgeIds = new Set<string>();
  const qualifiedBadgeIds = new Set<string>();

  getGamificationEventRules().forEach((rule) => {
    const count = counts.get(rule.event) ?? 0;
    rule.badgeProgress.forEach((progress) => {
      ruleBadgeIds.add(progress.badgeId);
      if (count >= progress.threshold) qualifiedBadgeIds.add(progress.badgeId);
    });
  });

  ruleBadgeIds.forEach((badgeId) => {
    if (qualifiedBadgeIds.has(badgeId)) {
      earnedBadgeIds.add(badgeId);
    } else {
      earnedBadgeIds.delete(badgeId);
    }
  });

  return Array.from(earnedBadgeIds);
}

export function readLocalGamificationSnapshot() {
  const snapshot = normalizeAccountGamification(readJson<Partial<AccountGamificationSnapshot>>(activeGamificationStorageKeys.snapshotKey, getDefaultAccountGamification()));
  const legacyStreakCreditDate = readLocalStreakCreditDate();
  if (!snapshot.lastStreakCreditDate && legacyStreakCreditDate) {
    return normalizeAccountGamification({
      ...snapshot,
      lastStreakCreditDate: legacyStreakCreditDate
    });
  }

  return snapshot;
}

export function writeLocalGamificationSnapshot(snapshot: Partial<AccountGamificationSnapshot>) {
  if (typeof window === "undefined") return;

  const next = normalizeAccountGamification(snapshot);
  writeJson(activeGamificationStorageKeys.snapshotKey, next);
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

  const data = (await response.json().catch(() => null)) as AccountGamificationResponse | null;
  if (!data?.gamification) return null;

  setActiveGamificationStorageScopeFromSession(data);
  const accountSnapshot = normalizeAccountGamification(data.gamification);
  if (accountSnapshot.lastStreakCreditDate) writeLocalStreakCreditDate(accountSnapshot.lastStreakCreditDate);
  gamificationHydrationPromise = null;
  if (!gamificationSnapshotsMatch(readLocalGamificationSnapshot(), accountSnapshot)) {
    writeLocalGamificationSnapshot(accountSnapshot);
  }
  return accountSnapshot;
}

export async function hydrateGamificationFromAccount() {
  if (typeof window === "undefined") return getDefaultAccountGamification();
  if (!(await hasActiveBrowserSession())) {
    setActiveGamificationStorageScope();
    return readLocalGamificationSnapshot();
  }
  if (gamificationHydrationPromise) return gamificationHydrationPromise;

  gamificationHydrationPromise = hydrateGamificationFromApi().finally(() => {
    gamificationHydrationPromise = null;
  });
  return gamificationHydrationPromise;
}

async function hydrateGamificationFromApi() {
  const response = await fetch("/api/account/gamification", { cache: "no-store" }).catch(() => null);
  if (!response?.ok) {
    return readLocalGamificationSnapshot();
  }

  const data = (await response.json().catch(() => null)) as AccountGamificationResponse | null;
  if (!data?.gamification) {
    return readLocalGamificationSnapshot();
  }

  setActiveGamificationStorageScopeFromSession(data);
  const accountSnapshot = normalizeAccountGamification(data.gamification);
  if (accountSnapshot.lastStreakCreditDate) writeLocalStreakCreditDate(accountSnapshot.lastStreakCreditDate);
  if (!gamificationSnapshotsMatch(readLocalGamificationSnapshot(), accountSnapshot)) {
    writeLocalGamificationSnapshot(accountSnapshot);
  }

  return accountSnapshot;
}

export function recordGamificationEvent(event: GamificationEventType, targetId?: string, amount = 1) {
  if (typeof window === "undefined") return false;

  const rule = getGamificationEventRule(event);
  if (!rule) return false;

  const current = readLocalGamificationSnapshot();
  const counts = new Map(current.eventCounts.map((record) => [record.event, record.count]));
  const existingCount = counts.get(event) ?? 0;
  const key = dedupeKey(event, targetId);
  const dedupeKeys = readDedupeKeys();
  if (key && dedupeKeys.includes(key) && !(rule.dedupe === "once" && existingCount === 0)) return false;

  if (rule.dedupe === "once" && existingCount > 0) {
    const earnedBadgeIds = new Set(current.earnedBadgeIds);
    let badgesChanged = false;

    rule.badgeProgress.forEach((progress) => {
      if (existingCount >= progress.threshold && !earnedBadgeIds.has(progress.badgeId)) {
        earnedBadgeIds.add(progress.badgeId);
        badgesChanged = true;
      }
    });

    if (key && !dedupeKeys.includes(key)) writeJson(activeGamificationStorageKeys.dedupeKey, [...dedupeKeys, key]);
    if (!badgesChanged) return false;

    const next = normalizeAccountGamification({
      ...current,
      earnedBadgeIds: Array.from(earnedBadgeIds)
    });

    writeLocalGamificationSnapshot(next);
    gamificationHydrationPromise = null;
    void syncGamificationToAccount(next);
    return true;
  }

  const nextCount = (counts.get(event) ?? 0) + Math.max(1, Math.floor(amount));
  counts.set(event, nextCount);

  const earnedBadgeIds = new Set(current.earnedBadgeIds);
  rule.badgeProgress.forEach((progress) => {
    if (nextCount >= progress.threshold) earnedBadgeIds.add(progress.badgeId);
  });

  const currentDay = todayKey();
  const lastStreakCredit = current.lastStreakCreditDate ?? readLocalStreakCreditDate();
  const baselineStreakCredit = rule.streakCredit && current.dayStreak <= 1 && current.totalActions === 0;
  const streakCredit = rule.streakCredit && !baselineStreakCredit && lastStreakCredit !== currentDay;
  if (streakCredit || baselineStreakCredit) {
    writeLocalStreakCreditDate(currentDay);
  }
  if (key && !dedupeKeys.includes(key)) writeJson(activeGamificationStorageKeys.dedupeKey, [...dedupeKeys, key]);

  const next = normalizeAccountGamification({
    ...current,
    dayStreak: streakCredit ? current.dayStreak + 1 : current.dayStreak,
    earnedBadgeIds: Array.from(earnedBadgeIds),
    eventCounts: Array.from(counts.entries()).map(([event, count]) => ({ event, count })),
    lastStreakCreditDate: streakCredit || baselineStreakCredit ? currentDay : current.lastStreakCreditDate,
    monthlyGain: current.monthlyGain + rule.points
  });

  writeLocalGamificationSnapshot(next);
  gamificationHydrationPromise = null;
  void syncGamificationToAccount(next);
  return true;
}

export function setGamificationEventCount(event: GamificationEventType, count: number) {
  if (typeof window === "undefined") return false;

  const rule = getGamificationEventRule(event);
  if (!rule) return false;

  const current = readLocalGamificationSnapshot();
  const nextCount = Math.max(0, Math.floor(count));
  const counts = new Map(current.eventCounts.map((record) => [record.event, record.count]));
  const previousCount = counts.get(event) ?? 0;
  const didIncrease = nextCount > previousCount;

  if (nextCount > 0) {
    counts.set(event, nextCount);
  } else {
    counts.delete(event);
  }

  const currentDay = todayKey();
  const lastStreakCredit = current.lastStreakCreditDate ?? readLocalStreakCreditDate();
  const baselineStreakCredit = rule.streakCredit && current.dayStreak <= 1 && current.totalActions === 0;
  const streakCredit = rule.streakCredit && didIncrease && !baselineStreakCredit && lastStreakCredit !== currentDay;
  if ((streakCredit || (didIncrease && baselineStreakCredit)) && rule.streakCredit) {
    writeLocalStreakCreditDate(currentDay);
  }

  const next = normalizeAccountGamification({
    ...current,
    dayStreak: streakCredit ? current.dayStreak + 1 : current.dayStreak,
    earnedBadgeIds: deriveEarnedBadgeIdsForCounts(current, counts),
    eventCounts: Array.from(counts.entries()).map(([recordEvent, recordCount]) => ({ event: recordEvent, count: recordCount })),
    lastStreakCreditDate: streakCredit || (didIncrease && baselineStreakCredit) ? currentDay : current.lastStreakCreditDate,
    monthlyGain: Math.max(0, current.monthlyGain + (nextCount - previousCount) * rule.points)
  });

  if (gamificationSnapshotsMatch(current, next)) return false;

  writeLocalGamificationSnapshot(next);
  gamificationHydrationPromise = null;
  void syncGamificationToAccount(next);
  return true;
}

export function recordCompletedDistrictSetupIfReady() {
  const district = readLocalDistrictProfile();
  if (!district.districtCode) return false;

  return recordGamificationEvent("complete-onboarding", district.districtCode);
}
