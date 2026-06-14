"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { AlertCircle, Bell, Check, CheckCircle2, ChevronRight, Flag, LocateFixed, Loader2, LockKeyhole, MapPin, Search, UserRound, Vote } from "lucide-react";
import {
  accountProfileChangedEvent,
  defaultDistrictProfile,
  defaultNotificationPreferences,
  fetchAccountProfile,
  readLocalAccountProfile,
  readLocalDistrictProfile,
  readLocalNotificationPreferences,
  syncAccountProfile,
  writeLocalDistrictProfile,
  writeLocalNotificationPreferences,
  type LocalDistrictProfile
} from "@/lib/browser-account-profile";
import { hasActiveBrowserSession } from "@/lib/browser-auth-state";
import { useSubscriptionState } from "@/components/subscription-controls";
import { recordCompletedDistrictSetupIfReady } from "@/lib/browser-gamification";
import {
  betaDistrictPresets,
  betaDistrictZipExamples,
  findBetaDistrictPresetForZip,
  getMatchedOfficials,
  type BetaDistrictPreset
} from "@/lib/beta-district-presets";
import { isPlanFeatureEnabled } from "@/lib/subscription-plans";
import { getPartyLabel } from "@/components/party-affiliation-control";
import type { AccountNotificationPreferences, Member, SavedFollowRecord } from "@/types/capitol";

type NotificationPreferenceKey = keyof AccountNotificationPreferences;
type SetupMetrics = ReturnType<typeof useSetupMetrics>;

const setupSignalTotal = 5;
const OnboardingSetupMetricsContext = createContext<SetupMetrics | null>(null);

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
const followsKey = "capitol-ledger:follows";
const persistenceEvent = "capitol-ledger:persistence-changed";
const followsChangedEvent = "capitol-ledger:follows-changed";
const accountLedgerEndpoint = "/api/account/ledger";

type DistrictMatchResult =
  | {
      district: Required<LocalDistrictProfile>;
      status: "matched";
    }
  | {
      message: string;
      status: "review";
    };

const stateNameByCode: Record<string, string> = {
  CA: "California",
  MA: "Massachusetts",
  NY: "New York",
  TX: "Texas"
};

const demoZipExamples = betaDistrictZipExamples.slice(0, 4).join(", ");
const demoDistrictLocations: Array<{ latitude: number; longitude: number; preset: BetaDistrictPreset }> = [
  { latitude: 34.0522, longitude: -118.2437, preset: betaDistrictPresets[0] },
  { latitude: 34.2068, longitude: -118.2245, preset: betaDistrictPresets[1] },
  { latitude: 42.4184, longitude: -71.1062, preset: betaDistrictPresets[2] },
  { latitude: 42.3601, longitude: -71.0589, preset: betaDistrictPresets[3] },
  { latitude: 40.8467, longitude: -73.8648, preset: betaDistrictPresets[4] },
  { latitude: 30.2672, longitude: -97.7431, preset: betaDistrictPresets[5] },
  { latitude: 29.7604, longitude: -95.3698, preset: betaDistrictPresets[6] },
  { latitude: 32.7767, longitude: -96.797, preset: betaDistrictPresets[7] }
];
const demoLocationMatchRadiusMiles = 55;

function districtProfileFromPreset(preset: BetaDistrictPreset): Required<LocalDistrictProfile> {
  return {
    districtCode: preset.code,
    districtLabel: preset.label,
    districtState: preset.state
  };
}

function normalizeDistrictCode(code: string) {
  return code
    .toUpperCase()
    .replace(/^([A-Z]{2})-0?(\d{1,2})$/, (_, state: string, district: string) => `${state}-${district.padStart(2, "0")}`);
}

function removeDistrictCode(value: string) {
  return value.replace(/\s*[-·]\s*[A-Z]{2}-0?\d{1,2}/i, "").trim();
}

function districtNumberFromProfileCode(code?: string) {
  return code?.match(/^[A-Z]{2}-0?(\d{1,2})$/i)?.[1] ?? "";
}

function readSavedFollowRecords() {
  if (typeof window === "undefined") return [] as SavedFollowRecord[];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(followsKey) ?? "[]") as unknown;
    return uniqueFollowRecords(Array.isArray(parsed) ? (parsed as SavedFollowRecord[]) : []);
  } catch {
    return [];
  }
}

