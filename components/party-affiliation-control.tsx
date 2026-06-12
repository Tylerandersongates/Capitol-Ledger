"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Flag } from "lucide-react";
import {
  accountProfileChangedEvent,
  fetchAccountProfile,
  readLocalAccountProfile,
  syncAccountProfile,
  writeLocalAccountProfile
} from "@/lib/browser-account-profile";

export const partyOptions = [
  { value: "", label: "Not selected", display: "Not selected" },
  { value: "prefer-not", label: "Prefer not to say", display: "Prefer not to say" },
  { value: "democrat", label: "Democrat", display: "Democrat" },
  { value: "republican", label: "Republican", display: "Republican" },
  { value: "independent", label: "Independent", display: "Independent" },
  { value: "libertarian", label: "Libertarian", display: "Libertarian" },
  { value: "green", label: "Green", display: "Green" },
  { value: "other", label: "Other", display: "Other" }
];

export function getPartyLabel(value: string) {
  return partyOptions.find((option) => option.value === value)?.display ?? partyOptions[0].display;
}

function readPartyAffiliation() {
  return readLocalAccountProfile().partyAffiliation ?? "";
}

function writePartyAffiliation(value: string) {
  writeLocalAccountProfile({ partyAffiliation: value });
}

export function PartyAffiliationDisplay() {
  const [party, setParty] = useState("");

  useEffect(() => {
    function refreshParty() {
      setParty(readPartyAffiliation());
    }

    refreshParty();
    void fetchAccountProfile().then((profile) => {
      if (!profile) return;
      writePartyAffiliation(profile.partyAffiliation);
      setParty(profile.partyAffiliation);
    });
    window.addEventListener("storage", refreshParty);
    window.addEventListener(accountProfileChangedEvent, refreshParty);

    return () => {
      window.removeEventListener("storage", refreshParty);
      window.removeEventListener(accountProfileChangedEvent, refreshParty);
    };
  }, []);

  return (
    <div className="mt-2 inline-flex max-w-full items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[12px] font-medium text-white/52">
      <Flag className="h-3.5 w-3.5 shrink-0 text-[#ffb12b]" strokeWidth={1.8} aria-hidden="true" />
      <span className="truncate">
        Affiliation: <span className="text-white/76">{getPartyLabel(party)}</span>
      </span>
    </div>
  );
}

export function PartyAffiliationSelector() {
  const [party, setParty] = useState("");

  useEffect(() => {
    function refreshParty() {
      setParty(readPartyAffiliation());
    }

    refreshParty();
    void fetchAccountProfile().then((profile) => {
      if (!profile) return;
      writePartyAffiliation(profile.partyAffiliation);
      setParty(profile.partyAffiliation);
    });

    window.addEventListener("storage", refreshParty);
    window.addEventListener(accountProfileChangedEvent, refreshParty);

    return () => {
      window.removeEventListener("storage", refreshParty);
      window.removeEventListener(accountProfileChangedEvent, refreshParty);
    };
  }, []);

  function handleChange(value: string) {
    setParty(value);
    writePartyAffiliation(value);
    void syncAccountProfile({ partyAffiliation: value });
  }

  return (
    <div className="grid grid-cols-[34px_minmax(0,1fr)_auto] items-center gap-3 py-3.5">
      <span className="text-[#ffb12b]">
        <Flag className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <div className="text-[16px] font-semibold text-white">Party Affiliation</div>
        <div className="mt-1 text-[13px] text-white/52">Optional profile preference</div>
      </div>
      <div className="relative w-[142px]">
        <select
          value={party}
          onChange={(event) => handleChange(event.target.value)}
          className="h-9 w-full appearance-none rounded-full border border-white/10 bg-white/5 px-3 pr-8 text-[12px] font-medium text-white outline-none"
          aria-label="Choose party affiliation"
        >
          {partyOptions.map((option) => (
            <option key={option.value || "none"} value={option.value} className="bg-[#061126] text-white">
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/42" strokeWidth={1.8} aria-hidden="true" />
      </div>
    </div>
  );
}

export function OnboardingPartyAffiliationSelector() {
  const [party, setParty] = useState("");

  useEffect(() => {
    function refreshParty() {
      setParty(readPartyAffiliation());
    }

    refreshParty();
    void fetchAccountProfile().then((profile) => {
      if (!profile) return;
      writePartyAffiliation(profile.partyAffiliation);
      setParty(profile.partyAffiliation);
    });
    window.addEventListener("storage", refreshParty);
    window.addEventListener(accountProfileChangedEvent, refreshParty);

    return () => {
      window.removeEventListener("storage", refreshParty);
      window.removeEventListener(accountProfileChangedEvent, refreshParty);
    };
  }, []);

  function handleSelect(value: string) {
    setParty(value);
    writePartyAffiliation(value);
    void syncAccountProfile({ partyAffiliation: value });
  }

  return (
    <div className="mt-5">
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
        <span className="min-w-0">
          <span className="block text-[12px] font-semibold uppercase tracking-[0.1em] text-white/44">Current choice</span>
          <span className="mt-1 block truncate text-[16px] font-semibold text-white">{getPartyLabel(party)}</span>
        </span>
        <Flag className="h-5 w-5 shrink-0 text-[#ffb12b]" strokeWidth={1.8} aria-hidden="true" />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2.5">
        {partyOptions.map((option) => {
          const active = party === option.value;

          return (
            <button
              key={option.value || "none"}
              type="button"
              onClick={() => handleSelect(option.value)}
              className={`min-h-[46px] rounded-2xl border px-3 text-center text-[13px] font-semibold transition ${
                active
                  ? "border-[#ffb12b]/48 bg-[#ffb12b]/16 text-[#ffb12b] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
                  : "border-white/10 bg-white/[0.045] text-white/62 hover:border-[#ffb12b]/35 hover:bg-white/8"
              }`}
              aria-pressed={active}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
