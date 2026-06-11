"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { Activity, AlertTriangle, CheckCircle2, CopyCheck, RefreshCw } from "lucide-react";
import { MobileCard } from "@/components/mobile-ui";

type FeedbackSummary = {
  active: number;
  byReleaseDecision: {
    beta_acceptable?: number;
    duplicate?: number;
    known_issue?: number;
    later?: number;
    launch_blocker?: number;
  };
  launchBlockers: number;
  open: number;
  total: number;
  untriaged: number;
};

type FeedbackApiResponse = {
  mode?: "database" | "demo";
  summary?: FeedbackSummary;
};

const emptySummary: FeedbackSummary = {
  active: 0,
  byReleaseDecision: {
    beta_acceptable: 0,
    duplicate: 0,
    known_issue: 0,
    later: 0,
    launch_blocker: 0
  },
  launchBlockers: 0,
  open: 0,
  total: 0,
  untriaged: 0
};

export function BetaReadinessSnapshot() {
  const [mode, setMode] = useState<"database" | "demo" | "loading">("loading");
  const [summary, setSummary] = useState<FeedbackSummary>(emptySummary);
  const [statusText, setStatusText] = useState("Checking beta queue...");
  const [lastChecked, setLastChecked] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    void refreshSnapshot();
  }, []);

  async function refreshSnapshot() {
    setRefreshing(true);

    const response = await fetch("/api/feedback", { cache: "no-store" }).catch(() => null);
    const data = response ? ((await response.json().catch(() => null)) as FeedbackApiResponse | null) : null;

    setRefreshing(false);
    setLastChecked(formatCheckTime(new Date()));

    if (!response?.ok || !data?.summary) {
      setMode("loading");
      setSummary(emptySummary);
      setStatusText("Queue snapshot unavailable.");
      return;
    }

    setMode(data.mode ?? "database");
    setSummary(data.summary);
    setStatusText(buildStatusText(data.summary));
  }

  const knownIssues = summary.byReleaseDecision.known_issue ?? 0;
  const duplicates = summary.byReleaseDecision.duplicate ?? 0;

  return (
    <MobileCard variant="rust" className="overflow-hidden px-5 py-5">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
        <div className="min-w-0">
          <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-white/46">Beta Readiness</div>
          <h2 className="mt-2 text-[22px] font-medium leading-tight text-white">Queue snapshot</h2>
          <p className="mt-2 text-[13px] leading-snug text-white/54">{statusText}</p>
        </div>
        <button
          type="button"
          onClick={() => void refreshSnapshot()}
          disabled={refreshing}
          className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-white/14 bg-white/8 text-[#ffb12b] shadow-[0_12px_28px_rgba(1,8,24,0.3)] transition disabled:opacity-50"
          aria-label="Refresh beta readiness snapshot"
        >
          <RefreshCw className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`} strokeWidth={1.9} aria-hidden="true" />
        </button>
      </div>

      <div className="mt-5 grid grid-cols-4 gap-2">
        <ReadinessMetric icon={<Activity />} label="Open" tone="green" value={summary.open} />
        <ReadinessMetric icon={<AlertTriangle />} label="Blockers" tone={summary.launchBlockers ? "red" : "muted"} value={summary.launchBlockers} />
        <ReadinessMetric icon={<CheckCircle2 />} label="Known" tone="gold" value={knownIssues} />
        <ReadinessMetric icon={<CopyCheck />} label="Duplicate" tone="blue" value={duplicates} />
      </div>

      <div className="mt-4 grid grid-cols-[1fr_auto] items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3">
        <div className="min-w-0">
          <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-white/38">{mode}</div>
          <div className="mt-1 text-[13px] leading-snug text-white/54">
            {summary.total} total reports{lastChecked ? `, checked ${lastChecked}` : ""}
          </div>
        </div>
        <Link href="/feedback/review" className="shrink-0 rounded-full border border-white/12 bg-white/5 px-3 py-2 text-[12px] font-semibold text-white/68">
          Review
        </Link>
      </div>
    </MobileCard>
  );
}

function ReadinessMetric({
  icon,
  label,
  tone,
  value
}: {
  icon: ReactNode;
  label: string;
  tone: "blue" | "gold" | "green" | "muted" | "red";
  value: number;
}) {
  const toneClass =
    tone === "red"
      ? "text-[#ff7567]"
      : tone === "green"
        ? "text-[#43ed74]"
        : tone === "gold"
          ? "text-[#ffb12b]"
          : tone === "blue"
            ? "text-[#74dbff]"
            : "text-white/58";

  return (
    <div className="min-h-[88px] rounded-2xl border border-white/8 bg-white/[0.035] px-1.5 py-3 text-center">
      <span className={`mx-auto grid h-6 w-6 place-items-center ${toneClass} [&>svg]:h-4 [&>svg]:w-4 [&>svg]:stroke-[1.8]`}>{icon}</span>
      <div className={`mt-1 text-[22px] font-medium leading-none ${toneClass}`}>{value}</div>
      <div className="mt-2 text-[10px] leading-tight text-white/46">{label}</div>
    </div>
  );
}

function buildStatusText(summary: FeedbackSummary) {
  if (summary.launchBlockers || summary.untriaged) {
    return `${summary.launchBlockers} blocker${summary.launchBlockers === 1 ? "" : "s"} and ${summary.untriaged} untriaged report${
      summary.untriaged === 1 ? "" : "s"
    } need review.`;
  }

  return "No active blockers or untriaged reports.";
}

function formatCheckTime(value: Date) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit"
  }).format(value);
}