function uniqueFollowRecords(records: SavedFollowRecord[]) {
  const seen = new Set<string>();
  const follows: SavedFollowRecord[] = [];

  records.forEach((record) => {
    if ((record.type !== "member" && record.type !== "bill") || !record.id) return;

    const key = `${record.type}:${record.id}`;
    if (seen.has(key)) return;

    seen.add(key);
    follows.push(record);
  });

  return follows;
}

function getDistrictDelegationFollowRecords(members: Member[], districtCode?: string) {
  const districtNumber = districtNumberFromProfileCode(districtCode);

  return getMatchedOfficials(members, districtCode)
    .filter((member) => member.chamber === "Senate" || (Boolean(districtNumber) && member.chamber === "House" && member.district === districtNumber))
    .map<SavedFollowRecord>((member) => ({ id: member.bioguideId, type: "member" }));
}

async function syncFollowRecordsToAccount(follows: SavedFollowRecord[]) {
  if (!(await hasActiveBrowserSession())) return;

  await fetch(accountLedgerEndpoint, {
    body: JSON.stringify({ follows }),
    headers: {
      "Content-Type": "application/json"
    },
    method: "POST"
  }).catch(() => null);
}

function saveDistrictDelegationFollows(members: Member[], districtCode?: string) {
  if (typeof window === "undefined") return 0;

  const districtFollows = getDistrictDelegationFollowRecords(members, districtCode);
  if (!districtFollows.length) return 0;

  const current = readSavedFollowRecords();
  const next = uniqueFollowRecords([...districtFollows, ...current]);
  window.localStorage.setItem(followsKey, JSON.stringify(next));
  window.dispatchEvent(new Event(persistenceEvent));
  window.dispatchEvent(new Event(followsChangedEvent));
  void syncFollowRecordsToAccount(next);

  return districtFollows.length;
}

function degreesToRadians(value: number) {
  return (value * Math.PI) / 180;
}

function distanceInMiles(left: { latitude: number; longitude: number }, right: { latitude: number; longitude: number }) {
  const earthRadiusMiles = 3958.8;
  const latitudeDelta = degreesToRadians(right.latitude - left.latitude);
  const longitudeDelta = degreesToRadians(right.longitude - left.longitude);
  const leftLatitude = degreesToRadians(left.latitude);
  const rightLatitude = degreesToRadians(right.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2) +
    Math.cos(leftLatitude) * Math.cos(rightLatitude) * Math.sin(longitudeDelta / 2) * Math.sin(longitudeDelta / 2);

  return 2 * earthRadiusMiles * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function buildDistrictMatch(input: string): DistrictMatchResult {
  const value = input.trim();
  if (!value) {
    return {
      message: `Enter a city, district code, or demo ZIP such as ${demoZipExamples}.`,
      status: "review"
    };
  }

  const explicitZip = value.match(/\b\d{5}\b/)?.[0];
  if (explicitZip) {
    const preset = findBetaDistrictPresetForZip(explicitZip);
    if (preset) {
      return {
        district: districtProfileFromPreset(preset),
        status: "matched"
      };
    }

    return {
      message: `ZIP ${explicitZip} is outside the demo ZIP set. Demo ZIPs include ${demoZipExamples}; full launch should use address-level district lookup.`,
      status: "review"
    };
  }

  const explicitCode = value.match(/\b[A-Z]{2}-0?\d{1,2}\b/i)?.[0];
  if (explicitCode) {
    const normalizedCode = normalizeDistrictCode(explicitCode);
    const preset = betaDistrictPresets.find((district) => normalizeDistrictCode(district.code) === normalizedCode);
    if (preset) {
      return {
        district: districtProfileFromPreset(preset),
        status: "matched"
      };
    }

    const stateCode = normalizedCode.slice(0, 2);
    const cityLabel = removeDistrictCode(value) || `District ${normalizedCode}`;

    return {
      district: {
        districtCode: normalizedCode,
        districtLabel: `${cityLabel} - ${normalizedCode}`,
        districtState: stateNameByCode[stateCode] ?? stateCode
      },
      status: "matched"
    };
  }

  const normalized = value.toLowerCase();
  const matchedPreset = betaDistrictPresets.find((district) =>
    district.input.some((term) => normalized.includes(term.toLowerCase()))
  );

  if (matchedPreset) {
    return {
      district: districtProfileFromPreset(matchedPreset),
      status: "matched"
    };
  }

  return {
    message: `No beta district match yet. Try a city, district code, or demo ZIP such as ${demoZipExamples}.`,
    status: "review"
  };
}

function buildDistrictMatchFromCoordinates(latitude: number, longitude: number): DistrictMatchResult {
  const nearest = demoDistrictLocations
    .map((location) => ({
      distance: distanceInMiles({ latitude, longitude }, location),
      preset: location.preset
    }))
    .sort((left, right) => left.distance - right.distance)[0];

  if (nearest && nearest.distance <= demoLocationMatchRadiusMiles) {
    return {
      district: districtProfileFromPreset(nearest.preset),
      status: "matched"
    };
  }

  return {
    message: `Current location is outside the beta district set. Try a city, district code, or demo ZIP such as ${demoZipExamples}; full launch should use official address-level district lookup.`,
    status: "review"
  };
}

function districtPlaceLabel(district: Required<LocalDistrictProfile>) {
  return district.districtLabel.replace(/\s+-\s+[A-Z]{2}-0?\d{1,2}$/i, "");
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

  return <p className="mt-2 text-[17px] text-white/52">{district.districtCode ? district.districtLabel : "Choose your district"}</p>;
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
        <span className="mt-1 block truncate text-[13px] text-white/52">{district.districtCode ? district.districtLabel : "Choose your district"}</span>
      </span>
      <ChevronRight className="h-5 w-5 text-white/42" strokeWidth={1.8} aria-hidden="true" />
    </Link>
  );
}

