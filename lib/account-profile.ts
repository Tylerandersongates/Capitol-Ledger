import type { AccountNotificationPreferences, AccountProfileSnapshot } from "@/types/capitol";

const defaultNotificationPreferences: AccountNotificationPreferences = {
  districtAlerts: true,
  voteReminders: true,
  weeklyBrief: false
};

declare global {
  // eslint-disable-next-line no-var
  var __capitolLedgerProfileStore: Map<string, AccountProfileSnapshot> | undefined;
}

const profileStore = globalThis.__capitolLedgerProfileStore ?? new Map<string, AccountProfileSnapshot>();
globalThis.__capitolLedgerProfileStore = profileStore;

function toBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

export function normalizeNotificationPreferences(value: Partial<AccountNotificationPreferences> = {}): AccountNotificationPreferences {
  return {
    districtAlerts: toBoolean(value.districtAlerts, defaultNotificationPreferences.districtAlerts),
    voteReminders: toBoolean(value.voteReminders, defaultNotificationPreferences.voteReminders),
    weeklyBrief: toBoolean(value.weeklyBrief, defaultNotificationPreferences.weeklyBrief)
  };
}

export function normalizeAccountProfile(value: Partial<AccountProfileSnapshot> = {}): AccountProfileSnapshot {
  return {
    displayName: value.displayName?.trim() || undefined,
    districtCode: value.districtCode?.trim() || "TX-10",
    districtLabel: value.districtLabel?.trim() || "Austin, Texas - TX-10",
    districtState: value.districtState?.trim() || "Texas",
    notificationPreferences: normalizeNotificationPreferences(value.notificationPreferences),
    partyAffiliation: value.partyAffiliation?.trim() ?? "",
    updatedAt: new Date().toISOString()
  };
}

export function getDefaultAccountProfile() {
  return normalizeAccountProfile();
}

export function getAccountProfile(userId: string) {
  const profile = profileStore.get(userId) ?? getDefaultAccountProfile();
  profileStore.set(userId, profile);
  return profile;
}

export function setAccountProfile(userId: string, value: Partial<AccountProfileSnapshot>) {
  const current = getAccountProfile(userId);
  const next = normalizeAccountProfile({
    ...current,
    ...value,
    notificationPreferences: {
      ...current.notificationPreferences,
      ...value.notificationPreferences
    }
  });

  profileStore.set(userId, next);
  return next;
}
