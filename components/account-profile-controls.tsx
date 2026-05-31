"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell, Check, CheckCircle2, ChevronRight, LocateFixed, LockKeyhole, MapPin, Search, UserRound, Vote } from "lucide-react";
import {
  accountProfileChangedEvent,
  defaultDistrictProfile,
  fetchAccountProfile,
  readLocalDistrictProfile,
  readLocalNotificationPreferences,
  syncAccountProfile,
  writeLocalDistrictProfile,
  writeLocalNotificationPreferences,
  type LocalDistrictProfile
} from "@/lib/browser-account-profile";
import { useSubscriptionState } from "@/components/subscription-controls";
import { betaDistrictPresets, betaTesterStateOptions, getMatchedOfficials } from "@/lib/beta-district-presets";
import { isPlanFeatureEnabled } from "@/lib/subscription-plans";
import type { AccountNotificationPreferences, Member } from "@/types/capitol";

type NotificationPreferenceKey = keyof AccountNotificationPreferences;

const preferenceRows: { detail: string; key: NotificationPreferenceKey; label: string }[] = [
  {
    detail: "Floor votes and committee movement",
    key: "voteReminders",
    label: "Vote reminders"
  },
  {
    detail: "Federal, state, and local updates",
    key: "districtAlerts",
    label: "District alerts"
  },
  {
    detail: "Personal civic intelligence summary",
    key: "weeklyBrief",
    label: "Weekly brief"
  }
];

const issueInterestsKey = "capitol-ledger:issue-interests";
const persistenceEvent = "capitol-ledger:persistence-changed";

function buildDistrictProfile(input: string): Required<LocalDistrictProfile> {
  const value = input.trim() || "Austin, Texas";
  const normalized = value.toLowerCase();
  const matched = betaDistrictPresets.find((district) => district.input.some((term) => normalized.includes(term)));

  if (matched) {
    return {
      districtCode: matched.code,
      districtLabel: matched.label,
      districtState: matched.state
    };
  }

  const explicitCode = value.match(/[A-Z]{2}-\d{1,2}/i)?.[0]?.toUpperCase() ?? defaultDistrictProfile.districtCode;
  const cityLabel = value.replace(/\s*[-·]\s*[A-Z]{2}-\d{1,2}/i, "").trim() || "Austin, Texas";

  return {
    districtCode: explicitCode,
    districtLabel: `${cityLabel} - ${explicitCode}`,
    districtState: cityLabel.split(",").at(1)?.trim() || defaultDistrictProfile.districtState
  };
}

function useDistrictProfile() {
  const [district, setDistrict] = useState(defaultDistrictProfile);

  useEffect(() => {
    function refreshDistrict() {
      setDistrict(readLocalDistrictProfile());
    }

    refreshDistrict();
    void fetchAccountProfile().then((profile) => {
      if (!profile) return;
      writeLocalDistrictProfile(profile);
      setDistrict(readLocalDistrictProfile());
    });
    window.addEventListener("storage", refreshDistrict);
    window.addEventListener(accountProfileChangedEvent, refreshDistrict);

    return () => {
      window.removeEventListener("storage", refreshDistrict);
      window.removeEventListener(accountProfileChangedEvent, refreshDistrict);
    };
  }, []);

  return district;
}

function readIssueInterestsForSetup() {
  if (typeof window === "undefined") return [] as string[];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(issueInterestsKey) ?? "[]") as unknown;
    if (!Array.isArray(parsed)) return [];
    return Array.from(new Set(parsed.filter((value): value is string => typeof value === "string" && value.trim().length > 0)));
  } catch {
    return [];
  }
}

export function AccountDistrictDisplay() {
  const district = useDistrictProfile();

  return <p className="mt-2 text-[17px] text-white/52">{district.districtLabel}</p>;
}

