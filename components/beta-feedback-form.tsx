"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, ClipboardList, MessageSquarePlus } from "lucide-react";
import { publicBrandName } from "@/lib/brand";

type FeedbackCategory = "bug" | "flow" | "missing" | "data" | "design" | "other";
type FeedbackSeverity = "low" | "medium" | "high";
type FeedbackCategoryChoice = FeedbackCategory | "";
type FeedbackSeverityChoice = FeedbackSeverity | "";
type ReproducibilityChoice = "yes" | "no" | "unknown" | "";
type FeedbackArea = {
  helper?: string;
  label: string;
  value: string;
};

const categories: Array<{ label: string; value: FeedbackCategory }> = [
  { label: "Bug", value: "bug" },
  { label: "Flow", value: "flow" },
  { label: "Missing", value: "missing" },
  { label: "Data", value: "data" },
  { label: "Design", value: "design" },
  { label: "Other", value: "other" }
];

const severities: Array<{ label: string; value: FeedbackSeverity }> = [
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" }
];

const reproducibilityChoices: Array<{ label: string; value: ReproducibilityChoice }> = [
  { label: "Yes", value: "yes" },
  { label: "No", value: "no" },
  { label: "Not sure", value: "unknown" }
];

const feedbackAreas: FeedbackArea[] = [
  { label: "Dashboard", value: "/dashboard" },
  {
    helper: "Mention whether this happened during account creation, sign out, sign back in, verification, or saved setup sync.",
    label: "Account / sign-in",
    value: "/account"
  },
  { label: "Search / discovery", value: "/search" },
  { label: "Bill detail / sources", value: "/bills" },
  { label: "AI Policy Lens", value: "/bills/ai-policy-lens" },
  { label: "Official statements / video", value: "/bills/official-statements" },
  { label: "Official profile / service history", value: "/members" },
  { label: "Live civic data", value: "/data" },
  { label: "Notifications", value: "/alerts" },
  { label: "Badges / impact", value: "/badges" },
  { label: "Saved state / day streak", value: "/saved-state" },
  { label: "Pro upgrade / purchases", value: "/upgrade" },
  { label: "Team workspace", value: "/team" },
  { label: "Team invite acceptance", value: "/team/accept" },
  { label: "Team roles / permissions", value: "/team/roles" },
  { label: "Team seats / removal", value: "/team/seats" },
  { label: "Team billing / downgrade", value: "/team/billing" },
  { label: "Settings / profile", value: "/settings" },
  { label: "Live app testing", value: "/feedback" },
  { label: "Other", value: "/other" }
];

const sourceAreaMap: Record<string, string> = {
  account: "/account",
  alerts: "/alerts",
  "ai-policy-lens": "/bills/ai-policy-lens",
  badges: "/badges",
  beta: "/feedback",
  bills: "/bills",
  data: "/data",
  dashboard: "/dashboard",
  "day-streak": "/saved-state",
  "live-testing": "/feedback",
  "live-data": "/data",
  members: "/members",
  "official-statements": "/bills/official-statements",
  search: "/search",
  "service-history": "/members",
  settings: "/settings",
  team: "/team",
  "team-admin": "/team/roles",
  "team-invite": "/team/accept",
  "team-owner-downgrade": "/team/billing",
  "team-seat-removal": "/team/seats",
  "team-seats": "/team/seats",
  "team-viewer": "/team/roles",
  upgrade: "/upgrade",
  video: "/bills/official-statements",
  "round-3": "/feedback"
};

type SubmissionState = "idle" | "submitting" | "sent" | "error";

