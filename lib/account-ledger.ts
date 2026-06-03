import type { AccountLedgerSnapshot, FollowTargetType, SavedFollowRecord } from "../types/capitol";

const emptyLedger = (): AccountLedgerSnapshot => ({
  follows: [],
  readAlerts: [],
  savedAlerts: [],
  issueInterests: [],
  updatedAt: new Date().toISOString()
});

declare global {
  // eslint-disable-next-line no-var
  var __capitolLedgerAccountStore: Map<string, AccountLedgerSnapshot> | undefined;
}

const accountStore = globalThis.__capitolLedgerAccountStore ?? new Map<string, AccountLedgerSnapshot>();
globalThis.__capitolLedgerAccountStore = accountStore;

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function uniqueFollows(values: SavedFollowRecord[]) {
  const seen = new Set<string>();
  const follows: SavedFollowRecord[] = [];

  values.forEach((record) => {
    if ((record.type !== "member" && record.type !== "bill") || !record.id) return;

    const key = `${record.type}:${record.id}`;
    if (seen.has(key)) return;

    seen.add(key);
    follows.push(record);
  });

  return follows;
}

export function normalizeAccountLedger(value: Partial<AccountLedgerSnapshot> = {}): AccountLedgerSnapshot {
  return {
    follows: uniqueFollows(Array.isArray(value.follows) ? value.follows : []),
    readAlerts: uniqueStrings(Array.isArray(value.readAlerts) ? value.readAlerts : []),
    savedAlerts: uniqueStrings(Array.isArray(value.savedAlerts) ? value.savedAlerts : []),
    issueInterests: uniqueStrings(Array.isArray(value.issueInterests) ? value.issueInterests : []),
    updatedAt: new Date().toISOString()
  };
}

export function getAccountLedger(userId: string) {
  const ledger = accountStore.get(userId) ?? emptyLedger();
  accountStore.set(userId, ledger);
  return ledger;
}

export function mergeAccountLedger(userId: string, value: Partial<AccountLedgerSnapshot>) {
  const current = getAccountLedger(userId);
  const incoming = normalizeAccountLedger(value);
  const hasFollows = Array.isArray(value.follows);
  const hasReadAlerts = Array.isArray(value.readAlerts);
  const hasSavedAlerts = Array.isArray(value.savedAlerts);
  const hasIssueInterests = Array.isArray(value.issueInterests);
  const merged = normalizeAccountLedger({
    follows: hasFollows ? incoming.follows : current.follows,
    readAlerts: hasReadAlerts ? incoming.readAlerts : current.readAlerts,
    savedAlerts: hasSavedAlerts ? incoming.savedAlerts : current.savedAlerts,
    issueInterests: hasIssueInterests ? incoming.issueInterests : current.issueInterests
  });

  accountStore.set(userId, merged);
  return merged;
}

export function toggleAccountFollow(userId: string, targetType: FollowTargetType, targetId: string, saved?: boolean) {
  const current = getAccountLedger(userId);
  const exists = current.follows.some((record) => record.type === targetType && record.id === targetId);
  const shouldSave = saved ?? !exists;
  const follows = shouldSave
    ? uniqueFollows([...current.follows, { type: targetType, id: targetId }])
    : current.follows.filter((record) => !(record.type === targetType && record.id === targetId));

  const next = normalizeAccountLedger({
    ...current,
    follows
  });

  accountStore.set(userId, next);
  return next;
}
