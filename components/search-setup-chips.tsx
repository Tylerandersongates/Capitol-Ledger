"use client";

import { Check, CheckCircle2, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MobileGlassScrollFrame } from "@/components/mobile-glass-scroll-frame";
import {
  accountProfileChangedEvent,
  defaultDistrictProfile,
  fetchAccountProfile,
  readLocalDistrictProfile,
  writeLocalDistrictProfile,
  type LocalDistrictProfile
} from "@/lib/browser-account-profile";
import { hasActiveBrowserSession } from "@/lib/browser-auth-state";
import { stateCodeFromDistrictCode } from "@/lib/beta-district-presets";
import { issueSignals } from "@/lib/issue-signals";
import type { AccountLedgerSnapshot } from "@/types/capitol";

const issueInterestsKey = "capitol-ledger:issue-interests";
const issueInterestsPendingSyncKey = "capitol-ledger:issue-interests-pending-sync";
const persistenceEvent = "capitol-ledger:persistence-changed";
const accountLedgerEndpoint = "/api/account/ledger";
let issueInterestSyncVersion = 0;

const stateCodeByName: Record<string, string> = {
  Alaska: "AK",
  California: "CA",
  Massachusetts: "MA",
  "New York": "NY",
  Texas: "TX",
  Vermont: "VT"
};

type SetupChip = {
  href: string;
  id: string;
  label: string;
  tone: "district" | "interest";
};

type SyncState = "saved" | "syncing";

export function SearchSetupChips({ focus }: { focus?: string }) {
  const [interests, setInterests] = useState<string[]>([]);
  const [district, setDistrict] = useState<Required<LocalDistrictProfile>>(defaultDistrictProfile);
  const [editing, setEditing] = useState(false);
  const [syncState, setSyncState] = useState<SyncState>("saved");

  useEffect(() => {
    let active = true;

    function refreshSetup() {
      setDistrict(readLocalDistrictProfile());
      setInterests(readLocalIssueInterests());
      setSyncState(hasPendingIssueInterestSync() ? "syncing" : "saved");
    }

    refreshSetup();
    void fetchAccountProfile().then((profile) => {
      if (!active || !profile) return;
      writeLocalDistrictProfile(profile);
      refreshSetup();
    });
    void hydrateIssueInterestsFromAccount().then((accountInterests) => {
      if (!active || !accountInterests) return;
      setInterests(accountInterests);
      setSyncState(hasPendingIssueInterestSync() ? "syncing" : "saved");
    });

    window.addEventListener("storage", refreshSetup);
    window.addEventListener(accountProfileChangedEvent, refreshSetup);
    window.addEventListener(persistenceEvent, refreshSetup);

    return () => {
      active = false;
      window.removeEventListener("storage", refreshSetup);
      window.removeEventListener(accountProfileChangedEvent, refreshSetup);
      window.removeEventListener(persistenceEvent, refreshSetup);
    };
  }, []);

  const chips = useMemo(() => buildSetupChips(interests, district, focus), [district, focus, interests]);
  const selectedInterestSet = useMemo(() => new Set(interests), [interests]);

  function toggleInterest(interest: string) {
    const selected = new Set(interests);
    const next = selected.has(interest) ? interests.filter((item) => item !== interest) : uniqueStrings([...interests, interest]);

    setInterests(next);
    setSyncState("syncing");
    writeLocalIssueInterests(next, { pendingSync: true });
    void syncIssueInterestsToAccount(next);
  }

  return (
    <div className="mt-4 rounded-[1.15rem] border border-white/10 bg-[linear-gradient(180deg,rgba(29,83,145,0.18)_0%,rgba(7,23,50,0.58)_100%)] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/42">From your setup</div>
          <div className="mt-1 text-[12px] leading-snug text-white/52">
            Saved interests plus your default district state{district.districtState ? `, currently ${district.districtState}` : ""}.
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <SyncBadge state={syncState} />
          <button
            type="button"
            onClick={() => setEditing((current) => !current)}
            className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold transition ${
              editing ? "border-[#43ed74]/30 bg-[#43ed74]/10 text-[#43ed74]" : "border-white/10 bg-white/[0.045] text-[#ffb12b]"
            }`}
            aria-pressed={editing}
          >
            {editing ? "Done" : "Edit interests"}
          </button>
        </div>
      </div>

      {editing ? (
        <MobileGlassScrollFrame frameClassName="mt-3" heightClassName="max-h-[154px]">
          <div className="flex flex-wrap gap-2">
            {issueSignals.map((interest) => {
              const active = selectedInterestSet.has(interest);

              return (
                <button
                  key={interest}
                  type="button"
                  onClick={() => toggleInterest(interest)}
                  className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-[12px] font-semibold transition ${
                    active ? "border-[#ffb12b]/40 bg-[#ffb12b]/12 text-[#ffb12b]" : "border-white/12 bg-white/5 text-white/58 hover:border-[#ffb12b]/35 hover:text-white/78"
                  }`}
                  aria-pressed={active}
                >
                  {active ? <Check className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" /> : null}
                  {interest}
                </button>
              );
            })}
          </div>
        </MobileGlassScrollFrame>
      ) : (
        <MobileGlassScrollFrame axis="horizontal" ariaLabel="Setup-based search shortcuts" frameClassName="mt-3">
          {chips.length ? (
            <div className="grid w-max auto-cols-max grid-flow-col grid-rows-2 gap-2">
              {chips.map((chip) => (
                <Link
                  key={chip.id}
                  href={chip.href}
                  className={`flex h-9 items-center rounded-full border px-3 text-[12px] font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition ${
                    chip.tone === "district"
                      ? "border-[#43ed74]/28 bg-[#43ed74]/10 text-[#74f49a] hover:border-[#43ed74]/45 hover:bg-[#43ed74]/14"
                      : "border-[#ffb12b]/24 bg-[#ffb12b]/7 text-white/66 hover:border-[#ffb12b]/38 hover:bg-[#ffb12b]/12 hover:text-white"
                  }`}
                >
                  {chip.label}
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-3 text-[12px] leading-snug text-white/52">
              No saved issue interests yet. Tap Edit interests to add topics here.
            </div>
          )}
        </MobileGlassScrollFrame>
      )}
    </div>
  );
}

