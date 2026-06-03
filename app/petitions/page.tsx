"use client";

import { GamificationSync } from "@/components/gamification-sync";
import { useGamificationSnapshot } from "@/components/gamification-live-stats";
import { MobileShell } from "@/components/mobile-shell";
import { MobileBottomNav, MobileCard, mobileIconButtonClass } from "@/components/mobile-ui";
import { recordGamificationEvent } from "@/lib/browser-gamification";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bell, CheckCircle2, FileText, Home, Megaphone, UserRound } from "lucide-react";

const signedPetitionsKey = "capitol-ledger:signed-petitions";

const petitions = [
  {
    id: "petition-public-records-2026",
    title: "Protect Public Records Access",
    body: "Support stronger publication standards for federal vote and committee records.",
    progressLabel: "31,200 supporters",
    targetLabel: "Goal 50,000"
  },
  {
    id: "petition-vote-transparency-2026",
    title: "Require Vote Explanation Notes",
    body: "Support short plain-language notes for each major vote to improve civic understanding.",
    progressLabel: "18,940 supporters",
    targetLabel: "Goal 30,000"
  },
  {
    id: "petition-ethics-audit-2026",
    title: "Expand Ethics Audit Reporting",
    body: "Support quarterly public accountability summaries for committee and floor actions.",
    progressLabel: "22,510 supporters",
    targetLabel: "Goal 40,000"
  }
] as const;

function readSignedPetitionIds() {
  if (typeof window === "undefined") return [];

  try {
    const stored = window.localStorage.getItem(signedPetitionsKey);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function writeSignedPetitionIds(ids: string[]) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(signedPetitionsKey, JSON.stringify(Array.from(new Set(ids))));
  } catch {
    // Ignore browser storage restrictions in demo sessions.
  }
}

export default function PetitionsPage() {
  const snapshot = useGamificationSnapshot();
  const [signedIds, setSignedIds] = useState<string[]>([]);
  const signedSet = useMemo(() => new Set(signedIds), [signedIds]);

  useEffect(() => {
    setSignedIds(readSignedPetitionIds());
  }, []);

  function signPetition(id: string) {
    if (signedSet.has(id)) return;

    recordGamificationEvent("sign-petition", id);
    const next = [...signedSet, id];
    setSignedIds(next);
    writeSignedPetitionIds(next);
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
          {petitions.map((petition) => {
            const signed = signedSet.has(petition.id);

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
                  <div className="h-full w-[62%] rounded-full bg-gradient-to-r from-[#9064f4] via-[#b98fff] to-[#e2ceff] shadow-[0_0_14px_rgba(174,132,255,0.3)]" />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => signPetition(petition.id)}
                    className={`h-10 rounded-lg border text-[14px] font-medium transition ${
                      signed
                        ? "cursor-default border-[#4fdb89]/32 bg-[#4fdb89]/14 text-[#4fdb89]"
                        : "border-[#c08dff]/38 bg-[#c08dff]/14 text-[#d5b8ff] hover:brightness-110"
                    }`}
                    disabled={signed}
                  >
                    {signed ? "Signed" : "Sign Petition"}
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
          { href: "/search", icon: <CheckCircle2 />, label: "Track" },
          { active: true, href: "/alerts", icon: <Bell />, label: "Alerts" },
          { href: "/account", icon: <UserRound />, label: "Profile" }
        ]}
      />
    </MobileShell>
  );
}
