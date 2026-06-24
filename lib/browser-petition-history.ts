import { getCivicPetitionById, type CivicPetition } from "@/lib/civic-petitions";
import { hasActiveBrowserSession } from "@/lib/browser-auth-state";
import type { SignedPetitionRecord } from "@/lib/account-petition-signatures";

export type BrowserSignedPetitionRecord = SignedPetitionRecord & {
  source?: "account" | "local";
};

export const signedPetitionsChangedEvent = "capitol-ledger:signed-petitions-changed";

const signedPetitionIdsKey = "capitol-ledger:signed-petitions";
const signedPetitionRecordsKey = "capitol-ledger:signed-petition-records";

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function normalizeDate(value: unknown) {
  if (typeof value !== "string") return new Date().toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function petitionToRecord(petition: CivicPetition, signedAt = new Date().toISOString()): BrowserSignedPetitionRecord {
  return {
    body: petition.body,
    id: `${petition.id}:${signedAt}`,
    petitionId: petition.id,
    progressLabel: petition.progressLabel,
    signedAt,
    source: "local",
    targetLabel: petition.targetLabel,
    title: petition.title
  };
}

function normalizeSignedPetition(value: unknown, source: "account" | "local" = "local"): BrowserSignedPetitionRecord | null {
  if (!isRecord(value)) return null;

  const petitionId = optionalString(value.petitionId) ?? optionalString(value.id);
  if (!petitionId) return null;

  const catalogPetition = getCivicPetitionById(petitionId);
  const title = optionalString(value.title) ?? catalogPetition?.title;
  if (!title) return null;

  const signedAt = normalizeDate(value.signedAt);
  return {
    body: optionalString(value.body) ?? catalogPetition?.body,
    id: optionalString(value.id) ?? `${petitionId}:${signedAt}`,
    petitionId,
    progressLabel: catalogPetition?.progressLabel ?? optionalString(value.progressLabel),
    signedAt,
    source,
    targetLabel: catalogPetition?.targetLabel ?? optionalString(value.targetLabel),
    title
  };
}

function sortPetitions(records: BrowserSignedPetitionRecord[]) {
  return [...records].sort((left, right) => new Date(right.signedAt).getTime() - new Date(left.signedAt).getTime());
}

function mergePetitions(records: BrowserSignedPetitionRecord[]) {
  const byPetitionId = new Map<string, BrowserSignedPetitionRecord>();

  records.forEach((record) => {
    const existing = byPetitionId.get(record.petitionId);
    if (!existing) {
      byPetitionId.set(record.petitionId, record);
      return;
    }

    const existingTime = new Date(existing.signedAt).getTime();
    const recordTime = new Date(record.signedAt).getTime();
    byPetitionId.set(record.petitionId, recordTime >= existingTime ? { ...existing, ...record } : { ...record, ...existing });
  });

  return sortPetitions(Array.from(byPetitionId.values())).slice(0, 100);
}

function emitSignedPetitionsChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(signedPetitionsChangedEvent));
}

export function readLocalSignedPetitions() {
  const records = readJson<unknown[]>(signedPetitionRecordsKey, []);
  const normalizedRecords = records.map((record) => normalizeSignedPetition(record, "local")).filter(Boolean) as BrowserSignedPetitionRecord[];
  const legacyIds = readJson<unknown[]>(signedPetitionIdsKey, []);
  const legacyRecords = legacyIds
    .filter((id): id is string => typeof id === "string")
    .map((id) => {
      const petition = getCivicPetitionById(id);
      return petition ? petitionToRecord(petition) : null;
    })
    .filter(Boolean) as BrowserSignedPetitionRecord[];

  return mergePetitions([...normalizedRecords, ...legacyRecords]);
}

export function writeLocalSignedPetitions(records: BrowserSignedPetitionRecord[]) {
  const merged = mergePetitions(records);
  writeJson(signedPetitionRecordsKey, merged);
  writeJson(signedPetitionIdsKey, merged.map((record) => record.petitionId));
  emitSignedPetitionsChanged();
}

export function readLocalSignedPetitionIds() {
  return readLocalSignedPetitions().map((record) => record.petitionId);
}

export function recordLocalSignedPetition(petition: CivicPetition | BrowserSignedPetitionRecord) {
  const record = "petitionId" in petition ? normalizeSignedPetition(petition, petition.source ?? "local") : petitionToRecord(petition);
  if (!record) return null;

  const next = mergePetitions([record, ...readLocalSignedPetitions()]);
  writeLocalSignedPetitions(next);
  return record;
}

export async function fetchAccountSignedPetitions() {
  if (!(await hasActiveBrowserSession())) return [];

  const response = await fetch("/api/account/petitions", { cache: "no-store" }).catch(() => null);
  if (!response?.ok) return [];

  const data = (await response.json().catch(() => null)) as { petitions?: unknown[] } | null;
  const records = Array.isArray(data?.petitions) ? data.petitions : [];
  return records.map((record) => normalizeSignedPetition(record, "account")).filter(Boolean) as BrowserSignedPetitionRecord[];
}

export async function hydrateSignedPetitions() {
  const localPetitions = readLocalSignedPetitions();
  const accountPetitions = await fetchAccountSignedPetitions();
  const merged = mergePetitions([...accountPetitions, ...localPetitions]);

  if (accountPetitions.length && JSON.stringify(localPetitions) !== JSON.stringify(merged)) {
    writeLocalSignedPetitions(merged);
  }
  return merged;
}

export async function recordSignedPetition(petition: CivicPetition) {
  const localRecord = recordLocalSignedPetition(petition);

  if (await hasActiveBrowserSession()) {
    const response = await fetch("/api/account/petitions", {
      body: JSON.stringify({ petitionId: petition.id }),
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST"
    }).catch(() => null);
    const payload = (await response?.json().catch(() => null)) as { petition?: BrowserSignedPetitionRecord } | null;

    if (payload?.petition) {
      return recordLocalSignedPetition({ ...payload.petition, source: "account" });
    }
  }

  return localRecord;
}
