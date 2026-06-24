"use client";

import { GamificationSync } from "@/components/gamification-sync";
import { useGamificationSnapshot } from "@/components/gamification-live-stats";
import { MobileShell } from "@/components/mobile-shell";
import { MobileBottomNav, MobileCard, mobileIconButtonClass } from "@/components/mobile-ui";
import { recordGamificationEvent } from "@/lib/browser-gamification";
import {
  hydrateSignedPetitions,
  readLocalSignedPetitionIds,
  recordSignedPetition,
  signedPetitionsChangedEvent
} from "@/lib/browser-petition-history";
import { civicPetitions } from "@/lib/civic-petitions";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bell, FileText, Home, Megaphone, Settings } from "lucide-react";

export default function PetitionsPage() {
  const snapshot = useGamificationSnapshot();
  const [signingId, setSigningId] = useState<string | null>(null);
  const [signedIds, setSignedIds] = useState<string[]>(() => readLocalSignedPetitionIds());
  const signedSet = useMemo(() => new Set(signedIds), [signedIds]);

  useEffect(() => {
    let active = true;

    async function refreshSignedPetitions() {
      const records = await hydrateSignedPetitions();
      if (active) setSignedIds(records.map((record) => record.petitionId));
    }

    void refreshSignedPetitions();
    window.addEventListener(signedPetitionsChangedEvent, refreshSignedPetitions);
    window.addEventListener("focus", refreshSignedPetitions);
    window.addEventListener("storage", refreshSignedPetitions);

    return () => {
      active = false;
      window.removeEventListener(signedPetitionsChangedEvent, refreshSignedPetitions);
      window.removeEventListener("focus", refreshSignedPetitions);
      window.removeEventListener("storage", refreshSignedPetitions);
    };
  }, []);

  async function signPetition(petition: (typeof civicPetitions)[number]) {
    if (signedSet.has(petition.id) || signingId) return;

    setSigningId(petition.id);
    recordGamificationEvent("sign-petition", petition.id);
    const next = [...signedSet, petition.id];
    setSignedIds(next);
    await recordSignedPetition(petition).finally(() => setSigningId(null));
  }

  return (
    <MobileShell
      minHeight="min-h-[980px]"
      contentClassName="px-8 pb-5 pt-8"
      statusBarClassName="flex items-center justify-between px-3 text-[17px] font-semibold"
    >
      <GamificationSync />
      <header className="relative mt-10 flex items-center justify-center">
        <Link href="/dashboard" className={`absolute left-0 ${mobileIconButtonClass}`} aria-label="Back to dashboard">
          <ArrowLeft className="h-7 w-7" strokeWidth={2.2} aria-hidden="true" />
        </Link>
        <h1 className="text-[24px] font-medium leading-none text-white">Civic Petitions</h1>
      </header>

      <main className="mt-6 pb-5">
        <MobileCard variant="dashboard" className="px-4 py-4">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
            <div>
              <div className="text-[13px] font-medium uppercase tracking-[0.08em] text-white/52">Active Civic Actions</div>
              <p className="mt-2 text-[15px] leading-snug text-white/66">
                Signing petitions records engagement, builds score, and contributes to your petition impact metric.
              </p>
            </div>
            <div className="shrink-0 rounded-full border border-[#c08dff]/35 bg-[#c08dff]/14 px-2.5 py-1 text-[13px] font-medium text-[#d5b8ff]">
              Signed {snapshot.eventCounts.find((event) => event.event === "sign-petition")?.count ?? 0}
            </div>
          </div>
          <div className="mt-3 text-[11px] font-medium uppercase tracking-[0.07em] text-white/48">
            Each unique petition signs once and counts toward badges and impact.
          </div>
        </MobileCard>

        <div className="mt-4 space-y-3">
          {civicPetitions.map((petition) => {
            const signed = signedSet.has(petition.id);
            const signing = signingId === petition.id;

            return (
              <MobileCard key={petition.id} variant="dashboard" className="px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-[19px] font-medium leading-tight text-white">{petition.title}</h2>
                    <p className="mt-2 text-[14px] leading-snug text-white/58">{petition.body}</p>
                  </div>
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/12 bg-white/[0.04] text-[#ffbd39]">
                    <Megaphone className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between text-[12px] text-white/56">
                  <span>{petition.progressLabel}</span>
                  <span>{petition.targetLabel}</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-white/12">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#9064f4] via-[#b98fff] to-[#e2ceff] shadow-[0_0_14px_rgba(174,132,255,0.3)]"
                    style={{ width: `${petition.progressPercent}%` }}
                  />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => signPetition(petition)}
                    className={`h-10 rounded-lg border text-[14px] font-medium transition ${
                      signed
                        ? "cursor-default border-[#4fdb89]/32 bg-[#4fdb89]/14 text-[#4fdb89]"
                        : "border-[#c08dff]/38 bg-[#c08dff]/14 text-[#d5b8ff] hover:brightness-110"
                    }`}
                    disabled={signed || Boolean(signingId)}
                  >
                    {signed ? "Signed" : signing ? "Signing..." : "Sign Petition"}
                  </button>
                  <Link
                    href="/badges"
                    className="grid h-10 place-items-center rounded-lg border border-white/12 bg-[linear-gradient(180deg,rgba(26,73,127,0.28)_0%,rgba(6,25,55,0.66)_100%)] px-3 text-[14px] font-medium text-[#ffb62e] shadow-[inset_0_1px_0_rgba(255,255,255,0.11),0_10px_24px_rgba(1,8,24,0.42)] transition hover:brightness-110"
                  >
                    View Badges
                  </Link>
                </div>
              </MobileCard>
            );
          })}
        </div>
      </main>

      <MobileBottomNav
        items={[
          { href: "/dashboard", icon: <Home />, label: "Home" },
          { href: "/search?type=bills", icon: <FileText />, label: "Bills" },
          { active: true, href: "/petitions", icon: <Megaphone />, label: "Petitions" },
          { href: "/alerts", icon: <Bell />, label: "Alerts" },
          { href: "/settings", icon: <Settings />, label: "Settings" }
        ]}
      />
    </MobileShell>
  );
}
