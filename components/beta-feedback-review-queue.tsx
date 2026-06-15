"use client";

import { useEffect, useMemo, useState } from "react";
import { ClipboardCheck, Copy, Download, MessageSquarePlus, RefreshCw, Search } from "lucide-react";
import { MobileGlassScrollFrame } from "@/components/mobile-glass-scroll-frame";
import { MobileCard } from "@/components/mobile-ui";
import type { BetaFeedbackRecord, BetaFeedbackReleaseDecision, BetaFeedbackStatus } from "@/lib/beta-feedback";

const statuses: Array<{ label: string; value: BetaFeedbackStatus }> = [
  { label: "New", value: "new" },
  { label: "Reviewing", value: "reviewing" },
  { label: "Planned", value: "planned" },
  { label: "Resolved", value: "resolved" }
];

const releaseDecisions: Array<{ label: string; value: BetaFeedbackReleaseDecision }> = [
  { label: "Blocker", value: "launch_blocker" },
  { label: "Beta OK", value: "beta_acceptable" },
  { label: "Later", value: "later" },
  { label: "Known", value: "known_issue" },
  { label: "Duplicate", value: "duplicate" }
];

type FeedbackFilter = "all" | "open" | "account" | "blockers" | "high" | "medium" | "low" | "beta_ok" | "later" | "known_issue" | "duplicate" | "untriaged" | BetaFeedbackStatus;

const feedbackFilters: Array<{ label: string; value: FeedbackFilter }> = [
  { label: "All", value: "all" },
  { label: "Open", value: "open" },
  { label: "Account", value: "account" },
  { label: "Blockers", value: "blockers" },
  { label: "High", value: "high" },
  { label: "Medium", value: "medium" },
  { label: "Low", value: "low" },
  { label: "Untriaged", value: "untriaged" },
  { label: "New", value: "new" },
  { label: "Reviewing", value: "reviewing" },
  { label: "Planned", value: "planned" },
  { label: "Beta OK", value: "beta_ok" },
  { label: "Later", value: "later" },
  { label: "Known", value: "known_issue" },
  { label: "Duplicate", value: "duplicate" },
  { label: "Resolved", value: "resolved" }
];

