"use client";

import { useEffect, useState } from "react";
import { Bell, BookmarkCheck, Check, Star } from "lucide-react";
import { mobileIconButtonClass } from "@/components/mobile-ui";
import { recordGamificationEvent } from "@/lib/browser-gamification";
import type { AccountLedgerSnapshot, FollowTargetType, SavedFollowRecord } from "@/types/capitol";

const followsKey = "capitol-ledger:follows";
const alertsKey = "capitol-ledger:saved-alerts";
const interestsKey = "capitol-ledger:issue-interests";
const readAlertsKey = "capitol-ledger:read-alerts";
const persistenceEvent = "capitol-ledger:persistence-changed";
const accountLedgerEndpoint = "/api/account/ledger";

let accountHydrationStarted = false;

type SavedCounts = {
  alerts: number;
  bills: number;
  interests: number;
  officials: number;
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
  window.localStorage.setItem(key, JSON.stringify(value));
  dispatchPersistenceChanged(key);
  void syncLocalLedgerToAccount();
}

function dispatchPersistenceChanged(key?: string) {
  window.dispatchEvent(new Event(persistenceEvent));
  if (key === followsKey) {
    window.dispatchEvent(new Event("capitol-ledger:follows-changed"));
  }
}

function readFollows() {
  return readJson<SavedFollowRecord[]>(followsKey, []);
}

function readSavedAlerts() {
  return readJson<string[]>(alertsKey, []);
}

function readReadAlerts() {
  return readJson<string[]>(readAlertsKey, []);
}

function readIssueInterests() {
  return readJson<string[]>(interestsKey, []);
}

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

function readLocalLedger(): AccountLedgerSnapshot {
  return {
    follows: uniqueFollows(readFollows()),
    readAlerts: uniqueStrings(readReadAlerts()),
    savedAlerts: uniqueStrings(readSavedAlerts()),
    issueInterests: uniqueStrings(readIssueInterests()),
    updatedAt: new Date().toISOString()
  };
}

function mergeLedgerSnapshots(local: AccountLedgerSnapshot, account: AccountLedgerSnapshot): AccountLedgerSnapshot {
  return {
    follows: uniqueFollows([...local.follows, ...account.follows]),
    readAlerts: uniqueStrings([...local.readAlerts, ...account.readAlerts]),
    savedAlerts: uniqueStrings([...local.savedAlerts, ...account.savedAlerts]),
    issueInterests: uniqueStrings([...local.issueInterests, ...account.issueInterests]),
    updatedAt: new Date().toISOString()
  };
}

function writeLocalLedger(snapshot: AccountLedgerSnapshot) {
  window.localStorage.setItem(followsKey, JSON.stringify(snapshot.follows));
  window.localStorage.setItem(readAlertsKey, JSON.stringify(snapshot.readAlerts));
  window.localStorage.setItem(alertsKey, JSON.stringify(snapshot.savedAlerts));
  window.localStorage.setItem(interestsKey, JSON.stringify(snapshot.issueInterests));
  dispatchPersistenceChanged(followsKey);
}

async function syncLocalLedgerToAccount() {
  if (typeof window === "undefined") return;

  const response = await fetch(accountLedgerEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(readLocalLedger())
  }).catch(() => null);

  if (!response?.ok) return;

  const data = (await response.json().catch(() => null)) as { ledger?: AccountLedgerSnapshot } | null;
  if (data?.ledger) writeLocalLedger(mergeLedgerSnapshots(readLocalLedger(), data.ledger));
}

async function hydrateSavedLedgerFromAccount() {
  if (typeof window === "undefined" || accountHydrationStarted) return;
  accountHydrationStarted = true;

  const response = await fetch(accountLedgerEndpoint, {
    cache: "no-store"
  }).catch(() => null);

  if (!response?.ok) return;

  const data = (await response.json().catch(() => null)) as { ledger?: AccountLedgerSnapshot } | null;
  if (!data?.ledger) return;

  writeLocalLedger(mergeLedgerSnapshots(readLocalLedger(), data.ledger));
  void syncLocalLedgerToAccount();
}