function SyncBadge({ state }: { state: SyncState }) {
  const syncing = state === "syncing";

  return (
    <span
      className={`inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-semibold ${
        syncing ? "border-[#ffb12b]/28 bg-[#ffb12b]/10 text-[#ffcf54]" : "border-[#43ed74]/24 bg-[#43ed74]/10 text-[#74f49a]"
      }`}
    >
      {syncing ? <RefreshCw className="h-3 w-3 animate-spin" strokeWidth={2} aria-hidden="true" /> : <CheckCircle2 className="h-3 w-3" strokeWidth={2} aria-hidden="true" />}
      {syncing ? "Syncing" : "Saved"}
    </span>
  );
}

function readLocalIssueInterests() {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(issueInterestsKey) ?? "[]") as unknown;
    if (!Array.isArray(parsed)) return [];

    const interests = Array.from(new Set(parsed.filter((value): value is string => typeof value === "string" && value.trim().length > 0)));
    return interests;
  } catch {
    return [];
  }
}

function writeLocalIssueInterests(interests: string[], options: { pendingSync?: boolean } = {}) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(issueInterestsKey, JSON.stringify(uniqueStrings(interests)));
    if (options.pendingSync === true) {
      window.localStorage.setItem(issueInterestsPendingSyncKey, "1");
    } else if (options.pendingSync === false) {
      window.localStorage.removeItem(issueInterestsPendingSyncKey);
    }
    window.dispatchEvent(new Event(persistenceEvent));
  } catch {
    // Search shortcuts can still render from in-memory state if local persistence is unavailable.
  }
}

function hasPendingIssueInterestSync() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(issueInterestsPendingSyncKey) === "1";
}

async function hydrateIssueInterestsFromAccount() {
  if (typeof window === "undefined") return null;
  if (!(await hasActiveBrowserSession())) return null;

  const response = await fetch(accountLedgerEndpoint, { cache: "no-store" }).catch(() => null);
  if (!response?.ok) return null;

  const data = (await response.json().catch(() => null)) as { ledger?: AccountLedgerSnapshot } | null;
  const accountInterests = uniqueStrings(data?.ledger?.issueInterests ?? []);
  const localInterests = readLocalIssueInterests();

  if (hasPendingIssueInterestSync()) {
    const mergedInterests = uniqueStrings([...accountInterests, ...localInterests]);
    writeLocalIssueInterests(mergedInterests, { pendingSync: true });
    void syncIssueInterestsToAccount(mergedInterests);
    return mergedInterests;
  }

  if (localInterests.length) {
    const mergedInterests = uniqueStrings([...accountInterests, ...localInterests]);
    if (mergedInterests.length !== accountInterests.length) {
      writeLocalIssueInterests(mergedInterests, { pendingSync: true });
      void syncIssueInterestsToAccount(mergedInterests);
      return mergedInterests;
    }
  }

  writeLocalIssueInterests(accountInterests, { pendingSync: false });
  return accountInterests;
}

async function syncIssueInterestsToAccount(interests: string[]) {
  if (typeof window === "undefined") return;
  if (!(await hasActiveBrowserSession())) {
    writeLocalIssueInterests(interests, { pendingSync: false });
    return;
  }

  const syncVersion = ++issueInterestSyncVersion;
  const response = await fetch(accountLedgerEndpoint, {
    body: JSON.stringify({ issueInterests: uniqueStrings(interests) }),
    headers: {
      "Content-Type": "application/json"
    },
    method: "POST"
  }).catch(() => null);

  if (!response?.ok) return;

  const data = (await response.json().catch(() => null)) as { ledger?: AccountLedgerSnapshot } | null;
  if (data?.ledger && syncVersion === issueInterestSyncVersion) writeLocalIssueInterests(data.ledger.issueInterests, { pendingSync: false });
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function buildSetupChips(interests: string[], district: Required<LocalDistrictProfile>, focus?: string): SetupChip[] {
  const setupChips = interests.map((interest) => ({
    href: searchShortcutHref({ focus, q: interest, type: "all" }),
    id: `interest-${interest}`,
    label: interest,
    tone: "interest" as const
  }));

  const stateCode = stateCodeFromDistrictCode(district.districtCode) ?? stateCodeByName[district.districtState];
  const districtChip = stateCode
    ? {
        href: searchShortcutHref({ focus, state: stateCode, type: "members" }),
        id: `district-${stateCode}`,
        label: district.districtState,
        tone: "district" as const
      }
    : undefined;

  return districtChip ? [...setupChips, districtChip] : setupChips;
}

function searchShortcutHref({
  focus,
  q,
  state,
  type
}: {
  focus?: string;
  q?: string;
  state?: string;
  type: "all" | "members";
}) {
  const params = new URLSearchParams();
  params.set("type", type);
  if (q) params.set("q", q);
  if (state) params.set("state", state);
  if (focus) params.set("focus", focus);
  return `/search?${params.toString()}`;
}
