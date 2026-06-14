import { hasActiveBrowserSession } from "@/lib/browser-auth-state";
import type { AccountLedgerSnapshot, SavedFollowRecord } from "@/types/capitol";

export const followsKey = "capitol-ledger:follows";
export const interestsKey = "capitol-ledger:issue-interests";
export const issueInterestsPendingSyncKey = "capitol-ledger:issue-interests-pending-sync";
export const persistenceEvent = "capitol-ledger:persistence-changed";
export const readAlertsChangedEvent = "capitol-ledger:read-alerts-changed";
export const readAlertsKey = "capitol-ledger:read-alerts";
export const savedAlertsKey = "capitol-ledger:saved-alerts";
export const followsChangedEvent = "capitol-ledger:follows-changed";

let accountLedgerHydrationPromise: Promise<AccountLedgerSnapshot | null> | null = null;

export function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

export function sameStringSet(left: string[], right: string[]) {
  if (left.length !== right.length) return false;
  const rightSet = new Set(right);
  return left.every((value) => rightSet.has(value));
}

export function readStringList(key: string) {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? "[]") as unknown;
    return Array.isArray(parsed) ? uniqueStrings(parsed.filter((value): value is string => typeof value === "string" && value.trim().length > 0)) : [];
  } catch {
    return [];
  }
}

export function readSavedFollowRecords() {
  if (typeof window === "undefined") return [] as SavedFollowRecord[];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(followsKey) ?? "[]") as unknown;
    return Array.isArray(parsed) ? (parsed as SavedFollowRecord[]).filter((record) => (record.type === "member" || record.type === "bill") && Boolean(record.id)) : [];
  } catch {
    return [];
  }
}

export function readReadAlertIds() {
  return readStringList(readAlertsKey);
}

export function hasPendingIssueSync() {
  if (typeof window === "undefined") return false;

  try {
    return window.localStorage.getItem(issueInterestsPendingSyncKey) === "1";
  } catch {
    return false;
  }
}

export function writeReadAlertIds(ids: string[]) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(readAlertsKey, JSON.stringify(uniqueStrings(ids)));
    window.dispatchEvent(new Event(readAlertsChangedEvent));
  } catch {
    // Restricted browser contexts can still render notifications without persistence.
  }
}

export function writeLocalAccountLedger(ledger: AccountLedgerSnapshot) {
  if (typeof window === "undefined") return;

  try {
    const pendingIssueSync = hasPendingIssueSync();
    window.localStorage.setItem(followsKey, JSON.stringify(ledger.follows));
    window.localStorage.setItem(readAlertsKey, JSON.stringify(ledger.readAlerts));
    window.localStorage.setItem(savedAlertsKey, JSON.stringify(ledger.savedAlerts));
    window.localStorage.setItem(interestsKey, JSON.stringify(pendingIssueSync ? readStringList(interestsKey) : ledger.issueInterests));
    if (!pendingIssueSync) window.localStorage.removeItem(issueInterestsPendingSyncKey);
    window.dispatchEvent(new Event(persistenceEvent));
    window.dispatchEvent(new Event(followsChangedEvent));
    window.dispatchEvent(new Event(readAlertsChangedEvent));
  } catch {
    // Account-backed data still renders from the API response when local persistence is restricted.
  }
}

export async function fetchAccountLedger() {
  const response = await fetch("/api/account/ledger", { cache: "no-store" }).catch(() => null);
  if (!response?.ok) return null;

  const data = (await response.json().catch(() => null)) as { ledger?: AccountLedgerSnapshot } | null;
  return data?.ledger ?? null;
}

export async function hydrateAccountLedgerFromAccount() {
  if (typeof window === "undefined") return null;
  if (!(await hasActiveBrowserSession())) return null;
  if (accountLedgerHydrationPromise) return accountLedgerHydrationPromise;

  accountLedgerHydrationPromise = fetchAccountLedger()
    .then((ledger) => {
      if (ledger) writeLocalAccountLedger(ledger);
      return ledger;
    })
    .finally(() => {
      accountLedgerHydrationPromise = null;
    });

  return accountLedgerHydrationPromise;
}
