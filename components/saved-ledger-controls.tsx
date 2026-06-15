"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, BookmarkCheck, Check, Star } from "lucide-react";
import { MobileGlassScrollFrame } from "@/components/mobile-glass-scroll-frame";
import { mobileIconButtonClass } from "@/components/mobile-ui";
import { hasActiveBrowserSession } from "@/lib/browser-auth-state";
import { readLocalNotificationPreferences } from "@/lib/browser-account-profile";
import { recordGamificationEvent } from "@/lib/browser-gamification";
import type { AccountLedgerSnapshot, FollowTargetType, SavedFollowRecord } from "@/types/capitol";

const followsKey = "capitol-ledger:follows";
const alertsKey = "capitol-ledger:saved-alerts";
const interestsKey = "capitol-ledger:issue-interests";
const readAlertsKey = "capitol-ledger:read-alerts";
const persistenceEvent = "capitol-ledger:persistence-changed";
const accountLedgerEndpoint = "/api/account/ledger";

let accountHydrationPromise: Promise<void> | null = null;

const premiumEyebrowClass = "text-[12px] font-semibold uppercase tracking-[0.08em] text-white/46";
const premiumCardTitleClass = "text-[22px] font-medium leading-tight text-white";
const premiumCardDescriptionClass = "mt-2 text-[13px] leading-snug text-white/54";

type SavedCounts = {
  alerts: number;
  bills: number;
  interests: number;
  officials: number;
};

type LedgerStorageKey = typeof alertsKey | typeof followsKey | typeof interestsKey | typeof readAlertsKey;

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;

  try {
    return JSON.parse(window.localStorage.getItem(key) ?? "") as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: LedgerStorageKey, value: T) {
  window.localStorage.setItem(key, JSON.stringify(value));
  dispatchPersistenceChanged(key);
  void syncLocalLedgerToAccount(key);
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
  return readIssueInterestsState().interests;
}