export function AccountDistrictSettingRow() {
  const district = useDistrictProfile();

  return (
    <Link href="/onboarding" className="grid grid-cols-[34px_1fr_auto] items-center gap-3 py-4">
      <span className="text-[#ffb12b]">
        <MapPin className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-[16px] font-semibold text-white">District</span>
        <span className="mt-1 block truncate text-[13px] text-white/52">{district.districtLabel}</span>
      </span>
      <ChevronRight className="h-5 w-5 text-white/42" strokeWidth={1.8} aria-hidden="true" />
    </Link>
  );
}

export function OnboardingDistrictSetup() {
  const district = useDistrictProfile();
  const [districtInput, setDistrictInput] = useState("Austin, Texas");
  const [matchedDistrict, setMatchedDistrict] = useState(defaultDistrictProfile);

  useEffect(() => {
    setMatchedDistrict(district);
    setDistrictInput(district.districtLabel.replace(/\s+-\s+[A-Z]{2}-\d{1,2}$/i, ""));
  }, [district]);

  function saveDistrict(nextDistrict: Required<LocalDistrictProfile>) {
    setMatchedDistrict(nextDistrict);
    writeLocalDistrictProfile(nextDistrict);
    void syncAccountProfile(nextDistrict);
  }

  function matchDistrict() {
    saveDistrict(buildDistrictProfile(districtInput));
  }

  function useCurrentLocation() {
    const nextDistrict = buildDistrictProfile("Austin, Texas");
    setDistrictInput("Austin, Texas");
    saveDistrict(nextDistrict);
  }

  function choosePreset(preset: (typeof betaTesterStateOptions)[number]) {
    setDistrictInput(preset.label.replace(/\s+-\s+[A-Z]{2}-\d{1,2}$/i, ""));
    saveDistrict({
      districtCode: preset.code,
      districtLabel: preset.label,
      districtState: preset.state
    });
  }

  return (
    <>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          matchDistrict();
        }}
        className="mt-5 rounded-2xl border border-white/10 bg-[#031126]/88 p-4"
      >
        <div className="flex items-center gap-3">
          <Search className="h-6 w-6 shrink-0 text-white/52" strokeWidth={1.8} aria-hidden="true" />
          <input
            name="district"
            value={districtInput}
            onChange={(event) => setDistrictInput(event.target.value)}
            className="min-w-0 flex-1 bg-transparent text-[17px] text-white outline-none placeholder:text-white/42"
            placeholder="Enter address or city"
          />
        </div>
        <div className="mt-4 grid grid-cols-[1fr_auto] gap-3">
          <button type="submit" className="h-11 rounded-xl bg-gradient-to-r from-[#ffdf63] via-[#ffb12b] to-[#ff8a00] text-[15px] font-semibold text-[#071225]">
            Match District
          </button>
          <button type="button" onClick={useCurrentLocation} className="grid h-11 w-11 place-items-center rounded-xl border border-white/12 bg-white/5 text-[#ffb12b]" aria-label="Use location">
            <LocateFixed className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
          </button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {betaTesterStateOptions.map((preset) => (
            <button
              key={preset.code}
              type="button"
              onClick={() => choosePreset(preset)}
              className={`rounded-full border px-3 py-2 text-[12px] font-semibold transition ${
                matchedDistrict.districtCode === preset.code
                  ? "border-[#ffb12b]/60 bg-[#ffb12b]/16 text-[#ffb12b]"
                  : "border-white/10 bg-white/5 text-white/58"
              }`}
            >
              {preset.state}
            </button>
          ))}
        </div>
      </form>

      <div className="mt-5 rounded-2xl border border-[#43ed74]/30 bg-[#43ed74]/10 p-4">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-[#43ed74]" strokeWidth={1.9} aria-hidden="true" />
          <div>
            <div className="text-[17px] font-semibold text-white">District matched</div>
            <div className="mt-1 text-[14px] text-white/58">{matchedDistrict.districtLabel}</div>
          </div>
        </div>
      </div>
    </>
  );
}

