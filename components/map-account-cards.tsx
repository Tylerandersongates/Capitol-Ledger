"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AllTimePointsLabel, CivicScoreValue, LevelProgressBar } from "@/components/gamification-live-stats";
import { MobileCard, mobileViewAllClass } from "@/components/mobile-ui";
import {
  accountProfileChangedEvent,
  defaultDistrictProfile,
  fetchAccountProfile,
  readLocalDistrictProfile,
  type LocalDistrictProfile
} from "@/lib/browser-account-profile";
import {
  followsChangedEvent,
  hydrateAccountLedgerFromAccount,
  readSavedFollowRecords
} from "@/lib/browser-account-ledger";

export type MapTrackedBill = {
  id: string;
  displayNumber: string;
  meta: string;
  status: string;
  title: string;
  tone: string;
};

function districtPlaceLabel(district: Required<LocalDistrictProfile>) {
  return district.districtLabel.replace(/\s+-\s+[A-Z]{2}-0?\d{1,2}$/i, "");
}

export function MapDistrictCard() {
  const [district, setDistrict] = useState(defaultDistrictProfile);

  useEffect(() => {
    let active = true;

    function refreshLocalDistrict() {
      if (active) setDistrict(readLocalDistrictProfile());
    }

    async function hydrateDistrict() {
      const profile = await fetchAccountProfile();
      if (!active) return;
      if (!profile) {
        refreshLocalDistrict();
        return;
      }

      setDistrict({
        districtCode: profile.districtCode?.trim() || "",
        districtLabel: profile.districtLabel?.trim() || defaultDistrictProfile.districtLabel,
        districtState: profile.districtState?.trim() || ""
      });
    }

    refreshLocalDistrict();
    void hydrateDistrict();
    window.addEventListener("storage", refreshLocalDistrict);
    window.addEventListener(accountProfileChangedEvent, refreshLocalDistrict);

    return () => {
      active = false;
      window.removeEventListener("storage", refreshLocalDistrict);
      window.removeEventListener(accountProfileChangedEvent, refreshLocalDistrict);
    };
  }, []);

  const hasDistrict = Boolean(district.districtCode);

  return (
    <MobileCard className="px-5 py-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[12px] font-semibold uppercase tracking-wide text-white/55">Your District</div>
          <h1 className="mt-2 text-[23px] font-medium leading-none text-white">
            {hasDistrict ? districtPlaceLabel(district) : "Add your district"}
          </h1>
          <p className="mt-2 text-[15px] text-white/58">
            {hasDistrict
              ? [district.districtState, district.districtCode].filter(Boolean).join(" · ")
              : "Set up your district to see relevant officials and activity."}
          </p>
        </div>
        <Link href="/onboarding" className="rounded-xl bg-civic/20 px-4 py-2 text-[14px] font-semibold text-[#9bc5ff]">
          {hasDistrict ? "Change" : "Set up"}
        </Link>
      </div>
    </MobileCard>
  );
}

export function MapTrackedBills({ bills }: { bills: MapTrackedBill[] }) {
  const [savedBillIds, setSavedBillIds] = useState<string[]>([]);

  useEffect(() => {
    let active = true;

    function publishSavedBills(records = readSavedFollowRecords()) {
      if (!active) return;
      setSavedBillIds(records.filter((record) => record.type === "bill" && !record.id.startsWith("demo-")).map((record) => record.id));
    }

    function refreshSavedBills() {
      publishSavedBills();
    }

    async function hydrateSavedBills() {
      const ledger = await hydrateAccountLedgerFromAccount();
      publishSavedBills(ledger?.follows ?? readSavedFollowRecords());
    }

    publishSavedBills();
    void hydrateSavedBills();
    window.addEventListener("storage", refreshSavedBills);
    window.addEventListener(followsChangedEvent, refreshSavedBills);

    return () => {
      active = false;
      window.removeEventListener("storage", refreshSavedBills);
      window.removeEventListener(followsChangedEvent, refreshSavedBills);
    };
  }, []);

  const trackedBills = useMemo(() => {
    const saved = new Set(savedBillIds);
    return bills.filter((bill) => saved.has(bill.id)).slice(0, 3);
  }, [bills, savedBillIds]);

  return (
    <MobileCard className="px-5 py-5">
      <div className="flex items-center justify-between">
        <h2 className="text-[22px] font-medium leading-none">Legislation Tracker</h2>
        <Link href="/search?type=bills" className={mobileViewAllClass}>View all</Link>
      </div>
      {trackedBills.length ? (
        <div className="mt-5 divide-y divide-white/8">
          {trackedBills.map((bill) => (
            <Link key={bill.id} href={`/bills/${bill.id}`} className="flex items-center justify-between gap-4 py-4">
              <div className="min-w-0">
                <div className="text-[16px] font-semibold text-white">{bill.displayNumber}</div>
                <div className="mt-1 truncate text-[15px] text-white/68">{bill.title}</div>
                <div className="mt-1 text-[12px] text-white/45">{bill.meta}</div>
              </div>
              <span className={`shrink-0 text-right text-[13px] font-semibold ${bill.tone}`}>{bill.status}</span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-white/18 bg-white/[0.025] px-4 py-5">
          <div className="text-[15px] font-semibold text-white">No saved bills yet</div>
          <p className="mt-2 text-[13px] leading-snug text-white/52">Save a live bill to add it to your legislation tracker.</p>
        </div>
      )}
    </MobileCard>
  );
}

export function MapCivicScoreCard() {
  return (
    <MobileCard className="px-5 py-5">
      <h2 className="text-[20px] font-medium leading-none">Civic Score</h2>
      <CivicScoreValue className="mt-5 block text-[28px] font-medium leading-none text-[#ffb12b]" />
      <AllTimePointsLabel className="mt-2 block text-[13px] leading-snug text-white/54" />
      <div className="mt-5 h-2 rounded-full bg-white/13">
        <LevelProgressBar />
      </div>
    </MobileCard>
  );
}