export function OnboardingDistrictSetup({ members = [] }: { members?: Member[] }) {
  const district = useDistrictProfile();
  const [districtInput, setDistrictInput] = useState("");
  const [locationLookupStatus, setLocationLookupStatus] = useState<"idle" | "locating">("idle");
  const [matchedDistrict, setMatchedDistrict] = useState(defaultDistrictProfile);
  const [matchNotice, setMatchNotice] = useState<{ detail: string; title: string; tone: "review" | "success" } | null>(null);

  useEffect(() => {
    setMatchedDistrict(district);
  }, [district]);

  function saveDistrict(nextDistrict: Required<LocalDistrictProfile>, detailPrefix = `${districtPlaceLabel(nextDistrict)} is now saved to your profile.`) {
    setMatchedDistrict(nextDistrict);
    setDistrictInput("");
    writeLocalDistrictProfile(nextDistrict);
    const seededOfficialsCount = saveDistrictDelegationFollows(members, nextDistrict.districtCode);
    const awardedGamification = recordCompletedDistrictSetupIfReady();
    setMatchNotice({
      detail: `${detailPrefix} ${
        seededOfficialsCount ? `${seededOfficialsCount} district officials added to your saved watchlist.` : "District officials are already in your saved watchlist."
      } ${awardedGamification ? "+100 Civic Score recorded." : "District setup reward already counted."}`,
      title: "District saved",
      tone: "success"
    });
    void syncAccountProfile(nextDistrict);
  }

  function matchDistrict() {
    const result = buildDistrictMatch(districtInput);
    if (result.status === "review") {
      setMatchNotice({
        detail: result.message,
        title: "Check district",
        tone: "review"
      });
      return;
    }

    saveDistrict(result.district);
  }

  function matchCurrentLocation() {
    if (!navigator.geolocation) {
      setMatchNotice({
        detail: `Location lookup is not available in this browser. Enter a city, district code, or demo ZIP such as ${demoZipExamples}.`,
        title: "Location unavailable",
        tone: "review"
      });
      return;
    }

    setLocationLookupStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationLookupStatus("idle");
        const result = buildDistrictMatchFromCoordinates(position.coords.latitude, position.coords.longitude);
        if (result.status === "review") {
          setMatchNotice({
            detail: result.message,
            title: "Check district",
            tone: "review"
          });
          return;
        }

        saveDistrict(result.district, `${districtPlaceLabel(result.district)} matched from your current location. Precise coordinates were not saved.`);
      },
      () => {
        setLocationLookupStatus("idle");
        setMatchNotice({
          detail: "Location permission was not used. You can still enter a city, ZIP, or district code.",
          title: "Location skipped",
          tone: "review"
        });
      },
      {
        enableHighAccuracy: false,
        maximumAge: 600000,
        timeout: 10000
      }
    );
  }

  const matchedStateCode = matchedDistrict.districtCode.slice(0, 2);

  return (
    <>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          matchDistrict();
        }}
        className="mt-5 rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(24,72,128,0.32)_0%,rgba(4,16,38,0.78)_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_12px_28px_rgba(1,8,24,0.28)]"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/44">District lookup</div>
            <div className="mt-1 truncate text-[13px] text-white/56">City, demo ZIP, or district code</div>
          </div>
          <span className="shrink-0 rounded-full border border-[#43ed74]/24 bg-[#43ed74]/10 px-3 py-1.5 text-[11px] font-semibold text-[#74f49a]">
            {matchedDistrict.districtCode || "Not set"}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(15,52,99,0.38)_0%,rgba(3,15,34,0.84)_100%)] px-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_10px_22px_rgba(1,8,24,0.3)]">
          <Search className="h-5 w-5 shrink-0 text-[#ffb12b]" strokeWidth={1.8} aria-hidden="true" />
          <input
            name="district"
            value={districtInput}
            onChange={(event) => setDistrictInput(event.target.value)}
            className="h-12 min-w-0 bg-transparent text-[16px] font-medium text-white outline-none placeholder:text-white/36"
            placeholder=""
          />
          <button type="submit" className="h-10 rounded-xl bg-gradient-to-r from-[#ffdf63] via-[#ffb12b] to-[#ff8a00] px-4 text-[13px] font-semibold text-[#071225] shadow-[0_8px_20px_rgba(255,177,43,0.22)]">
            Match
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={matchCurrentLocation}
            disabled={locationLookupStatus === "locating"}
            className="inline-flex h-9 items-center gap-2 rounded-full border border-white/12 bg-white/[0.045] px-3 text-[12px] font-semibold text-[#ffb12b] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:bg-white/[0.07] disabled:cursor-wait disabled:text-white/46"
          >
            {locationLookupStatus === "locating" ? (
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.9} aria-hidden="true" />
            ) : (
              <LocateFixed className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />
            )}
            {locationLookupStatus === "locating" ? "Locating" : "Use current location"}
          </button>
          <span className="min-w-[11rem] flex-1 text-[11px] leading-snug text-white/44">Browser permission only; precise coordinates are not stored.</span>
        </div>

        {matchNotice ? (
          <div
            className={`mt-3 grid grid-cols-[22px_1fr] gap-2 rounded-xl border px-3 py-2.5 ${
              matchNotice.tone === "success"
                ? "border-[#43ed74]/24 bg-[#43ed74]/[0.09] text-[#74f49a]"
                : "border-[#ffb12b]/24 bg-[#ffb12b]/10 text-[#ffcf74]"
            }`}
          >
            {matchNotice.tone === "success" ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5" strokeWidth={1.9} aria-hidden="true" />
            ) : (
              <AlertCircle className="mt-0.5 h-5 w-5" strokeWidth={1.9} aria-hidden="true" />
            )}
            <span className="min-w-0">
              <span className="block text-[13px] font-semibold text-white">{matchNotice.title}</span>
              <span className="mt-0.5 block text-[12px] leading-snug text-white/56">{matchNotice.detail}</span>
            </span>
          </div>
        ) : null}

        <div className="mt-4 border-t border-white/8 pt-4">
          {matchedDistrict.districtCode ? (
            <div className="grid min-h-[84px] grid-cols-[34px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-[#43ed74]/24 bg-[linear-gradient(180deg,rgba(38,169,92,0.15)_0%,rgba(7,42,49,0.46)_100%)] px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.09),0_10px_24px_rgba(1,8,24,0.24)]">
              <span className="grid h-8 w-8 place-items-center rounded-full border border-[#43ed74]/28 bg-[#43ed74]/12 text-[#43ed74]">
                <CheckCircle2 className="h-5 w-5" strokeWidth={1.9} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <div className="text-[15px] font-semibold text-white">District matched</div>
                <div className="mt-1 truncate text-[13px] text-white/58">{matchedDistrict.districtLabel}</div>
              </div>
              <Link href={`/search?type=members&state=${matchedStateCode}&focus=results`} className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5 text-[11px] font-semibold text-[#ffb12b]">
                Officials
              </Link>
            </div>
          ) : (
            <div className="grid min-h-[84px] grid-cols-[34px_minmax(0,1fr)] items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_10px_24px_rgba(1,8,24,0.2)]">
              <span className="grid h-8 w-8 place-items-center rounded-full border border-[#ffb12b]/24 bg-[#ffb12b]/10 text-[#ffb12b]">
                <MapPin className="h-5 w-5" strokeWidth={1.9} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <div className="text-[15px] font-semibold text-white">Choose your district</div>
                <div className="mt-1 truncate text-[13px] text-white/58">Enter a city, demo ZIP, or district code to begin.</div>
              </div>
            </div>
          )}
        </div>
      </form>
    </>
  );
}