export function OnboardingMatchedOfficials({ members }: { members: Member[] }) {
  const district = useDistrictProfile();
  const officials = getMatchedOfficials(members, district.districtCode).slice(0, 4);
  const stateCode = district.districtCode?.slice(0, 2) ?? "TX";

  return (
    <div className="mt-5 divide-y divide-white/8">
      {officials.map((official) => (
        <Link key={official.bioguideId} href={`/members/${official.bioguideId}`} className="grid grid-cols-[44px_1fr_auto] items-center gap-3 py-4">
          {official.photoUrl ? (
            <Image src={official.photoUrl} alt="" width={44} height={44} className="h-11 w-11 rounded-full border border-rust/35 object-cover" />
          ) : (
            <span className="grid h-11 w-11 place-items-center rounded-full border border-rust/35 bg-white/5 text-[#ffb12b]">
              <UserRound className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
            </span>
          )}
          <span className="min-w-0">
            <span className="block truncate text-[16px] font-semibold text-white">{official.fullName.replace(/^Sen\.\s+|^Rep\.\s+/, "")}</span>
            <span className="mt-1 block truncate text-[13px] text-white/52">
              U.S. {official.chamber === "Senate" ? "Senator" : "Representative"} · {official.state}
              {official.district ? `-${official.district}` : ""} · {official.party}
            </span>
          </span>
          <ChevronRight className="h-5 w-5 text-white/42" strokeWidth={1.8} aria-hidden="true" />
        </Link>
      ))}
      <Link href={`/search?type=members&state=${stateCode}`} className="flex items-center justify-between py-4 text-[14px] font-semibold text-[#ffb12b]">
        View all matched officials
        <ChevronRight className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
      </Link>
    </div>
  );
}

export function OnboardingSetupFlow({ members }: { members: Member[] }) {
  const district = useDistrictProfile();
  const [issueCount, setIssueCount] = useState(0);
  const [enabledAlertCount, setEnabledAlertCount] = useState(0);

  const officialsCount = getMatchedOfficials(members, district.districtCode).length;

  useEffect(() => {
    function refreshSetupSignals() {
      const interests = readIssueInterestsForSetup();
      const preferences = readLocalNotificationPreferences();
      const enabledCount = [preferences.voteReminders, preferences.districtAlerts, preferences.weeklyBrief].filter(Boolean).length;

      setIssueCount(interests.length);
      setEnabledAlertCount(enabledCount);
    }

    refreshSetupSignals();
    void fetchAccountProfile().then(() => refreshSetupSignals());

    window.addEventListener("storage", refreshSetupSignals);
    window.addEventListener(accountProfileChangedEvent, refreshSetupSignals);
    window.addEventListener(persistenceEvent, refreshSetupSignals);

    return () => {
      window.removeEventListener("storage", refreshSetupSignals);
      window.removeEventListener(accountProfileChangedEvent, refreshSetupSignals);
      window.removeEventListener(persistenceEvent, refreshSetupSignals);
    };
  }, []);

  const steps = [
    {
      complete: Boolean(district.districtCode),
      detail: district.districtCode ? `${district.districtCode} located` : "Locate district",
      icon: <MapPin />,
      label: "District"
    },
    {
      complete: officialsCount > 0,
      detail: officialsCount > 0 ? `${officialsCount} matched` : "Find officials",
      icon: <UserRound />,
      label: "Officials"
    },
    {
      complete: issueCount > 0,
      detail: issueCount > 0 ? `${issueCount} signals selected` : "Choose signals",
      icon: <Vote />,
      label: "Issues"
    },
    {
      complete: enabledAlertCount > 0,
      detail: enabledAlertCount > 0 ? `${enabledAlertCount} reminders active` : "Set reminders",
      icon: <Bell />,
      label: "Alerts"
    }
  ];

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-[21px] font-medium leading-none">Setup Flow</h2>
        <span className="text-[13px] font-semibold text-[#ffb12b]">{district.districtState} matched</span>
      </div>
      <div className="mt-5 grid gap-3">
        {steps.map((step, index) => (
          <div key={step.label} className="grid grid-cols-[42px_1fr_auto] items-center gap-3 rounded-2xl border border-white/8 bg-white/4 p-4">
            <span className={`grid h-10 w-10 place-items-center rounded-full ${step.complete ? "bg-[#43ed74]/14 text-[#43ed74]" : "bg-[#ffb12b]/12 text-[#ffb12b]"}`}>
              {step.complete ? <Check className="h-5 w-5" strokeWidth={2.1} aria-hidden="true" /> : <span className="[&>svg]:h-5 [&>svg]:w-5 [&>svg]:stroke-[1.8]">{step.icon}</span>}
            </span>
            <div>
              <div className="text-[16px] font-semibold text-white">{step.label}</div>
              <div className="mt-1 text-[13px] text-white/50">{step.detail}</div>
            </div>
            <span className="text-[13px] font-semibold text-white/36">0{index + 1}</span>
          </div>
        ))}
      </div>
    </>
  );
}

