import type { AccountNotificationPreferences, AccountProfileSnapshot } from "@/types/capitol";

export const accountProfileChangedEvent = "capitol-ledger:account-profile-changed";

const districtProfileKey = "capitol-ledger:district-profile";
const notificationPreferencesKey = "capitol-ledger:notification-preferences";
const partyAffiliationKey = "capitol-ledger:party-affiliation";
let accountProfileFetchPromise: Promise<AccountProfileSnapshot | null> | null = null;

export type LocalDistrictProfile = Pick<AccountProfileSnapshot, "districtCode" | "districtLabel" | "districtState">;

export const defaultNotificationPreferences: AccountNotificationPreferences = {
  districtAlerts: true,
  voteReminders: true,
  weeklyBrief: false
};

export const defaultDistrictProfile: Required<LocalDistrictProfile> = {
  districtCode: "TX-10",
  districtLabel: "Austin, Texas - TX-10",
  districtState: "Texas"
};

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;

  try {
    return JSON.parse(window.localStorage.getItem(key) ?? "") as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event(accountProfileChangedEvent));
}

function toBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

export function normalizeLocalNotificationPreferences(value: Partial<AccountNotificationPreferences> = {}): AccountNotificationPreferences {
  return {
    districtAlerts: toBoolean(value.districtAlerts, defaultNotificationPreferences.districtAlerts),
    voteReminders: toBoolean(value.voteReminders, defaultNotificationPreferences.voteReminders),
    weeklyBrief: toBoolean(value.weeklyBrief, defaultNotificationPreferences.weeklyBrief)
  };
}

export function readLocalNotificationPreferences() {
  return normalizeLocalNotificationPreferences(readJson<Partial<AccountNotificationPreferences>>(notificationPreferencesKey, defaultNotificationPreferences));
}

export function writeLocalNotificationPreferences(value: Partial<AccountNotificationPreferences>) {
  writeJson(notificationPreferencesKey, normalizeLocalNotificationPreferences(value));
}

export function readLocalDistrictProfile(): Required<LocalDistrictProfile> {
  const district = readJson<LocalDistrictProfile>(districtProfileKey, defaultDistrictProfile);

  return {
    districtCode: district.districtCode?.trim() || defaultDistrictProfile.districtCode,
    districtLabel: district.districtLabel?.trim() || defaultDistrictProfile.districtLabel,
    districtState: district.districtState?.trim() || defaultDistrictProfile.districtState
  };
}

export function writeLocalDistrictProfile(value: LocalDistrictProfile) {
  const next = {
    ...defaultDistrictProfile,
    ...value
  };

  writeJson(districtProfileKey, next);
}

export function readLocalAccountProfile(): Partial<AccountProfileSnapshot> {
  const district = readLocalDistrictProfile();
  const notificationPreferences = readLocalNotificationPreferences();
  const partyAffiliation = typeof window === "undefined" ? "" : window.localStorage.getItem(partyAffiliationKey) ?? "";

  return {
    ...district,
    notificationPreferences,
    partyAffiliation
  };
}

export function writeLocalAccountProfile(profile: Partial<AccountProfileSnapshot>) {
  if (profile.notificationPreferences) writeLocalNotificationPreferences(profile.notificationPreferences);
  if (profile.districtCode || profile.districtLabel || profile.districtState) writeLocalDistrictProfile(profile);
  if (typeof window !== "undefined" && typeof profile.partyAffiliation === "string") {
    window.localStorage.setItem(partyAffiliationKey, profile.partyAffiliation);
    window.dispatchEvent(new Event(accountProfileChangedEvent));
  }
}

export async function fetchAccountProfile() {
  if (typeof window === "undefined") return null;
  if (accountProfileFetchPromise) return accountProfileFetchPromise;

  accountProfileFetchPromise = fetchAccountProfileFromApi().then((profile) => {
    if (!profile) accountProfileFetchPromise = null;
    return profile;
  });
  return accountProfileFetchPromise;
}

async function fetchAccountProfileFromApi() {
  const response = await fetch("/api/account/profile", { cache: "no-store" }).catch(() => null);
  if (!response?.ok) return null;

  const data = (await response.json().catch(() => null)) as { profile?: AccountProfileSnapshot } | null;
  return data?.profile ?? null;
}

export async function syncAccountProfile(profile: Partial<AccountProfileSnapshot>) {
  const response = await fetch("/api/account/profile", {
    body: JSON.stringify(profile),
    headers: {
      "Content-Type": "application/json"
    },
    method: "POST"
  }).catch(() => null);

  if (!response?.ok) return null;

  const data = (await response.json().catch(() => null)) as { profile?: AccountProfileSnapshot } | null;
  if (data?.profile) {
    accountProfileFetchPromise = Promise.resolve(data.profile);
    writeLocalAccountProfile(data.profile);
  }
  return data?.profile ?? null;
}