export function OnboardingMatchedOfficials({ members }: { members: Member[] }) {
  const district = useDistrictProfile();
  const hasDistrict = Boolean(district.districtCode);
  const officials = hasDistrict ? getMatchedOfficials(members, district.districtCode).slice(0, 4) : [];
  const stateCode = district.districtCode?.slice(0, 2) ?? "";

  if (!hasDistrict) {
    return (
      <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-5 text-[14px] leading-snug text-white/56">
        Match your district first to see the officials tied to your profile.
      </div>
    );
  }

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

function useSetupMetrics(members: Member[]) {
  const district = useDistrictProfile();
  const [issueCount, setIssueCount] = useState(0);
  const [enabledAlertCount, setEnabledAlertCount] = useState(0);
  const [partyAffiliation, setPartyAffiliation] = useState("");

  const officialsCount = district.districtCode ? getMatchedOfficials(members, district.districtCode).length : 0;

  useEffect(() => {
    function refreshSetupSignals() {
      const interests = readIssueInterestsForSetup();
      const preferences = readLocalNotificationPreferences();
      const enabledCount = [preferences.voteReminders, preferences.districtAlerts, preferences.weeklyBrief].filter(Boolean).length;
      const profile = readLocalAccountProfile();

      setIssueCount(interests.length);
      setEnabledAlertCount(enabledCount);
      setPartyAffiliation(profile.partyAffiliation ?? "");
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

  return {
    district,
    enabledAlertCount,
    issueCount,
    officialsCount,
    partyAffiliation
  };
}

export function OnboardingSetupMetricsProvider({ children, members }: { children: ReactNode; members: Member[] }) {
  const setupMetrics = useSetupMetrics(members);

  return <OnboardingSetupMetricsContext.Provider value={setupMetrics}>{children}</OnboardingSetupMetricsContext.Provider>;
}

function useOnboardingSetupMetrics() {
  const setupMetrics = useContext(OnboardingSetupMetricsContext);
  if (!setupMetrics) {
    throw new Error("Onboarding setup components must be wrapped in OnboardingSetupMetricsProvider.");
  }

  return setupMetrics;
}

function setupCompleteCount({
  district,
  enabledAlertCount,
  issueCount,
  officialsCount,
  partyAffiliation
}: ReturnType<typeof useSetupMetrics>) {
  return [
    Boolean(district.districtCode),
    officialsCount > 0,
    Boolean(partyAffiliation),
    issueCount > 0,
    enabledAlertCount > 0
  ].filter(Boolean).length;
}

export function OnboardingProgressMeter() {
  const setupMetrics = useOnboardingSetupMetrics();
  const completeCount = setupCompleteCount(setupMetrics);
  const percentReady = Math.round((completeCount / setupSignalTotal) * 100);

  return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(25,73,130,0.28)_0%,rgba(6,22,49,0.72)_100%)] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.09),0_10px_24px_rgba(1,8,24,0.3)]">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-white/44">Profile readiness</span>
        <span className="shrink-0 text-[12px] font-semibold text-[#ffb12b]">{percentReady}%</span>
      </div>
      <div className="mt-2 flex items-center justify-between text-[13px] text-white/52">
        <span>{completeCount} of {setupSignalTotal} setup signals ready</span>
      </div>
      <div className="mt-3 h-2.5 rounded-full bg-[#06152d] shadow-[inset_0_1px_2px_rgba(0,0,0,0.45)]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#c57b0b] via-[#ffb12b] to-[#ffd45c] shadow-[0_0_18px_rgba(255,177,43,0.32)] transition-[width]"
          style={{ width: `${percentReady}%` }}
        />
      </div>
    </div>
  );
}

