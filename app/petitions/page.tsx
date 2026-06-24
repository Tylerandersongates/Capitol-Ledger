"use client";

import { GamificationSync } from "@/components/gamification-sync";
import { MobileShell } from "@/components/mobile-shell";
import { MobileBottomNav, MobileCard, mobileIconButtonClass } from "@/components/mobile-ui";
import { recordGamificationEvent } from "@/lib/browser-gamification";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bell, CheckCircle2, ExternalLink, FileText, Home, Megaphone, Settings } from "lucide-react";

type RegulationsGovAction = {
  agencyId: string;
  commentLabel: string;
  commentUrl: string;
  documentId: string;
  documentType: string;
  docketId?: string;
  id: string;
  sourceLabel: string;
  sourceUrl: string;
  subtype?: string;
  title: string;
};

type RegulationsGovFeed = {
  actions?: RegulationsGovAction[];
  configured?: boolean;
  error?: string;
};

type RegulationsGovStatus = "loading" | "ready" | "empty" | "error" | "not-configured";

const commentedActionIdsKey = "capitol-ledger:commented-public-actions";

function readCommentedActionIds() {
  if (typeof window === "undefined") return [];

  try {
    const value = JSON.parse(window.localStorage.getItem(commentedActionIdsKey) ?? "[]");
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function writeCommentedActionIds(ids: string[]) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(commentedActionIdsKey, JSON.stringify(ids));
  } catch {
    return;
  }
}

export default function PetitionsPage() {
  const [regulationsActions, setRegulationsActions] = useState<RegulationsGovAction[]>([]);
  const [regulationsStatus, setRegulationsStatus] = useState<RegulationsGovStatus>("loading");
  const [commentedActionIds, setCommentedActionIds] = useState<string[]>([]);
  const commentedSet = useMemo(() => new Set(commentedActionIds), [commentedActionIds]);

  useEffect(() => {
    setCommentedActionIds(readCommentedActionIds());
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadRegulationsActions() {
      setRegulationsStatus("loading");

      try {
        const response = await fetch("/api/civic-actions/regulations", {
          cache: "no-store",
          signal: controller.signal
        });
        const data = (await response.json().catch(() => null)) as RegulationsGovFeed | null;

        if (!response.ok) {
          setRegulationsStatus("error");
          return;
        }

        if (data?.configured === false) {
          setRegulationsStatus("not-configured");
          return;
        }

        const actions = Array.isArray(data?.actions) ? data.actions : [];
        setRegulationsActions(actions);
        setRegulationsStatus(actions.length ? "ready" : "empty");
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
        setRegulationsStatus("error");
      }
    }

    void loadRegulationsActions();

    return () => controller.abort();
  }, []);

  function markCommented(action: RegulationsGovAction) {
    if (commentedSet.has(action.id)) return;

    const next = [action.id, ...commentedActionIds];
    setCommentedActionIds(next);
    writeCommentedActionIds(next);
    recordGamificationEvent("complete-public-comment", action.id);
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
        <h1 className="text-[24px] font-medium leading-none text-white">Civic actions</h1>
      </header>

      <main className="mt-6 pb-5">
        <MobileCard variant="dashboard" className="px-4 py-4">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
            <div>
              <div className="text-[13px] font-medium uppercase tracking-[0.08em] text-white/52">Official public comments</div>
              <p className="mt-2 text-[15px] leading-snug text-white/66">
                Open active Regulations.gov comment windows, then mark comments you completed.
              </p>
            </div>
            <div className="shrink-0 rounded-full border border-[#c08dff]/35 bg-[#c08dff]/14 px-2.5 py-1 text-[13px] font-medium text-[#d5b8ff]">
              Commented {commentedActionIds.length}
            </div>
          </div>
          <div className="mt-3 text-[11px] font-medium uppercase tracking-[0.07em] text-white/48">
            Comments are completed on Regulations.gov and tracked here for your record.
          </div>
        </MobileCard>

        <section className="mt-4">
          <div className="mb-3 flex items-center justify-between px-1">
            <h2 className="text-[21px] font-medium leading-none text-white">Official comment windows</h2>
            <span className="text-[11px] font-medium uppercase tracking-[0.07em] text-white/42">Regulations.gov</span>
          </div>

          {regulationsStatus === "loading" ? (
            <MobileCard variant="dashboard" className="px-4 py-5">
              <div className="text-[14px] text-white/58">Loading public comment opportunities...</div>
            </MobileCard>
          ) : null}

          {regulationsStatus === "not-configured" ? (
            <MobileCard variant="dashboard" className="px-4 py-5">
              <div className="text-[16px] font-medium text-white">Official feed not connected</div>
              <p className="mt-2 text-[13px] leading-snug text-white/54">Add a Regulations.gov API key to show current federal comment windows here.</p>
            </MobileCard>
          ) : null}

          {regulationsStatus === "error" ? (
            <MobileCard variant="dashboard" className="px-4 py-5">
              <div className="text-[16px] font-medium text-white">Official feed unavailable</div>
              <p className="mt-2 text-[13px] leading-snug text-white/54">Comment opportunities will return here when the feed is available.</p>
            </MobileCard>
          ) : null}

          {regulationsStatus === "empty" ? (
            <MobileCard variant="dashboard" className="px-4 py-5">
              <div className="text-[16px] font-medium text-white">No open comment windows found</div>
              <p className="mt-2 text-[13px] leading-snug text-white/54">Check back soon for new federal opportunities imported from Regulations.gov.</p>
            </MobileCard>
          ) : null}

          {regulationsStatus === "ready" ? (
            <div className="space-y-3">
              {regulationsActions.map((action) => (
                <OfficialCommentCard key={action.id} action={action} commented={commentedSet.has(action.id)} onCommented={markCommented} />
              ))}
            </div>
          ) : null}
        </section>

        <div className="mt-5 mb-3 flex items-center justify-between px-1">
          <h2 className="text-[21px] font-medium leading-none text-white">Petitions</h2>
          <span className="text-[11px] font-medium uppercase tracking-[0.07em] text-white/42">Coming soon</span>
        </div>

        <MobileCard variant="dashboard" className="px-4 py-5">
          <div className="grid grid-cols-[44px_minmax(0,1fr)] gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl border border-[#c08dff]/24 bg-[#c08dff]/12 text-[#d5b8ff]">
              <Megaphone className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <div className="text-[17px] font-medium leading-tight text-white">Live petitions coming soon</div>
              <p className="mt-2 text-[13px] leading-snug text-white/54">
                Third-party petition APIs are not connected yet. We will add partner-backed petitions when there is a reliable source that fits the budget.
              </p>
            </div>
          </div>
        </MobileCard>
      </main>

      <MobileBottomNav
        items={[
          { href: "/dashboard", icon: <Home />, label: "Home" },
          { href: "/search?type=bills", icon: <FileText />, label: "Bills" },
          { active: true, href: "/petitions", icon: <Megaphone />, label: "Actions" },
          { href: "/alerts", icon: <Bell />, label: "Alerts" },
          { href: "/settings", icon: <Settings />, label: "Settings" }
        ]}
      />
    </MobileShell>
  );
}

