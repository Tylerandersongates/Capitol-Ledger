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

const partyOptions = [
  { value: "", label: "Not selected", display: "Not selected" },
  { value: "prefer-not", label: "Prefer not to say", display: "Prefer not to say" },
  { value: "democrat", label: "Democrat", display: "Democrat" },
  { value: "republican", label: "Republican", display: "Republican" },
  { value: "independent", label: "Independent", display: "Independent" },
  { value: "libertarian", label: "Libertarian", display: "Libertarian" },
  { value: "green", label: "Green", display: "Green" },
  { value: "other", label: "Other", display: "Other" }
];

function getPartyLabel(value: string) {
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
    setParty(readPartyAffiliation());
    void fetchAccountProfile().then((profile) => {
      if (!profile) return;
      writePartyAffiliation(profile.partyAffiliation);
      setParty(profile.partyAffiliation);
    });
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
