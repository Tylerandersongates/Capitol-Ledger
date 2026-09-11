import type { AccountSubscriptionSnapshot } from "@/types/capitol";
import { assertAccountMemoryPersistenceAllowed } from "@/lib/account-persistence-safety";
import type { WeeklyBriefSnapshot } from "@/lib/weekly-brief";

export type WeeklyBriefDeliveryStatus = "prepared" | "queued_demo" | "sent" | "failed" | "paused" | "preview_only";

export type WeeklyBriefDeliveryRecord = {
  createdAt: string;
  deliveryMode: "in_app_demo" | "email" | "push";
  failedAt?: string;
  id: string;
  issueCount: number;
  plan: AccountSubscriptionSnapshot["plan"];
  preparedAt?: string;
  recipient?: string;
  savedRecordCount: number;
  sentAt?: string;
  status: WeeklyBriefDeliveryStatus;
  summary: string;
  trackedBillCount: number;
  unreadAlertCount: number;
  userId: string;
};

export type WeeklyBriefDeliveryInput = Partial<Omit<WeeklyBriefDeliveryRecord, "createdAt" | "id" | "userId">> & {
  createdAt?: string;
  id?: string;
};

declare global {
  // eslint-disable-next-line no-var
  var __capitolLedgerWeeklyBriefHistoryStore: Map<string, WeeklyBriefDeliveryRecord[]> | undefined;
}

const weeklyBriefHistoryStore = globalThis.__capitolLedgerWeeklyBriefHistoryStore ?? new Map<string, WeeklyBriefDeliveryRecord[]>();
globalThis.__capitolLedgerWeeklyBriefHistoryStore = weeklyBriefHistoryStore;

export function getWeeklyBriefStatusLabel(status: WeeklyBriefDeliveryStatus) {
  const labels: Record<WeeklyBriefDeliveryStatus, string> = {
    failed: "Failed",
    paused: "Paused",
    prepared: "Prepared",
    preview_only: "Preview",
    queued_demo: "Queued",
    sent: "Sent"
  };

  return labels[status];
}

export function buildWeeklyBriefDeliveryInput({
  brief,
  recipient,
  status
}: {
  brief: WeeklyBriefSnapshot;
  recipient?: string;
  status?: WeeklyBriefDeliveryStatus;
}): WeeklyBriefDeliveryInput {
  const preparedAt = new Date().toISOString();
  const resolvedStatus = status ?? (brief.delivery.enabled ? "queued_demo" : "paused");

  return {
    createdAt: preparedAt,
    deliveryMode: "in_app_demo",
    issueCount: brief.metrics.policyInterests,
    plan: brief.plan.id,
    preparedAt,
    recipient,
    savedRecordCount: brief.metrics.savedRecords,
    status: resolvedStatus,
    summary: brief.watchToday[0]?.title ?? brief.lens.headline,
    trackedBillCount: brief.watchlist.bills.length,
    unreadAlertCount: brief.metrics.unreadAlerts
  };
}

export function normalizeWeeklyBriefDeliveryRecord(
  userId: string,
  value: WeeklyBriefDeliveryInput = {}
): WeeklyBriefDeliveryRecord {
  const createdAt = value.createdAt ?? new Date().toISOString();
  const status = isWeeklyBriefDeliveryStatus(value.status) ? value.status : "prepared";
  const plan = value.plan === "pro" || value.plan === "team" ? value.plan : "free";
  const deliveryMode = value.deliveryMode === "email" || value.deliveryMode === "push" ? value.deliveryMode : "in_app_demo";

  return {
    createdAt,
    deliveryMode,
    failedAt: value.failedAt,
    id: value.id ?? `${userId}-weekly-brief-${createdAt}`,
    issueCount: toPositiveInteger(value.issueCount),
    plan,
    preparedAt: value.preparedAt,
    recipient: value.recipient,
    savedRecordCount: toPositiveInteger(value.savedRecordCount),
    sentAt: value.sentAt,
    status,
    summary: value.summary?.trim() || "Weekly Civic Brief",
    trackedBillCount: toPositiveInteger(value.trackedBillCount),
    unreadAlertCount: toPositiveInteger(value.unreadAlertCount),
    userId
  };
}

export function addWeeklyBriefDeliveryRecord(userId: string, value: WeeklyBriefDeliveryInput) {
  assertAccountMemoryPersistenceAllowed("addWeeklyBriefDeliveryRecord");
  const record = normalizeWeeklyBriefDeliveryRecord(userId, value);
  const records = weeklyBriefHistoryStore.get(userId) ?? [];
  const next = [record, ...records].slice(0, 20);

  weeklyBriefHistoryStore.set(userId, next);
  return record;
}

export function getWeeklyBriefDeliveryHistory(userId: string) {
  assertAccountMemoryPersistenceAllowed("getWeeklyBriefDeliveryHistory");
  return (weeklyBriefHistoryStore.get(userId) ?? []).slice(0, 10);
}

export function clearWeeklyBriefHistoryMemory(userId: string, email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  let deleted = 0;

  for (const [key, records] of weeklyBriefHistoryStore) {
    if (key === userId) {
      deleted += records.length;
      weeklyBriefHistoryStore.delete(key);
      continue;
    }

    const retainedRecords = records.filter((record) => {
      const matchesUser = record.userId === userId;
      const matchesEmail = normalizedEmail && record.recipient?.trim().toLowerCase() === normalizedEmail;
      if (!matchesUser && !matchesEmail) return true;

      deleted += 1;
      return false;
    });

    if (retainedRecords.length === records.length) continue;
    if (retainedRecords.length === 0) weeklyBriefHistoryStore.delete(key);
    else weeklyBriefHistoryStore.set(key, retainedRecords);
  }

  return deleted;
}

function isWeeklyBriefDeliveryStatus(value: unknown): value is WeeklyBriefDeliveryStatus {
  return value === "prepared" || value === "queued_demo" || value === "sent" || value === "failed" || value === "paused" || value === "preview_only";
}

function toPositiveInteger(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}
