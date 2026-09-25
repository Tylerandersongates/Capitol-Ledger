import {
  getGamificationEventRule,
  type GamificationEventType
} from "@/lib/gamification";
import {
  getDefaultAccountGamification,
  normalizeAccountGamification,
  type AccountGamificationSnapshot
} from "@/lib/account-gamification";
import { readLocalDistrictProfile } from "@/lib/browser-account-profile";
import { hasActiveBrowserSession, isBrowserAccountDeletionFenced } from "@/lib/browser-auth-state";

export const gamificationChangedEvent = "capitol-ledger:gamification-changed";

const gamificationKey = "capitol-ledger:gamification";
const gamificationDedupeKey = "capitol-ledger:gamification-dedupe";
const gamificationStreakKey = "capitol-ledger:gamification-streak-date";
const anonymousGamificationScope = "anonymous";
let gamificationHydrationPromise: Promise<AccountGamificationSnapshot> | null = null;
let gamificationMutationQueue: Promise<unknown> = Promise.resolve();
let lastAuthoritativeAccountGamificationSnapshot: {
  scope: string;
  snapshot: AccountGamificationSnapshot;
} | null = null;

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
let activeGamificationStorageScope = anonymousGamificationScope;

function setActiveGamificationStorageScope(scope = anonymousGamificationScope) {
  activeGamificationStorageScope = scope;
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
  if (typeof window === "undefined" || !window.localStorage || isBrowserAccountDeletionFenced()) return fallback;

  try {
    return JSON.parse(window.localStorage.getItem(key) ?? "") as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (typeof window === "undefined" || !window.localStorage || isBrowserAccountDeletionFenced()) return;

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
  if (typeof window === "undefined" || !window.localStorage || isBrowserAccountDeletionFenced()) return null;

  try {
    const value = window.localStorage.getItem(activeGamificationStorageKeys.streakKey);
    return isDateKey(value) ? value : null;
  } catch {
    return null;
  }
}

function writeLocalStreakCreditDate(dateKey: string) {
  if (typeof window === "undefined" || !window.localStorage || isBrowserAccountDeletionFenced()) return;

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
  if (typeof window === "undefined" || isBrowserAccountDeletionFenced()) return;

  const next = normalizeAccountGamification(snapshot);
  writeJson(activeGamificationStorageKeys.snapshotKey, next);
  window.dispatchEvent(new Event(gamificationChangedEvent));
}

function restoreLastAuthoritativeAccountGamificationSnapshot() {
  if (
    !lastAuthoritativeAccountGamificationSnapshot ||
    lastAuthoritativeAccountGamificationSnapshot.scope !== activeGamificationStorageScope ||
    isBrowserAccountDeletionFenced()
  ) return;
  writeLocalGamificationSnapshot(lastAuthoritativeAccountGamificationSnapshot.snapshot);
}

async function postGamificationEventToAccount(event: GamificationEventType, targetId?: string) {
  if (!(await hasActiveBrowserSession())) return null;

  const response = await fetch("/api/account/gamification", {
    body: JSON.stringify({ event, operation: "record-event", targetId }),
    headers: {
      "Content-Type": "application/json"
    },
    method: "POST"
  }).catch(() => null);

  if (!response?.ok) {
    restoreLastAuthoritativeAccountGamificationSnapshot();
    return null;
  }

  const data = (await response.json().catch(() => null)) as AccountGamificationResponse | null;
  if (!data?.gamification || isBrowserAccountDeletionFenced()) {
    restoreLastAuthoritativeAccountGamificationSnapshot();
    return null;
  }

  setActiveGamificationStorageScopeFromSession(data);
  const accountSnapshot = normalizeAccountGamification(data.gamification);
  lastAuthoritativeAccountGamificationSnapshot = {
    scope: activeGamificationStorageScope,
    snapshot: accountSnapshot
  };
  if (accountSnapshot.lastStreakCreditDate) writeLocalStreakCreditDate(accountSnapshot.lastStreakCreditDate);
  gamificationHydrationPromise = null;
  if (!gamificationSnapshotsMatch(readLocalGamificationSnapshot(), accountSnapshot)) {
    writeLocalGamificationSnapshot(accountSnapshot);
  }
  return accountSnapshot;
}

function syncGamificationEventToAccount(event: GamificationEventType, targetId?: string) {
  const mutation = gamificationMutationQueue.then(() => postGamificationEventToAccount(event, targetId));
  gamificationMutationQueue = mutation.then(() => undefined, () => undefined);
  return mutation;
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
  if (!data?.gamification || isBrowserAccountDeletionFenced()) {
    return readLocalGamificationSnapshot();
  }

  setActiveGamificationStorageScopeFromSession(data);
  const accountSnapshot = normalizeAccountGamification(data.gamification);
  lastAuthoritativeAccountGamificationSnapshot = {
    scope: activeGamificationStorageScope,
    snapshot: accountSnapshot
  };
  if (accountSnapshot.lastStreakCreditDate) writeLocalStreakCreditDate(accountSnapshot.lastStreakCreditDate);
  if (!gamificationSnapshotsMatch(readLocalGamificationSnapshot(), accountSnapshot)) {
    writeLocalGamificationSnapshot(accountSnapshot);
  }

  return accountSnapshot;
}

export function recordGamificationEvent(event: GamificationEventType, targetId?: string) {
  if (typeof window === "undefined" || isBrowserAccountDeletionFenced()) return false;

  const rule = getGamificationEventRule(event);
  if (!rule) return false;

  const current = readLocalGamificationSnapshot();
  const counts = new Map(current.eventCounts.map((record) => [record.event, record.count]));
  const existingCount = counts.get(event) ?? 0;
  const key = dedupeKey(event, targetId);
  const dedupeKeys = readDedupeKeys();
  const currentDay = todayKey();
  const lastStreakCredit = current.lastStreakCreditDate ?? readLocalStreakCreditDate();

  if (key && dedupeKeys.includes(key) && !(rule.dedupe === "once" && existingCount === 0)) {
    void syncGamificationEventToAccount(event, targetId);
    return false;
  }

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
    if (!badgesChanged) {
      void syncGamificationEventToAccount(event, targetId);
      return false;
    }

    const next = normalizeAccountGamification({
      ...current,
      earnedBadgeIds: Array.from(earnedBadgeIds)
    });

    writeLocalGamificationSnapshot(next);
    gamificationHydrationPromise = null;
    void syncGamificationEventToAccount(event, targetId);
    return true;
  }

  const nextCount = (counts.get(event) ?? 0) + 1;
  counts.set(event, nextCount);

  const earnedBadgeIds = new Set(current.earnedBadgeIds);
  rule.badgeProgress.forEach((progress) => {
    if (nextCount >= progress.threshold) earnedBadgeIds.add(progress.badgeId);
  });

  const streakCredit = rule.streakCredit && lastStreakCredit !== currentDay;
  if (streakCredit) {
    writeLocalStreakCreditDate(currentDay);
  }
  if (key && !dedupeKeys.includes(key)) writeJson(activeGamificationStorageKeys.dedupeKey, [...dedupeKeys, key]);

  const next = normalizeAccountGamification({
    ...current,
    dayStreak: streakCredit ? current.dayStreak + 1 : current.dayStreak,
    earnedBadgeIds: Array.from(earnedBadgeIds),
    eventCounts: Array.from(counts.entries()).map(([event, count]) => ({ event, count })),
    lastStreakCreditDate: streakCredit ? currentDay : current.lastStreakCreditDate,
    monthlyGain: current.monthlyGain + rule.points
  });

  writeLocalGamificationSnapshot(next);
  gamificationHydrationPromise = null;
  void syncGamificationEventToAccount(event, targetId);
  return true;
}

export function recordCompletedDistrictSetupIfReady() {
  const district = readLocalDistrictProfile();
  if (!district.districtCode) return false;

  return recordGamificationEvent("complete-onboarding", district.districtCode);
}
