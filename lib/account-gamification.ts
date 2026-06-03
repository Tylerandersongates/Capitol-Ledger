import {
  badgeCatalog,
  calculateGamificationScore,
  demoGamificationEventCounts,
  gamificationEventRules,
  getEarnedBadges,
  getGamificationSummary,
  type GamificationEventCount,
  type GamificationEventType
} from "./gamification";

export type AccountGamificationSnapshot = {
  civicScore: number;
  dayStreak: number;
  earnedBadgeIds: string[];
  eventCounts: GamificationEventCount[];
  level: number;
  levelTitle: string;
  monthlyGain: number;
  nextLevelScore: number;
  totalActions: number;
  totalBadges: number;
  updatedAt: string;
  xpProgress: number;
};

const validEvents = new Set(gamificationEventRules.map((rule) => rule.event));
const validBadgeIds = new Set(badgeCatalog.map((badge) => badge.id));
const defaultEarnedBadgeIds = getEarnedBadges().map((badge) => badge.id);

declare global {
  // eslint-disable-next-line no-var
  var __capitolLedgerGamificationStore: Map<string, AccountGamificationSnapshot> | undefined;
}

const gamificationStore = globalThis.__capitolLedgerGamificationStore ?? new Map<string, AccountGamificationSnapshot>();
globalThis.__capitolLedgerGamificationStore = gamificationStore;

function isGamificationEvent(event: unknown): event is GamificationEventType {
  return typeof event === "string" && validEvents.has(event as GamificationEventType);
}

function toPositiveInteger(value: unknown) {
  const count = Number(value);
  return Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
}

function normalizeEventCounts(value: unknown): GamificationEventCount[] {
  const source = Array.isArray(value) ? value : demoGamificationEventCounts;
  const counts = new Map<GamificationEventType, number>();

  source.forEach((record) => {
    if (!record || typeof record !== "object") return;

    const event = "event" in record ? record.event : undefined;
    const count = "count" in record ? record.count : undefined;
    if (!isGamificationEvent(event)) return;

    counts.set(event, (counts.get(event) ?? 0) + toPositiveInteger(count));
  });

  return Array.from(counts.entries()).map(([event, count]) => ({ event, count }));
}

function normalizeBadgeIds(value: unknown) {
  const source = Array.isArray(value) ? value : defaultEarnedBadgeIds;
  return Array.from(new Set(source.filter((id): id is string => typeof id === "string" && validBadgeIds.has(id))));
}

export function normalizeAccountGamification(value: Partial<AccountGamificationSnapshot> = {}): AccountGamificationSnapshot {
  const eventCounts = normalizeEventCounts(value.eventCounts);
  const earnedBadgeIds = normalizeBadgeIds(value.earnedBadgeIds);
  const summary = getGamificationSummary(eventCounts, earnedBadgeIds);
  const civicScore = calculateGamificationScore(eventCounts);

  return {
    civicScore,
    dayStreak: toPositiveInteger(value.dayStreak) || summary.dayStreak,
    earnedBadgeIds,
    eventCounts,
    level: summary.level,
    levelTitle: summary.levelTitle,
    monthlyGain: toPositiveInteger(value.monthlyGain) || summary.monthlyGain,
    nextLevelScore: summary.nextLevelScore,
    totalActions: summary.totalActions,
    totalBadges: summary.totalBadges,
    updatedAt: new Date().toISOString(),
    xpProgress: summary.xpProgress
  };
}

export function getDefaultAccountGamification() {
  return normalizeAccountGamification();
}

export function getAccountGamification(userId: string) {
  const gamification = gamificationStore.get(userId) ?? getDefaultAccountGamification();
  gamificationStore.set(userId, gamification);
  return gamification;
}

export function setAccountGamification(userId: string, value: Partial<AccountGamificationSnapshot>) {
  const current = getAccountGamification(userId);
  const next = normalizeAccountGamification({
    ...current,
    ...value
  });

  gamificationStore.set(userId, next);
  return next;
}

export function recordAccountGamificationEvent(userId: string, event: GamificationEventType, amount = 1) {
  const current = getAccountGamification(userId);
  const counts = new Map(current.eventCounts.map((record) => [record.event, record.count]));
  counts.set(event, (counts.get(event) ?? 0) + toPositiveInteger(amount));

  return setAccountGamification(userId, {
    eventCounts: Array.from(counts.entries()).map(([event, count]) => ({ event, count }))
  });
}