export function SaveTargetButton({
  className = mobileIconButtonClass,
  iconClassName = "h-7 w-7",
  label,
  showLabel = false,
  targetId,
  targetType
}: {
  className?: string;
  iconClassName?: string;
  label: string;
  showLabel?: boolean;
  targetId: string;
  targetType: FollowTargetType;
}) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    function refreshSaved() {
      setSaved(readFollows().some((record) => record.type === targetType && record.id === targetId));
    }

    refreshSaved();
    void hydrateSavedLedgerFromAccount();
    window.addEventListener("storage", refreshSaved);
    window.addEventListener(persistenceEvent, refreshSaved);

    return () => {
      window.removeEventListener("storage", refreshSaved);
      window.removeEventListener(persistenceEvent, refreshSaved);
    };
  }, [targetId, targetType]);

  function toggleSaved() {
    const follows = readFollows();
    const exists = follows.some((record) => record.type === targetType && record.id === targetId);
    const next = exists
      ? follows.filter((record) => !(record.type === targetType && record.id === targetId))
      : [...follows, { type: targetType, id: targetId }];

    writeJson(followsKey, next);
    if (!exists) {
      recordGamificationEvent(targetType === "bill" ? "track-bill" : "save-official", targetId);
    }
    setSaved(!exists);
  }

  return (
    <button type="button" onClick={toggleSaved} className={className} aria-label={saved ? `Saved ${label}` : label} aria-pressed={saved}>
      <Star className={`${iconClassName} ${saved ? "fill-[#ffb12b]" : ""}`} strokeWidth={1.9} aria-hidden="true" />
      {showLabel ? <span>{saved ? "Saved" : label}</span> : null}
    </button>
  );
}

export function SaveAlertButton({
  alertId,
  className = `absolute right-0 ${mobileIconButtonClass}`,
  label = "Save alert"
}: {
  alertId: string;
  className?: string;
  label?: string;
}) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    function refreshSaved() {
      setSaved(readSavedAlerts().includes(alertId));
    }

    refreshSaved();
    void hydrateSavedLedgerFromAccount();
    window.addEventListener("storage", refreshSaved);
    window.addEventListener(persistenceEvent, refreshSaved);

    return () => {
      window.removeEventListener("storage", refreshSaved);
      window.removeEventListener(persistenceEvent, refreshSaved);
    };
  }, [alertId]);

  function toggleSaved() {
    const alerts = readSavedAlerts();
    const next = alerts.includes(alertId) ? alerts.filter((id) => id !== alertId) : [...alerts, alertId];

    writeJson(alertsKey, next);
    setSaved(!alerts.includes(alertId));
  }

  const Icon = saved ? BookmarkCheck : Bell;

  return (
    <button type="button" onClick={toggleSaved} className={className} aria-label={saved ? "Alert saved" : label} aria-pressed={saved}>
      <Icon className={`h-7 w-7 ${saved ? "fill-[#ffb12b]" : ""}`} strokeWidth={1.9} aria-hidden="true" />
    </button>
  );
}

export function IssueInterestChips({ interests }: { interests: string[] }) {
  return <PolicyInterestsEditor interests={interests} compact />;
}