function readIssueInterestsState() {
  if (typeof window === "undefined") {
    return {
      hasStoredValue: false,
      interests: [] as string[]
    };
  }

  try {
    const stored = window.localStorage.getItem(interestsKey);
    if (stored === null) {
      return {
        hasStoredValue: false,
        interests: [] as string[]
      };
    }

    const parsed = JSON.parse(stored) as unknown;
    const interests = Array.isArray(parsed) ? uniqueStrings(parsed.filter((value): value is string => typeof value === "string")) : [];

    return {
      hasStoredValue: true,
      interests
    };
  } catch {
    return {
      hasStoredValue: false,
      interests: [] as string[]
    };
  }
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

function countEnabledNotificationPreferences() {
  const preferences = readLocalNotificationPreferences();
  return [preferences.districtAlerts, preferences.voteReminders, preferences.weeklyBrief].filter(Boolean).length;
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

function getSavedCounts(snapshot?: AccountLedgerSnapshot | null, alertCount?: number): SavedCounts {
  const follows = snapshot?.follows ?? readFollows();

  return {
    alerts: alertCount ?? countEnabledNotificationPreferences(),
    bills: follows.filter((record) => record.type === "bill").length,
    interests: snapshot?.issueInterests.length ?? readIssueInterests().length,
    officials: follows.filter((record) => record.type === "member").length
  };
}

function writeLocalLedger(snapshot: AccountLedgerSnapshot) {
  window.localStorage.setItem(followsKey, JSON.stringify(snapshot.follows));
  window.localStorage.setItem(readAlertsKey, JSON.stringify(snapshot.readAlerts));
  window.localStorage.setItem(alertsKey, JSON.stringify(snapshot.savedAlerts));
  window.localStorage.setItem(interestsKey, JSON.stringify(snapshot.issueInterests));
  dispatchPersistenceChanged(followsKey);
}

function getLedgerPatchForKey(key?: LedgerStorageKey): Partial<AccountLedgerSnapshot> {
  if (key === followsKey) return { follows: uniqueFollows(readFollows()) };
  if (key === alertsKey) return { savedAlerts: uniqueStrings(readSavedAlerts()) };
  if (key === readAlertsKey) return { readAlerts: uniqueStrings(readReadAlerts()) };
  if (key === interestsKey) return { issueInterests: uniqueStrings(readIssueInterests()) };
  return readLocalLedger();
}

async function syncLocalLedgerToAccount(key?: LedgerStorageKey) {
  if (typeof window === "undefined") return;
  if (!(await hasActiveBrowserSession())) return;

  const response = await fetch(accountLedgerEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(getLedgerPatchForKey(key))
  }).catch(() => null);

  if (!response?.ok) return;

  const data = (await response.json().catch(() => null)) as { ledger?: AccountLedgerSnapshot } | null;
  if (data?.ledger) writeLocalLedger(data.ledger);
}

async function hydrateSavedLedgerFromAccount() {
  if (typeof window === "undefined") return;
  if (!(await hasActiveBrowserSession())) return;
  if (accountHydrationPromise) return accountHydrationPromise;

  accountHydrationPromise = hydrateSavedLedgerFromApi().finally(() => {
    accountHydrationPromise = null;
  });
  return accountHydrationPromise;
}

async function hydrateSavedLedgerFromApi() {
  const response = await fetch(accountLedgerEndpoint, {
    cache: "no-store"
  }).catch(() => null);

  if (!response?.ok) return;

  const data = (await response.json().catch(() => null)) as { ledger?: AccountLedgerSnapshot } | null;
  if (!data?.ledger) return;

  writeLocalLedger(data.ledger);
}

export function SaveTargetButton({
  className = mobileIconButtonClass,
  iconClassName = "h-7 w-7",
  label,
  showFeedback = true,
  showLabel = false,
  targetId,
  targetType
}: {
  className?: string;
  iconClassName?: string;
  label: string;
  showFeedback?: boolean;
  showLabel?: boolean;
  targetId: string;
  targetType: FollowTargetType;
}) {
  const [saved, setSaved] = useState(false);
  const [feedback, setFeedback] = useState<"saved" | "removed" | null>(null);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), 1800);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  useEffect(() => {
    function refreshSaved() {
      setSaved(readFollows().some((record) => record.type === targetType && record.id === targetId));
    }

    refreshSaved();
    window.addEventListener("storage", refreshSaved);
    window.addEventListener(persistenceEvent, refreshSaved);
    void hydrateSavedLedgerFromAccount().then(refreshSaved);

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
    setFeedback(exists ? "removed" : "saved");
  }

  return (
    <div className="relative">
      <button type="button" onClick={toggleSaved} className={className} aria-label={saved ? `Saved ${label}` : label} aria-pressed={saved}>
        <Star className={`${iconClassName} ${saved ? "fill-[#ffb12b]" : ""}`} strokeWidth={1.9} aria-hidden="true" />
        {showLabel ? <span>{saved ? "Saved" : label}</span> : null}
      </button>
      {showFeedback && feedback ? (
        <span
          role="status"
          aria-live="polite"
          className="pointer-events-none absolute -bottom-11 right-0 whitespace-nowrap rounded-full border border-white/12 bg-[#031126]/95 px-3 py-1 text-[12px] font-medium text-white/78 shadow-[0_12px_32px_rgba(0,0,0,0.35)]"
        >
          {feedback === "saved" ? "Saved to your ledger" : "Removed from your ledger"}
        </span>
      ) : null}
    </div>
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
    window.addEventListener("storage", refreshSaved);
    window.addEventListener(persistenceEvent, refreshSaved);
    void hydrateSavedLedgerFromAccount().then(refreshSaved);

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

export function PolicyInterestsEditor({
  compact = false,
  initialSelectedInterests,
  interests
}: {
  compact?: boolean;
  initialSelectedInterests?: string[];
  interests: string[];
}) {
  const [selected, setSelected] = useState<string[]>(() => uniqueStrings(initialSelectedInterests ?? []));
  const [editing, setEditing] = useState(false);
  const seededInitialInterestsRef = useRef<string | null>(null);

  useEffect(() => {
    const seededInitialInterests = uniqueStrings(initialSelectedInterests ?? []);
    const seededInitialKey = initialSelectedInterests ? JSON.stringify(seededInitialInterests) : null;

    function readCurrentInterests() {
      const storedState = readIssueInterestsState();
      return storedState.hasStoredValue ? storedState.interests : seededInitialInterests;
    }

    function refreshInterests() {
      setSelected(readCurrentInterests());
    }

    if (seededInitialKey && seededInitialInterestsRef.current !== seededInitialKey) {
      seededInitialInterestsRef.current = seededInitialKey;
      window.localStorage.setItem(interestsKey, JSON.stringify(seededInitialInterests));
      setSelected(seededInitialInterests);
    } else {
      async function hydrateInterestsBeforeRefresh() {
        if (await hasActiveBrowserSession()) await hydrateSavedLedgerFromAccount();
        refreshInterests();
      }

      void hydrateInterestsBeforeRefresh();
    }

    window.addEventListener("storage", refreshInterests);
    window.addEventListener(persistenceEvent, refreshInterests);

    return () => {
      window.removeEventListener("storage", refreshInterests);
      window.removeEventListener(persistenceEvent, refreshInterests);
    };
  }, [initialSelectedInterests]);

  function toggleInterest(interest: string) {
    if (!editing && !compact) return;

    const next = selected.includes(interest) ? selected.filter((item) => item !== interest) : [...selected, interest];
    setSelected(next);
    writeJson(interestsKey, next);
  }

  function resetInterests() {
    const next: string[] = [];
    setSelected(next);
    writeJson(interestsKey, next);
  }

  return (
    <>
      {!compact ? (
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
          <div className="min-w-0">
            <div className={premiumEyebrowClass}>Civic Signals</div>
            <h2 className={`${premiumCardTitleClass} mt-2`}>Policy Interests</h2>
            <p className={premiumCardDescriptionClass}>
              {editing ? "Choose the topics that shape alerts and weekly civic briefs." : "Topics currently shaping alerts and weekly civic briefs."}
            </p>
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

      {compact ? (
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
                className={`rounded-full border px-3 py-2 text-[13px] font-medium transition disabled:cursor-default ${
                  active
                    ? "border-[#ffb12b]/34 bg-[#ffb12b]/14 text-[#ffcf54]"
                    : "border-white/10 bg-white/[0.035] text-white/48"
                }`}
              >
                {interest}
              </button>
            );
          })}
        </div>
      ) : (
        <MobileGlassScrollFrame heightClassName="max-h-[168px]" className="p-3 pb-4">
          <div className="flex flex-wrap gap-2">
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
        </MobileGlassScrollFrame>
      )}

      {!compact ? (
        <div className="mt-4 flex items-center justify-between gap-4 text-[12px] text-white/42">
          <span>{selected.length} selected</span>
          {editing ? (
            <button type="button" onClick={resetInterests} className="font-medium text-[#ffb12b]">
              Reset interests
            </button>
          ) : (
            <span>Saved to your civic ledger</span>
          )}
        </div>
      ) : null}
    </>
  );
}