export function BetaFeedbackReviewQueue({
  canManageFeedback,
  initialMode,
  initialRecords
}: {
  canManageFeedback: boolean;
  initialMode: "database" | "demo";
  initialRecords: BetaFeedbackRecord[];
}) {
  const [records, setRecords] = useState(initialRecords);
  const [pendingId, setPendingId] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusText, setStatusText] = useState("");
  const [activeFilter, setActiveFilter] = useState<FeedbackFilter>("open");
  const [lastChecked, setLastChecked] = useState("");
  const metrics = useMemo(() => getFeedbackMetrics(records), [records]);
  const filteredRecords = useMemo(() => searchRecords(filterRecords(records, activeFilter), searchQuery), [activeFilter, records, searchQuery]);
  const reportsLabel = canManageFeedback ? "tester reports" : "submitted reports";
  const listTitle = canManageFeedback ? "Latest Reports" : "My Reports";

  useEffect(() => {
    setLastChecked(formatCheckTime(new Date()));
  }, []);

  async function updateReview(id: string, patch: { releaseDecision?: BetaFeedbackReleaseDecision; status?: BetaFeedbackStatus }) {
    setPendingId(id);
    setStatusText("");

    const response = await fetch("/api/feedback", {
      body: JSON.stringify({ id, ...patch }),
      headers: {
        "Content-Type": "application/json"
      },
      method: "PATCH"
    }).catch(() => null);
    const data = response ? ((await response.json().catch(() => null)) as { error?: string; record?: BetaFeedbackRecord } | null) : null;

    setPendingId("");

    if (!response?.ok || !data?.record) {
      setStatusText(data?.error ?? "Feedback status could not be updated.");
      return;
    }

    setRecords((current) => current.map((record) => (record.id === data.record?.id ? data.record : record)));
    setStatusText("Feedback review updated.");
  }

  async function refreshQueue() {
    setRefreshing(true);
    setStatusText("");

    const response = await fetch("/api/feedback", { cache: "no-store" }).catch(() => null);
    const data = response ? ((await response.json().catch(() => null)) as { error?: string; records?: BetaFeedbackRecord[] } | null) : null;

    setRefreshing(false);

    if (!response?.ok || !Array.isArray(data?.records)) {
      setStatusText(data?.error ?? "Feedback queue could not be refreshed.");
      return;
    }

    setRecords(data.records);
    setLastChecked(formatCheckTime(new Date()));
    setStatusText(`${data.records.length} reports loaded.`);
  }

  async function copyTriageSummary() {
    if (!filteredRecords.length) {
      setStatusText("No reports are available to copy for this filter.");
      return;
    }

    if (!navigator.clipboard?.writeText) {
      setStatusText("Summary copy is not available in this browser.");
      return;
    }

    const summary = buildTriageSummary(filteredRecords, activeFilter);
    await navigator.clipboard
      .writeText(summary)
      .then(() => setStatusText("Triage summary copied."))
      .catch(() => setStatusText("Summary copy is not available in this browser."));
  }

  async function copyReport(record: BetaFeedbackRecord) {
    if (!navigator.clipboard?.writeText) {
      setStatusText("Report copy is not available in this browser.");
      return;
    }

    await navigator.clipboard
      .writeText(buildSingleReportSummary(record))
      .then(() => setStatusText("Feedback report copied."))
      .catch(() => setStatusText("Report copy is not available in this browser."));
  }

  function exportFilteredReports() {
    if (!filteredRecords.length) {
      setStatusText("No reports are available to export for this filter.");
      return;
    }

    const csv = buildFeedbackCsv(filteredRecords);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `capitol-ledger-feedback-${activeFilter}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setStatusText(`${filteredRecords.length} reports exported.`);
  }

  return (
    <>
      <MobileCard variant="dashboard" className="px-5 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[#ffb12b]">
              <MessageSquarePlus className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
              <span className="text-[13px] font-medium uppercase tracking-wide">{canManageFeedback ? "Feedback Intake" : "Feedback History"}</span>
            </div>
            <h2 className="mt-3 text-[22px] font-medium leading-tight text-white">
              {metrics.total} {reportsLabel}
            </h2>
            <p className="mt-2 text-[14px] leading-snug text-white/56">
              {canManageFeedback
                ? initialMode === "database"
                  ? "Reading from the beta feedback database queue."
                  : "Demo-mode reports are stored in this preview session."
                : "Showing reports submitted from this account. Reviewer-only triage controls are hidden."}
            </p>
            {canManageFeedback && initialMode === "database" && metrics.total === 0 ? (
              <p className="mt-2 text-[13px] leading-snug text-white/42">
                If a submitted report is missing, confirm this signed-in email is listed in `BETA_REVIEWER_EMAILS` and that the report was sent from this deployed app.
              </p>
            ) : null}
          </div>
          <span className="rounded-full bg-white/8 px-3 py-1.5 text-[13px] font-medium text-white/52">{initialMode}</span>
        </div>

        <div className="mt-5 grid grid-cols-5 gap-2">
          <Metric label="High" value={metrics.high} tone="text-[#ff7567]" />
          <Metric label="Medium" value={metrics.medium} tone="text-[#ffb12b]" />
          <Metric label="Low" value={metrics.low} tone="text-[#8fb5ff]" />
          <Metric label="Open" value={metrics.open} tone="text-[#43ed74]" />
          <Metric label="Account" value={metrics.account} tone="text-[#74dbff]" />
        </div>

        <div
          className={`mt-4 rounded-2xl border px-4 py-3 text-[13px] leading-snug ${
            metrics.blockers || metrics.needsDecision
              ? "border-[#ffb12b]/24 bg-[#ffb12b]/8 text-[#ffd58a]"
              : "border-[#43ed74]/24 bg-[#43ed74]/10 text-[#56f18a]"
          }`}
        >
          {metrics.blockers || metrics.needsDecision
            ? `${metrics.blockers} blocker${metrics.blockers === 1 ? "" : "s"} and ${metrics.needsDecision} untriaged report${
                metrics.needsDecision === 1 ? "" : "s"
              } need a launch decision.`
            : "No active blockers or untriaged reports."}
        </div>
      </MobileCard>

      <MobileCard variant="dashboard" className="px-5 py-5">
        <h2 className="text-[21px] font-medium leading-none text-white">Active Report Mix</h2>
        <div className="mt-5 grid grid-cols-2 gap-2">
          {Object.entries(metrics.byCategory).map(([category, count]) => (
            <div key={category} className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.035] px-3 py-3">
              <span className="capitalize text-[14px] font-medium text-white/68">{category}</span>
              <span className="text-[16px] font-medium text-[#ffb12b]">{count}</span>
            </div>
          ))}
        </div>
      </MobileCard>

      <MobileCard variant="dashboard" className="px-5 py-5">
        <h2 className="text-[21px] font-medium leading-none text-white">Triage Decisions</h2>
        <div className="mt-5 grid grid-cols-3 gap-2">
          <Metric label="Blocker" value={metrics.byReleaseDecision.launch_blocker} tone="text-[#ff7567]" />
          <Metric label="Beta OK" value={metrics.byReleaseDecision.beta_acceptable} tone="text-[#43ed74]" />
          <Metric label="Later" value={metrics.byReleaseDecision.later} tone="text-[#8fb5ff]" />
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Metric label="Known" value={metrics.byReleaseDecision.known_issue} tone="text-[#ffb12b]" />
          <Metric label="Duplicate" value={metrics.byReleaseDecision.duplicate} tone="text-white" />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Metric label="Needs decision" value={metrics.needsDecision} tone="text-[#ffb12b]" />
          <Metric label="Oldest open" value={metrics.oldestOpenDays} tone="text-white" />
        </div>
      </MobileCard>

      {statusText ? <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-[13px] leading-snug text-white/62">{statusText}</p> : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[24px] font-medium leading-none text-white">{listTitle}</h2>
            <p className="mt-1 text-[12px] leading-none text-white/36">Last checked {lastChecked || "after load"}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-medium text-white/42">{filteredRecords.length} shown</span>
            <button
              type="button"
              onClick={refreshQueue}
              disabled={refreshing}
              className="flex h-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.045] px-3 text-[12px] font-semibold text-white/62 transition disabled:opacity-45"
            >
              <RefreshCw className={`mr-1.5 h-3.5 w-3.5 text-[#ffb12b] ${refreshing ? "animate-spin" : ""}`} strokeWidth={1.9} aria-hidden="true" />
              {refreshing ? "Refreshing" : "Refresh"}
            </button>
          </div>
        </div>

        <MobileGlassScrollFrame axis="horizontal" ariaLabel="Feedback filters" frameClassName="">
          <div className="flex min-w-max gap-2">
            {feedbackFilters.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => setActiveFilter(filter.value)}
                className={`h-10 rounded-full border px-4 text-[13px] font-semibold transition ${
                  activeFilter === filter.value ? "border-[#ffb12b] bg-[#ffb12b] text-[#071225]" : "border-white/10 bg-white/[0.04] text-white/58"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </MobileGlassScrollFrame>

        <label className="relative block">
          <span className="sr-only">Search feedback reports</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/34" strokeWidth={1.8} aria-hidden="true" />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search title, message, page, or contact"
            className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] pl-11 pr-4 text-[15px] text-white outline-none placeholder:text-white/34 focus:border-[#ffb12b]/70"
          />
        </label>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={!filteredRecords.length}
            onClick={copyTriageSummary}
            className="flex h-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.045] text-[13px] font-semibold text-white/64 transition disabled:opacity-40"
          >
            <ClipboardCheck className="mr-2 h-4 w-4 text-[#ffb12b]" strokeWidth={1.8} aria-hidden="true" />
            Copy summary
          </button>
          <button
            type="button"
            disabled={!filteredRecords.length}
            onClick={exportFilteredReports}
            className="flex h-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.045] text-[13px] font-semibold text-white/64 transition disabled:opacity-40"
          >
            <Download className="mr-2 h-4 w-4 text-[#ffb12b]" strokeWidth={1.8} aria-hidden="true" />
            Export CSV
          </button>
        </div>

        {filteredRecords.length ? (
          filteredRecords.map((record) => (
            <FeedbackRecordCard
              canManageFeedback={canManageFeedback}
              key={record.id}
              pending={pendingId === record.id}
              record={record}
              onCopyReport={copyReport}
              onReviewChange={updateReview}
            />
          ))
        ) : (
          <MobileCard variant="dashboard" className="px-5 py-6 text-center">
            <MessageSquarePlus className="mx-auto h-8 w-8 text-[#ffb12b]" strokeWidth={1.8} aria-hidden="true" />
            <h3 className="mt-4 text-[20px] font-medium text-white">{records.length ? "No matching reports" : canManageFeedback ? "No reports yet" : "No submitted reports yet"}</h3>
            <p className="mt-2 text-[14px] leading-snug text-white/54">
              {records.length
                ? "Change the filter to see more beta feedback."
                : canManageFeedback
                  ? "Tester feedback will appear here after the first report is submitted."
                  : "Feedback submitted from this account will appear here."}
            </p>
          </MobileCard>
        )}
      </section>
    </>
  );
}

function Metric({ label, tone, value }: { label: string; tone: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.035] px-1.5 py-3 text-center">
      <div className={`text-[24px] font-medium leading-none ${tone}`}>{value}</div>
      <div className="mt-2 text-[11px] leading-tight text-white/46">{label}</div>
    </div>
  );
}

function FeedbackRecordCard({
  canManageFeedback,
  onCopyReport,
  onReviewChange,
  pending,
  record
}: {
  canManageFeedback: boolean;
  onCopyReport: (record: BetaFeedbackRecord) => void;
  onReviewChange: (id: string, patch: { releaseDecision?: BetaFeedbackReleaseDecision; status?: BetaFeedbackStatus }) => void;
  pending: boolean;
  record: BetaFeedbackRecord;
}) {
  const browserPath = getContextString(record.context, "browserPath");
  const reproducibility = getReproducibilityLabel(record);
  const screen = getContextString(record.context, "screen");
  const sourceLabel = getFeedbackSourceLabel(record);
  const accountReport = sourceLabel === "Account / sign-in";

  return (
    <MobileCard variant="dashboard" className="px-5 py-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <Pill label={record.category} tone="gold" />
            <Pill label={record.severity} tone={record.severity === "high" ? "red" : record.severity === "medium" ? "gold" : "muted"} />
            {accountReport ? <Pill label="Account/Auth" tone="blue" /> : null}
            {record.releaseDecision ? <Pill label={formatReleaseDecision(record.releaseDecision)} tone={releaseDecisionTone(record.releaseDecision)} /> : null}
          </div>
          <h3 className="mt-3 text-[19px] font-medium leading-tight text-white">{record.title}</h3>
          <p className="mt-2 line-clamp-4 text-[14px] leading-snug text-white/58">{record.message}</p>
        </div>
        <span className="shrink-0 rounded-full bg-white/8 px-2.5 py-1 text-[12px] font-medium text-white/52">{record.status}</span>
      </div>

      {canManageFeedback ? (
        <>
          <div className="mt-4 grid grid-cols-4 gap-1.5 border-t border-white/8 pt-4">
            {statuses.map((status) => (
              <button
                key={status.value}
                type="button"
                disabled={pending || record.status === status.value}
                onClick={() => onReviewChange(record.id, { status: status.value })}
                className={`h-9 rounded-xl px-1 text-[11px] font-semibold transition disabled:cursor-default ${
                  record.status === status.value ? "bg-[#ffb12b] text-[#071225]" : "border border-white/10 bg-white/[0.04] text-white/56 disabled:opacity-60"
                }`}
              >
                {pending && record.status !== status.value ? "..." : status.label}
              </button>
            ))}
          </div>

          <div className="mt-4 border-t border-white/8 pt-4">
            <div className="text-[11px] font-medium uppercase tracking-wide text-white/36">Triage decision</div>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {releaseDecisions.map((decision) => (
                <button
                  key={decision.value}
                  type="button"
                  disabled={pending || record.releaseDecision === decision.value}
                  onClick={() => onReviewChange(record.id, { releaseDecision: decision.value })}
                  className={`h-9 rounded-xl px-1 text-[11px] font-semibold transition disabled:cursor-default ${
                    record.releaseDecision === decision.value ? "bg-[#ffb12b] text-[#071225]" : "border border-white/10 bg-white/[0.04] text-white/56 disabled:opacity-60"
                  }`}
                >
                  {pending && record.releaseDecision !== decision.value ? "..." : decision.label}
                </button>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-3 text-[12px] leading-snug text-white/46">
          Reviewer access required for status and launch-decision updates.
        </div>
      )}

      <div className="mt-4 grid grid-cols-[1fr_auto] items-end gap-3 border-t border-white/8 pt-4 text-[12px] text-white/42">
        <span className="min-w-0 truncate">{record.pageUrl ?? "No page attached"}</span>
        <span>{formatShortDate(record.createdAt)}</span>
      </div>

      {record.contactEmail || accountReport || browserPath || reproducibility || screen ? (
        <div className="mt-3 grid gap-2 text-[12px] text-white/46">
          {record.contactEmail ? <ReportMeta label="Contact" value={record.contactEmail} /> : null}
          {accountReport ? <ReportMeta label="Source" value={sourceLabel} /> : null}
          {reproducibility ? <ReportMeta label="Repro" value={reproducibility} /> : null}
          {browserPath ? <ReportMeta label="Path" value={browserPath} /> : null}
          {screen ? <ReportMeta label="Screen" value={screen} /> : null}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => onCopyReport(record)}
        className="mt-4 flex h-10 w-full items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-[13px] font-semibold text-white/62 transition"
      >
        <Copy className="mr-2 h-4 w-4 text-[#ffb12b]" strokeWidth={1.8} aria-hidden="true" />
        Copy report
      </button>
    </MobileCard>
  );
}

function ReportMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[4.75rem_minmax(0,1fr)] gap-2">
      <span className="text-white/34">{label}</span>
      <span className="min-w-0 truncate text-white/58">{value}</span>
    </div>
  );
}

function Pill({ label, tone }: { label: string; tone: "blue" | "gold" | "muted" | "red" }) {
  const toneClass =
    tone === "red"
      ? "border-[#ff7567]/35 bg-[#ff7567]/10 text-[#ff8e83]"
      : tone === "blue"
        ? "border-[#74dbff]/30 bg-[#74dbff]/10 text-[#91e7ff]"
        : tone === "gold"
          ? "border-rust/30 bg-rust/10 text-[#ffb12b]"
          : "border-white/10 bg-white/[0.06] text-white/52";

  return <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide ${toneClass}`}>{label}</span>;
}

function getFeedbackMetrics(records: BetaFeedbackRecord[]) {
  const activeRecords = records.filter((record) => record.status !== "resolved");
  const openRecords = activeRecords.filter((record) => record.status === "new" || record.status === "reviewing");
  const byCategory: Record<BetaFeedbackRecord["category"], number> = {
    bug: 0,
    data: 0,
    design: 0,
    flow: 0,
    missing: 0,
    other: 0
  };
  const byReleaseDecision: Record<BetaFeedbackReleaseDecision, number> = {
    beta_acceptable: 0,
    duplicate: 0,
    known_issue: 0,
    later: 0,
    launch_blocker: 0
  };

  for (const record of activeRecords) {
    byCategory[record.category] += 1;
    if (record.releaseDecision) byReleaseDecision[record.releaseDecision] += 1;
  }

  return {
    byCategory,
    byReleaseDecision,
    account: activeRecords.filter(isAccountFeedback).length,
    blockers: activeRecords.filter((record) => record.releaseDecision === "launch_blocker").length,
    high: activeRecords.filter((record) => record.severity === "high").length,
    low: activeRecords.filter((record) => record.severity === "low").length,
    medium: activeRecords.filter((record) => record.severity === "medium").length,
    needsDecision: activeRecords.filter((record) => !record.releaseDecision).length,
    oldestOpenDays: getOldestAgeDays(openRecords),
    open: openRecords.length,
    total: records.length
  };
}

function buildTriageSummary(records: BetaFeedbackRecord[], filter: FeedbackFilter) {
  const activeRecords = records.filter((record) => record.status !== "resolved");
  const statusCounts = statuses.map((status) => `${status.label}: ${records.filter((record) => record.status === status.value).length}`).join(", ");
  const severityCounts = [
    `High: ${activeRecords.filter((record) => record.severity === "high").length}`,
    `Medium: ${activeRecords.filter((record) => record.severity === "medium").length}`,
    `Low: ${activeRecords.filter((record) => record.severity === "low").length}`
  ].join(", ");
  const releaseCounts = releaseDecisions
    .map((decision) => `${decision.label}: ${activeRecords.filter((record) => record.releaseDecision === decision.value).length}`)
    .join(", ");

  return [
    `Capitol Ledger beta feedback - ${formatFilterLabel(filter)}`,
    `${records.length} reports in this view`,
    `Active severity: ${severityCounts}`,
    `Decision triage: ${releaseCounts}`,
    `Statuses: ${statusCounts}`,
    "",
    ...records.map((record, index) =>
      [
        `${index + 1}. ${record.title}`,
        `   ${record.severity.toUpperCase()} ${record.category} - ${record.status} - ${record.releaseDecision ? formatReleaseDecision(record.releaseDecision) : "Untriaged"}`,
        `   Source: ${getFeedbackSourceLabel(record)}`,
        `   Page: ${record.pageUrl ?? "No page attached"}`,
        record.contactEmail ? `   Contact: ${record.contactEmail}` : "",
        getReproducibilityLabel(record) ? `   Reproducible: ${getReproducibilityLabel(record)}` : "",
        getContextString(record.context, "screen") ? `   Screen: ${getContextString(record.context, "screen")}` : "",
        `   ${record.message}`
      ]
        .filter(Boolean)
        .join("\n")
    )
  ].join("\n");
}

function buildSingleReportSummary(record: BetaFeedbackRecord) {
  const browserPath = getContextString(record.context, "browserPath");
  const reproducibility = getReproducibilityLabel(record);
  const screen = getContextString(record.context, "screen");
  const userAgent = getContextString(record.context, "userAgent");

  return [
    record.title,
    `${record.severity.toUpperCase()} ${record.category} - ${record.status} - ${record.releaseDecision ? formatReleaseDecision(record.releaseDecision) : "Untriaged"}`,
    `Source: ${getFeedbackSourceLabel(record)}`,
    `Created: ${formatLongDate(record.createdAt)}`,
    `Page: ${record.pageUrl ?? "No page attached"}`,
    record.contactEmail ? `Contact: ${record.contactEmail}` : "",
    reproducibility ? `Reproducible: ${reproducibility}` : "",
    browserPath ? `Browser path: ${browserPath}` : "",
    screen ? `Screen: ${screen}` : "",
    userAgent ? `User agent: ${userAgent}` : "",
    "",
    record.message
  ]
    .filter(Boolean)
    .join("\n");
}

function buildFeedbackCsv(records: BetaFeedbackRecord[]) {
  const rows = [
    ["title", "source", "category", "severity", "status", "releaseDecision", "reproducibility", "pageUrl", "browserPath", "screen", "createdAt", "contactEmail", "message"],
    ...records.map((record) => [
      record.title,
      getFeedbackSourceLabel(record),
      record.category,
      record.severity,
      record.status,
      record.releaseDecision ? formatReleaseDecision(record.releaseDecision) : "",
      getReproducibilityLabel(record),
      record.pageUrl ?? "",
      getContextString(record.context, "browserPath"),
      getContextString(record.context, "screen"),
      record.createdAt,
      record.contactEmail ?? "",
      record.message
    ])
  ];

  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

function csvCell(value: string) {
  return `"${value.replace(/\r?\n/g, " ").replace(/"/g, '""')}"`;
}

function filterRecords(records: BetaFeedbackRecord[], filter: FeedbackFilter) {
  if (filter === "all") return records;
  if (filter === "open") return records.filter((record) => record.status === "new" || record.status === "reviewing");
  if (filter === "account") return records.filter((record) => record.status !== "resolved" && isAccountFeedback(record));
  if (filter === "blockers") return records.filter((record) => record.status !== "resolved" && record.releaseDecision === "launch_blocker");
  if (filter === "high" || filter === "medium" || filter === "low") return records.filter((record) => record.status !== "resolved" && record.severity === filter);
  if (filter === "beta_ok") return records.filter((record) => record.status !== "resolved" && record.releaseDecision === "beta_acceptable");
  if (filter === "later") return records.filter((record) => record.status !== "resolved" && record.releaseDecision === "later");
  if (filter === "known_issue") return records.filter((record) => record.status !== "resolved" && record.releaseDecision === "known_issue");
  if (filter === "duplicate") return records.filter((record) => record.status !== "resolved" && record.releaseDecision === "duplicate");
  if (filter === "untriaged") return records.filter((record) => record.status !== "resolved" && !record.releaseDecision);
  return records.filter((record) => record.status === filter);
}

function searchRecords(records: BetaFeedbackRecord[], query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return records;

  return records.filter((record) =>
    [
      record.category,
      record.contactEmail ?? "",
      getFeedbackSourceLabel(record),
      getReproducibilityLabel(record),
      record.message,
      record.pageUrl ?? "",
      record.releaseDecision ? formatReleaseDecision(record.releaseDecision) : "Untriaged",
      record.severity,
      record.status,
      record.title
    ].some((value) => value.toLowerCase().includes(normalizedQuery))
  );
}

function formatFilterLabel(filter: FeedbackFilter) {
  if (filter === "all") return "All reports";
  if (filter === "open") return "Open reports";
  if (filter === "account") return "Account/auth reports";
  if (filter === "blockers") return "Launch blockers";
  if (filter === "high") return "High severity reports";
  if (filter === "medium") return "Medium severity reports";
  if (filter === "low") return "Low severity reports";
  if (filter === "beta_ok") return "Beta acceptable reports";
  if (filter === "later") return "Later reports";
  if (filter === "known_issue") return "Known issue reports";
  if (filter === "duplicate") return "Duplicate reports";
  if (filter === "untriaged") return "Untriaged reports";
  return `${filter.charAt(0).toUpperCase()}${filter.slice(1)} reports`;
}

function formatReleaseDecision(value: BetaFeedbackReleaseDecision) {
  if (value === "launch_blocker") return "Launch blocker";
  if (value === "beta_acceptable") return "Beta acceptable";
  if (value === "known_issue") return "Known issue";
  if (value === "duplicate") return "Duplicate";
  return "Later";
}

function releaseDecisionTone(value: BetaFeedbackReleaseDecision): "blue" | "gold" | "muted" | "red" {
  if (value === "launch_blocker") return "red";
  if (value === "known_issue") return "gold";
  if (value === "duplicate") return "blue";
  return "muted";
}

function normalizeFeedbackPath(value?: string) {
  if (!value) return "";

  try {
    return new URL(value, "https://capitol-ledger.local").pathname.toLowerCase();
  } catch {
    return value.trim().split("?")[0].toLowerCase();
  }
}

function isAccountFeedback(record: BetaFeedbackRecord) {
  const path = normalizeFeedbackPath(record.pageUrl);
  const reportSource = getContextString(record.context, "reportSource").toLowerCase();
  const reportSourceLabel = getContextString(record.context, "reportSourceLabel").toLowerCase();

  return (
    reportSource === "account" ||
    reportSourceLabel.includes("account") ||
    reportSourceLabel.includes("sign-in") ||
    path === "/account" ||
    path.startsWith("/account/") ||
    path === "/settings" ||
    path.startsWith("/settings/") ||
    path === "/sign-in" ||
    path.startsWith("/sign-in/")
  );
}

function getReproducibilityLabel(record: BetaFeedbackRecord) {
  const label = getContextString(record.context, "reproducibilityLabel");
  const value = getContextString(record.context, "reproducibility");

  if (label) return label;
  if (value === "yes") return "Yes";
  if (value === "no") return "No";
  if (value === "unknown") return "Not sure";
  return "";
}

function getFeedbackSourceLabel(record: BetaFeedbackRecord) {
  return getContextString(record.context, "reportSourceLabel") || (isAccountFeedback(record) ? "Account / sign-in" : "General app");
}

function getContextString(context: BetaFeedbackRecord["context"], key: string) {
  const value = context?.[key];
  return typeof value === "string" ? value.trim() : "";
}

function getOldestAgeDays(records: BetaFeedbackRecord[]) {
  const timestamps = records.map((record) => new Date(record.createdAt).getTime()).filter((timestamp) => !Number.isNaN(timestamp));
  if (!timestamps.length) return 0;

  const oldest = Math.min(...timestamps);
  return Math.max(0, Math.floor((Date.now() - oldest) / 86_400_000));
}

function formatShortDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "New";

  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short"
  }).format(date);
}

function formatLongDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "New";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function formatCheckTime(value: Date) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit"
  }).format(value);
}
