"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  accountProfileChangedEvent,
  defaultDistrictProfile,
  fetchAccountProfile,
  readLocalDistrictProfile,
  writeLocalDistrictProfile,
  type LocalDistrictProfile
} from "@/lib/browser-account-profile";
import { stateCodeFromDistrictCode } from "@/lib/beta-district-presets";

const issueInterestsKey = "capitol-ledger:issue-interests";
const persistenceEvent = "capitol-ledger:persistence-changed";
const fallbackInterests = ["Healthcare", "Education", "Infrastructure"];

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

export function SearchSetupChips({ focus }: { focus?: string }) {
  const [interests, setInterests] = useState<string[]>(fallbackInterests);
  const [district, setDistrict] = useState<Required<LocalDistrictProfile>>(defaultDistrictProfile);

  useEffect(() => {
    let active = true;

    function refreshSetup() {
      setDistrict(readLocalDistrictProfile());
      setInterests(readLocalIssueInterests());
    }

    refreshSetup();
    void fetchAccountProfile().then((profile) => {
      if (!active || !profile) return;
      writeLocalDistrictProfile(profile);
      refreshSetup();
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

  return (
    <div className="mt-4 rounded-[1.15rem] border border-white/10 bg-[linear-gradient(180deg,rgba(29,83,145,0.18)_0%,rgba(7,23,50,0.58)_100%)] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/42">From your setup</div>
          <div className="mt-1 text-[12px] leading-snug text-white/52">
            Interests plus your default district state, currently {district.districtState}.
          </div>
        </div>
        <Link href="/account" className="shrink-0 rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5 text-[11px] font-semibold text-[#ffb12b]">
          Edit setup
        </Link>
      </div>

      <div className="mt-3 overflow-x-auto overflow-y-hidden pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Setup-based search shortcuts">
        <div className="grid auto-cols-max grid-flow-col grid-rows-2 gap-2">
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
      </div>
    </div>
  );
}

function readLocalIssueInterests() {
  if (typeof window === "undefined") return fallbackInterests;

  try {
    const parsed = JSON.parse(window.localStorage.getItem(issueInterestsKey) ?? "[]") as unknown;
    if (!Array.isArray(parsed)) return fallbackInterests;

    const interests = Array.from(new Set(parsed.filter((value): value is string => typeof value === "string" && value.trim().length > 0)));
    return interests.length ? interests : fallbackInterests;
  } catch {
    return fallbackInterests;
  }
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