export function SavedLedgerSummary({ initialAlertCount, initialLedger }: { initialAlertCount?: number; initialLedger?: AccountLedgerSnapshot | null }) {
  const [counts, setCounts] = useState<SavedCounts>(() => getSavedCounts(initialLedger, initialAlertCount));
  const [accountSynced, setAccountSynced] = useState(false);

  useEffect(() => {
    function refreshCounts() {
      setCounts(getSavedCounts());
    }

    if (initialLedger) writeLocalLedger(initialLedger);
    refreshCounts();
    void hasActiveBrowserSession().then(setAccountSynced);
    window.addEventListener("storage", refreshCounts);
    window.addEventListener(persistenceEvent, refreshCounts);
    window.addEventListener("capitol-ledger:follows-changed", refreshCounts);
    void hydrateSavedLedgerFromAccount().then(refreshCounts);

    return () => {
      window.removeEventListener("storage", refreshCounts);
      window.removeEventListener(persistenceEvent, refreshCounts);
      window.removeEventListener("capitol-ledger:follows-changed", refreshCounts);
    };
  }, [initialLedger]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
        <span className="rounded-full border border-[#43ed74]/24 bg-[#43ed74]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#74f49a]">
          Free
        </span>
        <span className="min-w-0 text-[12px] leading-snug text-white/50">
          Saves your watchlist. Pro converts it into briefs and exportable reports.
        </span>
      </div>
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