export function NotificationPreferencesEditor({ compact = false }: { compact?: boolean }) {
  const [subscription] = useSubscriptionState();
  const [preferences, setPreferences] = useState(readLocalNotificationPreferences);
  const weeklyBriefUnlocked = isPlanFeatureEnabled(subscription.plan, "weeklyBrief");

  useEffect(() => {
    function refreshPreferences() {
      setPreferences(readLocalNotificationPreferences());
    }

    refreshPreferences();
    void fetchAccountProfile().then((profile) => {
      if (!profile) return;
      writeLocalNotificationPreferences(profile.notificationPreferences);
      setPreferences(readLocalNotificationPreferences());
    });
    window.addEventListener("storage", refreshPreferences);
    window.addEventListener(accountProfileChangedEvent, refreshPreferences);

    return () => {
      window.removeEventListener("storage", refreshPreferences);
      window.removeEventListener(accountProfileChangedEvent, refreshPreferences);
    };
  }, []);

  function togglePreference(key: NotificationPreferenceKey) {
    const next = {
      ...preferences,
      [key]: !preferences[key]
    };

    setPreferences(next);
    writeLocalNotificationPreferences(next);
    void syncAccountProfile({ notificationPreferences: next });
  }

  return (
    <div className={compact ? "mt-5 space-y-3" : "mt-5 space-y-4"}>
      {preferenceRows.map((row) => {
        const locked = row.key === "weeklyBrief" && !weeklyBriefUnlocked;
        const enabled = locked ? false : preferences[row.key];

        return (
          <button
            key={row.key}
            type="button"
            onClick={() => {
              if (!locked) togglePreference(row.key);
            }}
            disabled={locked}
            className={`flex w-full items-center justify-between gap-4 rounded-2xl border text-left transition ${
              locked
                ? "cursor-not-allowed border-white/8 bg-white/[0.025] opacity-65"
                : "border-white/8 bg-white/4 hover:border-[#ffb12b]/35 hover:bg-white/8"
            } ${compact ? "p-4" : "p-4"}`}
            aria-disabled={locked}
            aria-pressed={enabled}
          >
            <span className="min-w-0">
              <span className="flex items-center gap-2 text-[16px] font-semibold text-white">
                {row.label}
                {locked ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/6 px-2 py-0.5 text-[11px] font-medium text-white/50">
                    <LockKeyhole className="h-3 w-3" strokeWidth={1.8} aria-hidden="true" />
                    Pro
                  </span>
                ) : null}
              </span>
              <span className="mt-1 block text-[13px] text-white/50">{locked ? "Unlocks with Pro Intelligence" : row.detail}</span>
            </span>
            <PreferenceToggle enabled={enabled} disabled={locked} />
          </button>
        );
      })}
    </div>
  );
}

function PreferenceToggle({ disabled = false, enabled }: { disabled?: boolean; enabled: boolean }) {
  return (
    <span className={`h-7 w-12 shrink-0 rounded-full border p-0.5 ${enabled ? "border-[#ffb12b]/55 bg-[#ffb12b]/25" : "border-white/15 bg-white/8"}`}>
      <span className={`block h-6 w-6 rounded-full transition ${enabled ? "translate-x-5 bg-[#ffb12b]" : disabled ? "bg-white/22" : "bg-white/35"}`} />
    </span>
  );
}