export function PolicyInterestsEditor({ compact = false, interests }: { compact?: boolean; interests: string[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    function refreshInterests() {
      const stored = readIssueInterests();
      const initial = stored.length ? stored : interests.slice(0, 4);

      setSelected(initial);
      if (!stored.length) writeJson(interestsKey, initial);
    }

    refreshInterests();
    void hydrateSavedLedgerFromAccount();
    window.addEventListener("storage", refreshInterests);
    window.addEventListener(persistenceEvent, refreshInterests);

    return () => {
      window.removeEventListener("storage", refreshInterests);
      window.removeEventListener(persistenceEvent, refreshInterests);
    };
  }, [interests]);

  function toggleInterest(interest: string) {
    if (!editing && !compact) return;

    const next = selected.includes(interest) ? selected.filter((item) => item !== interest) : [...selected, interest];
    setSelected(next);
    writeJson(interestsKey, next);
  }

  function resetInterests() {
    const next = interests.slice(0, 4);
    setSelected(next);
    writeJson(interestsKey, next);
  }

  return (
    <>
      {!compact ? (
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-[21px] font-medium leading-none">Policy Interests</h2>
            {editing ? <p className="mt-2 text-[13px] leading-snug text-white/48">Choose the topics that shape alerts and weekly civic briefs.</p> : null}
          </div>
          <button
            type="button"
            onClick={() => setEditing((current) => !current)}
            aria-label={editing ? "Finish editing policy interests" : "Edit policy interests"}
            className={`shrink-0 rounded-full border px-4 py-2 text-[14px] font-medium leading-none transition ${
              editing ? "border-[#43ed74]/30 bg-[#43ed74]/10 text-[#43ed74]" : "border-white/10 bg-white/8 text-[#ffb12b]"
            }`}
            aria-pressed={editing}
          >
            {editing ? "Done" : "Edit"}
          </button>
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2">
        {interests.map((interest) => {
          const active = selected.includes(interest);
          const disabled = !editing && !compact;

          return (
            <button
              key={interest}
              type="button"
              onClick={() => toggleInterest(interest)}
              disabled={disabled}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-[13px] font-semibold transition ${
                active ? "border-[#ffb12b]/38 bg-[#ffb12b]/12 text-[#ffb12b]" : "border-white/12 bg-white/5 text-white/58"
              } ${editing || compact ? "hover:border-[#ffb12b]/55 hover:bg-[#ffb12b]/10" : "cursor-default"}`}
              aria-pressed={active}
            >
              {active ? <Check className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" /> : null}
              {interest}
            </button>
          );
        })}
      </div>

      {!compact ? (
        <div className="mt-4 flex items-center justify-between gap-4 text-[12px] text-white/42">
          <span>{selected.length} selected</span>
          {editing ? (
            <button type="button" onClick={resetInterests} className="font-medium text-[#ffb12b]">
              Reset demo interests
            </button>
          ) : (
            <span>Saved to your civic ledger</span>
          )}
        </div>
      ) : null}
    </>
  );
}

export function SavedLedgerSummary() {
  const [counts, setCounts] = useState<SavedCounts>({ alerts: 0, bills: 0, interests: 0, officials: 0 });
  const [accountSynced, setAccountSynced] = useState(false);

  useEffect(() => {
    function refreshCounts() {
      const follows = readFollows();
      setCounts({
        alerts: readSavedAlerts().length,
        bills: follows.filter((record) => record.type === "bill").length,
        interests: readIssueInterests().length,
        officials: follows.filter((record) => record.type === "member").length
      });
    }

    refreshCounts();
    void hydrateSavedLedgerFromAccount();
    void fetch("/api/auth/session", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { authenticated?: boolean }) => setAccountSynced(Boolean(data.authenticated)))
      .catch(() => setAccountSynced(false));
    window.addEventListener("storage", refreshCounts);
    window.addEventListener(persistenceEvent, refreshCounts);
    window.addEventListener("capitol-ledger:follows-changed", refreshCounts);

    return () => {
      window.removeEventListener("storage", refreshCounts);
      window.removeEventListener(persistenceEvent, refreshCounts);
      window.removeEventListener("capitol-ledger:follows-changed", refreshCounts);
    };
  }, []);

  return (
    <div className="space-y-3">
      <div className={`rounded-full border px-3 py-2 text-center text-[12px] font-semibold ${accountSynced ? "border-[#43ed74]/30 bg-[#43ed74]/10 text-[#43ed74]" : "border-white/10 bg-white/5 text-white/46"}`}>
        {accountSynced ? "Account sync active" : "Browser fallback until sign-in"}
      </div>
      <div className="grid grid-cols-4 gap-2">
        <SavedCount value={counts.officials} label="Officials" />
        <SavedCount value={counts.bills} label="Bills" />
        <SavedCount value={counts.alerts} label="Alerts" />
        <SavedCount value={counts.interests} label="Issues" />
      </div>
    </div>
  );
}

function SavedCount({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-2 py-4 text-center">
      <div className="text-[22px] font-medium leading-none text-[#ffb12b]">{value}</div>
      <div className="mt-2 text-[10px] text-white/50">{label}</div>
    </div>
  );
}
