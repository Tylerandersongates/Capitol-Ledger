"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, ClipboardList, MessageSquarePlus } from "lucide-react";

type FeedbackCategory = "bug" | "flow" | "missing" | "data" | "design" | "other";
type FeedbackSeverity = "low" | "medium" | "high";
type FeedbackCategoryChoice = FeedbackCategory | "";
type FeedbackSeverityChoice = FeedbackSeverity | "";
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

const feedbackAreas: FeedbackArea[] = [
  { label: "Dashboard", value: "/dashboard" },
  { label: "Search / discovery", value: "/search" },
  { label: "Bill detail", value: "/bills" },
  { label: "Official profile", value: "/members" },
  { label: "Notifications", value: "/alerts" },
  { label: "Badges / impact", value: "/badges" },
  { label: "Subscription", value: "/upgrade" },
  { label: "Team workspace", value: "/team" },
  {
    helper: "Mention whether this happened during account creation, sign out, sign back in, verification, or saved setup sync.",
    label: "Account / sign-in",
    value: "/account"
  },
  { label: "Beta checklist", value: "/beta" },
  { label: "Beta feedback", value: "/feedback" },
  { label: "Other", value: "/other" }
];

type SubmissionState = "idle" | "submitting" | "sent" | "error";

export function BetaFeedbackForm() {
  const [category, setCategory] = useState<FeedbackCategoryChoice>("");
  const [severity, setSeverity] = useState<FeedbackSeverityChoice>("");
  const [pageUrl, setPageUrl] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [sourceParam, setSourceParam] = useState("");
  const [state, setState] = useState<SubmissionState>("idle");
  const [statusText, setStatusText] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const source = params.get("source") ?? "";
    const nextPage = source ? `/${source}` : "";
    const matchedArea = feedbackAreas.find((area) => nextPage.startsWith(area.value));
    setSourceParam(source);
    setPageUrl(matchedArea?.value ?? "");
  }, []);

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
      setStatusText(data?.error ?? "Feedback could not be submitted. Please try again.");
      return;
    }

    setState("sent");
    setStatusText(data?.mode === "database" ? "Feedback saved to the beta review queue." : "Feedback captured in demo mode.");
    setCategory("");
    setSeverity("");
    setPageUrl("");
    setTitle("");
    setMessage("");
    setContactEmail("");
  }

  return (
    <form onSubmit={submitFeedback} className="space-y-5">
      <section className="rounded-[1.35rem] border border-white/10 bg-[#061a33]/76 px-5 py-5 shadow-[inset_0_0_24px_rgba(43,141,255,0.06),0_18px_42px_rgba(0,0,0,0.18)] backdrop-blur-xl">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#ffb12b]/12 text-[#ffb12b]">
            <MessageSquarePlus className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-[22px] font-medium leading-tight">Send beta feedback</h2>
            <p className="mt-2 text-[14px] leading-5 text-white/56">
              Report anything that breaks, feels confusing, looks off, or would make Capitol Ledger more useful.
            </p>
          </div>
        </div>
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/42">Report target</span>
            {sourceParam ? <span className="shrink-0 rounded-full border border-[#ffb12b]/24 bg-[#ffb12b]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#ffb12b]">From beta</span> : null}
          </div>
          <div className="mt-2 text-[17px] font-semibold leading-tight text-white">{selectedArea?.label ?? "Choose app area"}</div>
          <p className="mt-1 text-[13px] leading-snug text-white/50">
            {selectedArea?.helper ?? "The selected area is attached to the report so it lands in the right review bucket."}
          </p>
        </div>
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
            {selectedArea?.helper ?? "Choose the closest app area so reports are easier to sort during beta review."}
          </p>
          {selectedAreaIsAccount ? (
            <div className="mt-3 rounded-2xl border border-[#74dbff]/20 bg-[#74dbff]/10 px-4 py-3 text-[13px] leading-snug text-[#a7ebff]">
              Account reports are tagged for auth triage and should call out whether setup choices, saved records, or session return felt disconnected.
            </div>
          ) : null}
        </div>

        <div className="mt-5">
          <FieldLabel label="Short title" />
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Example: dashboard card feels confusing"
            className="mt-3 h-12 w-full rounded-2xl border border-white/12 bg-[#020b18]/70 px-4 text-[16px] text-white outline-none placeholder:text-white/34 focus:border-[#ffb12b]/70"
          />
        </div>

        <div className="mt-5">
          <FieldLabel label="What happened?" />
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Tell us what you expected, what happened, and what would make the flow better."
            rows={6}
            className="mt-3 w-full resize-none rounded-2xl border border-white/12 bg-[#020b18]/70 px-4 py-3 text-[16px] leading-6 text-white outline-none placeholder:text-white/34 focus:border-[#ffb12b]/70"
          />
        </div>

        <div className="mt-5">
          <FieldLabel label="Contact email optional" />
          <input
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
          {state === "submitting" ? "Sending..." : "Send Feedback"}
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