function OfficialCommentCard({
  action,
  commented,
  onCommented
}: {
  action: RegulationsGovAction;
  commented: boolean;
  onCommented: (action: RegulationsGovAction) => void;
}) {
  const detailLabel = [action.docketId, action.subtype].filter(Boolean).join(" • ") || action.documentId;

  return (
    <MobileCard variant="dashboard" className="px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-medium uppercase tracking-[0.07em] text-[#d5b8ff]">{action.sourceLabel}</div>
          <h3 className="mt-2 text-[18px] font-medium leading-tight text-white">{action.title}</h3>
          <p className="mt-2 line-clamp-2 text-[13px] leading-snug text-white/54">{detailLabel}</p>
        </div>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/12 bg-white/[0.04] text-[#d5b8ff]">
          <Megaphone className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between text-[12px] text-white/56">
        <span>Open for public comment</span>
        <span>{action.commentLabel}</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onCommented(action)}
          disabled={commented}
          className={`flex h-10 items-center justify-center gap-1.5 rounded-lg border px-2 text-[14px] font-medium transition ${
            commented
              ? "cursor-default border-[#4fdb89]/32 bg-[#4fdb89]/14 text-[#4fdb89]"
              : "border-[#c08dff]/38 bg-[#c08dff]/14 text-[#d5b8ff] hover:brightness-110"
          }`}
        >
          {commented ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
              Commented
            </>
          ) : (
            "I commented"
          )}
        </button>
        <a
          href={action.commentUrl}
          target="_blank"
          rel="noreferrer"
          onClick={() => recordGamificationEvent("open-official-source", action.id)}
          className="flex h-10 items-center justify-center gap-1.5 rounded-lg border border-white/12 bg-[linear-gradient(180deg,rgba(26,73,127,0.28)_0%,rgba(6,25,55,0.66)_100%)] px-2 text-[14px] font-medium text-[#ffb62e] shadow-[inset_0_1px_0_rgba(255,255,255,0.11),0_10px_24px_rgba(1,8,24,0.42)] transition hover:brightness-110"
        >
          Open comment
          <ExternalLink className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
        </a>
      </div>
    </MobileCard>
  );
}
