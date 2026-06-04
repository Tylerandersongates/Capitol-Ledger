import { hasActiveBrowserSession } from "@/lib/browser-auth-state";
import type { OfficialContactMessageRecord } from "@/lib/official-contact-messages";

export type SentLetterRecord = OfficialContactMessageRecord & {
  source?: "account" | "local";
};

export const sentLettersChangedEvent = "capitol-ledger:sent-letters-changed";

const sentLettersKey = "capitol-ledger:sent-letters";

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

function normalizeDate(value: unknown) {
  if (typeof value !== "string") return new Date().toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function normalizeSentLetter(value: unknown, source: "account" | "local" = "local"): SentLetterRecord | null {
  if (!isRecord(value)) return null;

  const id = optionalString(value.id);
  const memberBioguideId = optionalString(value.memberBioguideId);
  const memberName = optionalString(value.memberName);
  const subject = optionalString(value.subject);
  if (!id || !memberBioguideId || !memberName || !subject) return null;

  return {
    contactUrl: optionalString(value.contactUrl),
    confirmedAt: optionalString(value.confirmedAt),
    deliveryMode: value.deliveryMode === "webhook" ? "webhook" : "manual",
    deliveryStatus: value.deliveryStatus === "sent" ? "sent" : "prepared",
    id,
    memberBioguideId,
    memberChamber: value.memberChamber === "House" || value.memberChamber === "Senate" ? value.memberChamber : undefined,
    memberDistrict: optionalString(value.memberDistrict),
    memberName,
    memberState: optionalString(value.memberState),
    messagePreview: optionalString(value.messagePreview),
    senderEmail: optionalString(value.senderEmail),
    sentAt: normalizeDate(value.sentAt),
    source,
    subject
  };
}

function sortLetters(records: SentLetterRecord[]) {
  return [...records].sort((left, right) => {
    const leftTime = new Date(left.confirmedAt ?? left.sentAt).getTime();
    const rightTime = new Date(right.confirmedAt ?? right.sentAt).getTime();
    return rightTime - leftTime;
  });
}

function mergeLetters(records: SentLetterRecord[]) {
  const byId = new Map<string, SentLetterRecord>();

  records.forEach((record) => {
    const existing = byId.get(record.id);
    if (!existing) {
      byId.set(record.id, record);
      return;
    }

    const deliveryStatus = existing.deliveryStatus === "sent" || record.deliveryStatus === "sent" ? "sent" : "prepared";
    byId.set(record.id, {
      ...existing,
      ...record,
      confirmedAt: record.confirmedAt ?? existing.confirmedAt,
      deliveryStatus
    });
  });

  return sortLetters(Array.from(byId.values())).slice(0, 100);
}

function emitSentLettersChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(sentLettersChangedEvent));
}

export function readLocalSentLetters() {
  const records = readJson<unknown[]>(sentLettersKey, []);
  return sortLetters(records.map((record) => normalizeSentLetter(record, "local")).filter(Boolean) as SentLetterRecord[]);
}

export function writeLocalSentLetters(records: SentLetterRecord[]) {
  writeJson(sentLettersKey, mergeLetters(records).slice(0, 100));
  emitSentLettersChanged();
}

export function recordLocalSentLetter(record: OfficialContactMessageRecord) {
  const normalized = normalizeSentLetter(record, "local");
  if (!normalized) return null;

  const next = mergeLetters([normalized, ...readLocalSentLetters()]);
  writeLocalSentLetters(next);
  return normalized;
}

export function confirmLocalSentLetter(id: string) {
  const confirmedAt = new Date().toISOString();
  const next = readLocalSentLetters().map((record) =>
    record.id === id
      ? {
          ...record,
          confirmedAt: record.confirmedAt ?? confirmedAt,
          deliveryStatus: "sent" as const
        }
      : record
  );
  writeLocalSentLetters(next);
  return next.find((record) => record.id === id) ?? null;
}

export async function fetchAccountSentLetters() {
  if (!(await hasActiveBrowserSession())) return [];

  const response = await fetch("/api/account/letters", { cache: "no-store" }).catch(() => null);
  if (!response?.ok) return [];

  const data = (await response.json().catch(() => null)) as { letters?: unknown[] } | null;
  const records = Array.isArray(data?.letters) ? data.letters : [];
  return records.map((record) => normalizeSentLetter(record, "account")).filter(Boolean) as SentLetterRecord[];
}

export async function hydrateSentLetters() {
  const localLetters = readLocalSentLetters();
  const accountLetters = await fetchAccountSentLetters();
  const merged = mergeLetters([...accountLetters, ...localLetters]);

  if (accountLetters.length && JSON.stringify(localLetters) !== JSON.stringify(merged)) {
    writeLocalSentLetters(merged);
  }
  return merged;
}