export function OnboardingCompleteButton() {
  const router = useRouter();
  const setupMetrics = useOnboardingSetupMetrics();
  const completeCount = setupCompleteCount(setupMetrics);
  const complete = completeCount >= setupSignalTotal;

  function openDashboard() {
    if (!complete) return;
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={openDashboard}
        disabled={!complete}
        className={`flex h-12 w-full items-center justify-center rounded-2xl text-[17px] font-semibold shadow-[0_0_24px_rgba(255,177,43,0.22)] transition ${
          complete
            ? "bg-gradient-to-r from-[#ffdf63] via-[#ffb12b] to-[#ff8a00] text-[#071225] hover:brightness-105"
            : "cursor-not-allowed border border-white/10 bg-white/[0.045] text-white/42 shadow-none"
        }`}
      >
        {complete ? "Complete Setup" : `Finish setup (${completeCount}/${setupSignalTotal})`}
      </button>
      <div className="mt-2 text-center text-[12px] font-medium text-white/42">
        {complete ? "Ready for Dashboard" : `${completeCount} of ${setupSignalTotal} ready`}
      </div>
    </>
  );
}

export function OnboardingSetupFlow() {
  const { district, enabledAlertCount, issueCount, officialsCount, partyAffiliation } = useOnboardingSetupMetrics();

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
      complete: Boolean(partyAffiliation),
      detail: partyAffiliation ? getPartyLabel(partyAffiliation) : "Choose affiliation",
      icon: <Flag />,
      label: "Affiliation"
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
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[12px] font-semibold uppercase tracking-[0.1em] text-white/46">Setup flow</div>
          <h2 className="mt-2 text-[22px] font-medium leading-tight text-white">Profile readiness</h2>
        </div>
        <span className="mt-1 shrink-0 rounded-full border border-[#ffb12b]/24 bg-[#ffb12b]/10 px-3 py-1.5 text-[11px] font-semibold text-[#ffb12b]">
          {district.districtCode || "Setup"}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        {steps.map((step, index) => (
          <div key={step.label} className="min-h-[98px] rounded-[1.05rem] border border-white/10 bg-[linear-gradient(180deg,rgba(25,73,130,0.24)_0%,rgba(6,22,49,0.68)_100%)] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_10px_24px_rgba(1,8,24,0.24)]">
            <div className="flex items-center justify-between gap-2">
              <span className={`grid h-8 w-8 place-items-center rounded-full ${step.complete ? "bg-[#43ed74]/14 text-[#43ed74]" : "bg-[#ffb12b]/12 text-[#ffb12b]"}`}>
                {step.complete ? <Check className="h-[18px] w-[18px]" strokeWidth={2.1} aria-hidden="true" /> : <span className="[&>svg]:h-[18px] [&>svg]:w-[18px] [&>svg]:stroke-[1.8]">{step.icon}</span>}
              </span>
              <span className="text-[11px] font-semibold text-white/34">0{index + 1}</span>
            </div>
            <div className="mt-3">
              <div className="truncate text-[14px] font-semibold text-white">{step.label}</div>
              <div className="mt-1 truncate text-[12px] text-white/48">{step.detail}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export function NotificationPreferencesEditor({ compact = false, dense = false }: { compact?: boolean; dense?: boolean }) {
  const [subscription] = useSubscriptionState();
  const [preferences, setPreferences] = useState(defaultNotificationPreferences);
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
    <div className={dense ? "space-y-2" : compact ? "space-y-3" : "mt-5 space-y-4"}>
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
            } ${dense ? "rounded-xl px-3 py-2.5" : "p-4"}`}
            aria-disabled={locked}
            aria-pressed={enabled}
          >
            <span className="min-w-0">
              <span className={`flex items-center gap-2 font-semibold text-white ${dense ? "text-[13px]" : "text-[16px]"}`}>
                {row.label}
                {locked ? (
                  <span className={`inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/6 px-2 py-0.5 font-medium text-white/50 ${dense ? "text-[10px]" : "text-[11px]"}`}>
                    <LockKeyhole className="h-3 w-3" strokeWidth={1.8} aria-hidden="true" />
                    Pro
                  </span>
                ) : null}
              </span>
              <span className={`mt-1 block text-white/50 ${dense ? "text-[11px]" : "text-[13px]"}`}>{locked ? "Unlocks with Pro Intelligence" : row.detail}</span>
            </span>
            <PreferenceToggle enabled={enabled} disabled={locked} dense={dense} />
          </button>
        );
      })}
    </div>
  );
}

function PreferenceToggle({ dense = false, disabled = false, enabled }: { dense?: boolean; disabled?: boolean; enabled: boolean }) {
  return (
    <span className={`shrink-0 rounded-full border p-0.5 ${dense ? "h-6 w-10" : "h-7 w-12"} ${enabled ? "border-[#ffb12b]/55 bg-[#ffb12b]/25" : "border-white/15 bg-white/8"}`}>
      <span className={`block rounded-full transition ${dense ? "h-5 w-5" : "h-6 w-6"} ${enabled ? (dense ? "translate-x-4 bg-[#ffb12b]" : "translate-x-5 bg-[#ffb12b]") : disabled ? "bg-white/22" : "bg-white/35"}`} />
    </span>
  );
}