export function BetaFeedbackForm({ initialSource = "" }: { initialSource?: string }) {
  const [category, setCategory] = useState<FeedbackCategoryChoice>("");
  const [severity, setSeverity] = useState<FeedbackSeverityChoice>("");
  const [pageUrl, setPageUrl] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [reproducibility, setReproducibility] = useState<ReproducibilityChoice>("");
  const [sourceParam, setSourceParam] = useState("");
  const [state, setState] = useState<SubmissionState>("idle");
  const [statusText, setStatusText] = useState("");

  useEffect(() => {
    const source = normalizeSourceParam(initialSource);
    const nextPage = sourceAreaMap[source] ?? (source ? `/${source}` : "");
    const matchedArea = findFeedbackArea(nextPage);
    setSourceParam(source);
    setPageUrl(matchedArea?.value ?? "");
  }, [initialSource]);

  const selectedArea = useMemo(() => feedbackAreas.find((area) => area.value === pageUrl), [pageUrl]);
  const selectedAreaIsAccount = selectedArea?.value === "/account";
  const canSubmit = useMemo(
    () => Boolean(category && severity && pageUrl && title.trim().length > 2 && message.trim().length > 8 && state !== "submitting"),
    [category, message, pageUrl, severity, state, title]
  );

  async function submitFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || !category || !severity || !pageUrl) return;

    setState("submitting");
    setStatusText("");

    const payload = {
      category,
      contactEmail: contactEmail.trim() || undefined,
      context: {
        browserPath: window.location.pathname,
        reportSource: sourceParam || selectedArea?.value.replace(/^\//, "") || "manual",
        reportSourceLabel: selectedArea?.label ?? "Manual selection",
        reportedArea: selectedArea?.value ?? pageUrl,
        reproducibility: reproducibility || undefined,
        reproducibilityLabel: formatReproducibility(reproducibility),
        screen: `${window.innerWidth}x${window.innerHeight}`,
        sourceParam: sourceParam || undefined,
        userAgent: window.navigator.userAgent
      },
      message,
      pageUrl,
      severity,
      title
    };

    const response = await fetch("/api/feedback", {
      body: JSON.stringify(payload),
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST"
    }).catch(() => null);
    const data = response ? ((await response.json().catch(() => null)) as { error?: string; mode?: string } | null) : null;

    if (!response?.ok) {
      setState("error");
      setStatusText(data?.error ?? "Report could not be submitted. Please try again.");
      return;
    }

    setState("sent");
    setStatusText(data?.mode === "database" ? "Report sent to the review queue." : "Report saved for review on this device.");
    setCategory("");
    setSeverity("");
    setPageUrl("");
    setReproducibility("");
    setTitle("");
    setMessage("");
    setContactEmail("");
  }

  async function submitInputFallbackReport() {
    setState("submitting");
    setStatusText("");

    const response = await fetch("/api/feedback", {
      body: JSON.stringify({
        category: "bug",
        context: {
          browserPath: window.location.pathname,
          reportSource: "tap-only-input-fallback",
          reportSourceLabel: "Cannot type in text fields",
          reportedArea: selectedArea?.value ?? sourceParam ?? "feedback",
          screen: `${window.innerWidth}x${window.innerHeight}`,
          sourceParam: sourceParam || undefined,
          userAgent: window.navigator.userAgent
        },
        message:
          "An input issue report was sent because text fields would not accept typing. Buttons could still be tapped. Please follow up on text field focus.",
        pageUrl: `${window.location.pathname}${window.location.search}`,
        severity: "high",
        title: "Cannot type in text fields"
      }),
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST"
    }).catch(() => null);
    const data = response ? ((await response.json().catch(() => null)) as { error?: string; mode?: string } | null) : null;

    if (!response?.ok) {
      setState("error");
      setStatusText(data?.error ?? "The input issue report could not be sent. Please message Tyler directly.");
      return;
    }

    setState("sent");
    setStatusText(data?.mode === "database" ? "Input issue sent to the review queue." : "Input issue saved for review on this device.");
  }

  return (
    <form onSubmit={submitFeedback} className="space-y-5">
      <section className="rounded-[1.35rem] border border-white/10 bg-[#061a33]/76 px-5 py-5 shadow-[inset_0_0_24px_rgba(43,141,255,0.06),0_18px_42px_rgba(0,0,0,0.18)] backdrop-blur-xl">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#ffb12b]/12 text-[#ffb12b]">
            <MessageSquarePlus className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-[22px] font-medium leading-tight">Report a live app issue</h2>
            <p className="mt-2 text-[14px] leading-5 text-white/56">
              Report anything that breaks, feels confusing, looks off, or would make {publicBrandName} more useful.
            </p>
          </div>
        </div>
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/42">Report target</span>
            {sourceParam ? <span className="shrink-0 rounded-full border border-[#ffb12b]/24 bg-[#ffb12b]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#ffb12b]">Live app</span> : null}
          </div>
          <div className="mt-2 text-[17px] font-semibold leading-tight text-white">{selectedArea?.label ?? "Choose app area"}</div>
          <p className="mt-1 text-[13px] leading-snug text-white/50">
            {selectedArea?.helper ?? "The selected area is attached to the report so it lands in the right review bucket."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void submitInputFallbackReport()}
          disabled={state === "submitting"}
          className="mt-4 flex min-h-11 w-full items-center justify-center rounded-2xl border border-[#ffb12b]/24 bg-[#ffb12b]/10 px-4 py-2 text-[14px] font-semibold text-[#ffb12b] transition hover:brightness-110 disabled:opacity-45"
        >
          Cannot type? Send input issue
        </button>
      </section>

      <section className="rounded-[1.35rem] border border-white/10 bg-[#061a33]/76 px-5 py-5 shadow-[inset_0_0_24px_rgba(43,141,255,0.06),0_18px_42px_rgba(0,0,0,0.18)] backdrop-blur-xl">
        <FieldLabel label="Type" />
        <div className="mt-3 grid grid-cols-3 gap-2">
          {categories.map((item) => (
            <button
              key={item.value}
              type="button"
              aria-pressed={category === item.value}
              onClick={() => setCategory((current) => (current === item.value ? "" : item.value))}
              className={`h-11 rounded-xl border text-[14px] font-semibold transition ${
                category === item.value ? "border-[#ffb12b] bg-[#ffb12b] text-[#061126]" : "border-white/12 bg-white/5 text-white/68"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="mt-5">
          <FieldLabel label="Impact" />
          <div className="mt-3 grid grid-cols-3 gap-2">
            {severities.map((item) => (
              <button
                key={item.value}
                type="button"
                aria-pressed={severity === item.value}
                onClick={() => setSeverity((current) => (current === item.value ? "" : item.value))}
                className={`h-11 rounded-xl border text-[14px] font-semibold transition ${
                  severity === item.value ? "border-[#ffb12b] bg-[#ffb12b] text-[#061126]" : "border-white/12 bg-white/5 text-white/68"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <FieldLabel label="Where did it happen?" />
          <select
            value={pageUrl}
            onChange={(event) => setPageUrl(event.target.value)}
            className="mt-3 h-12 w-full appearance-none rounded-2xl border border-white/12 bg-[#020b18]/70 px-4 text-[16px] text-white outline-none focus:border-[#ffb12b]/70"
          >
            <option value="" disabled className="bg-[#061126] text-white/50">
              Choose app area
            </option>
            {feedbackAreas.map((area) => (
              <option key={area.value} value={area.value} className="bg-[#061126] text-white">
                {area.label}
              </option>
            ))}
          </select>
          <p className="mt-2 text-[13px] leading-5 text-white/42">
            {selectedArea?.helper ?? "Choose the closest app area so the report is easier to triage."}
          </p>
          {selectedAreaIsAccount ? (
            <div className="mt-3 rounded-2xl border border-[#74dbff]/20 bg-[#74dbff]/10 px-4 py-3 text-[13px] leading-snug text-[#a7ebff]">
              Account reports are tagged for auth triage. Mention whether setup choices, saved records, or session return did not carry through as expected.
            </div>
          ) : null}
        </div>

        <div className="mt-5">
          <FieldLabel label="Short title" />
          <input
            autoCapitalize="sentences"
            autoCorrect="on"
            spellCheck={true}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Example: dashboard card feels confusing"
            className="mt-3 h-12 w-full rounded-2xl border border-white/12 bg-[#020b18]/70 px-4 text-[16px] text-white outline-none placeholder:text-white/34 focus:border-[#ffb12b]/70"
          />
        </div>

        <div className="mt-5">
          <FieldLabel label="What happened?" />
          <textarea
            autoCapitalize="sentences"
            autoCorrect="on"
            spellCheck={true}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Tell us what you expected, what happened, and what would make the flow better."
            rows={6}
            className="mt-3 w-full resize-none rounded-2xl border border-white/12 bg-[#020b18]/70 px-4 py-3 text-[16px] leading-6 text-white outline-none placeholder:text-white/34 focus:border-[#ffb12b]/70"
          />
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between gap-3">
            <FieldLabel label="Can you reproduce it?" />
            <span className="text-[12px] font-medium text-white/34">Optional</span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {reproducibilityChoices.map((item) => (
              <button
                key={item.value}
                type="button"
                aria-pressed={reproducibility === item.value}
                onClick={() => setReproducibility((current) => (current === item.value ? "" : item.value))}
                className={`h-11 rounded-xl border text-[14px] font-semibold transition ${
                  reproducibility === item.value ? "border-[#74dbff] bg-[#74dbff] text-[#061126]" : "border-white/12 bg-white/5 text-white/68"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[13px] leading-5 text-white/42">Reproducible reports are easier to group, verify, and fix.</p>
        </div>

        <div className="mt-5">
          <FieldLabel label="Contact email (optional)" />
          <input
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect="off"
            inputMode="email"
            spellCheck={false}
            value={contactEmail}
            onChange={(event) => setContactEmail(event.target.value)}
            placeholder="Only if you want follow-up"
            className="mt-3 h-12 w-full rounded-2xl border border-white/12 bg-[#020b18]/70 px-4 text-[16px] text-white outline-none placeholder:text-white/34 focus:border-[#ffb12b]/70"
          />
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="mt-6 flex h-[52px] w-full items-center justify-center rounded-2xl bg-gradient-to-r from-[#ffdf63] via-[#ffb12b] to-[#ff8a00] text-[17px] font-semibold text-[#061126] shadow-[0_0_24px_rgba(255,177,43,0.22)] transition disabled:opacity-45"
        >
          {state === "submitting" ? "Sending..." : "Send report"}
          {state !== "submitting" ? <ArrowRight className="ml-2 h-5 w-5" strokeWidth={2} aria-hidden="true" /> : null}
        </button>

        {statusText ? (
          <div className={`mt-4 flex items-start gap-3 rounded-2xl border px-4 py-3 text-[14px] leading-5 ${state === "error" ? "border-[#ff5b4a]/35 bg-[#ff5b4a]/10 text-[#ff9b90]" : "border-[#43ed74]/24 bg-[#43ed74]/10 text-[#56f18a]"}`}>
            {state === "sent" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} aria-hidden="true" /> : <ClipboardList className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} aria-hidden="true" />}
            {statusText}
          </div>
        ) : null}
      </section>
    </form>
  );
}

function FieldLabel({ label }: { label: string }) {
  return <div className="text-[13px] font-medium uppercase tracking-wide text-white/50">{label}</div>;
}

function findFeedbackArea(value: string) {
  const exactArea = feedbackAreas.find((area) => area.value === value);
  if (exactArea) return exactArea;

  return feedbackAreas
    .filter((area) => value.startsWith(area.value))
    .sort((first, second) => second.value.length - first.value.length)[0];
}

function normalizeSourceParam(value: string) {
  return value === "beta" || value === "round-3" ? "live-testing" : value;
}

function formatReproducibility(value: ReproducibilityChoice) {
  if (value === "yes") return "Yes";
  if (value === "no") return "No";
  if (value === "unknown") return "Not sure";
  return undefined;
}
