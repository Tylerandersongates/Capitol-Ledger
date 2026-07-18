"use client";

import * as Sentry from "@sentry/nextjs";
import { FormEvent, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, MessageSquarePlus } from "lucide-react";
import { publicBrandName } from "@/lib/brand";

type SubmissionState = "idle" | "submitting" | "sent" | "error";

const sourceLabels: Record<string, string> = {
  beta: "Live app testing",
  "live-testing": "Live app testing",
  "privacy-request": "Privacy request",
  support: "Support",
  "team-custom-plan": "Team custom plan"
};

export function FeedbackForm({ initialSource = "" }: { initialSource?: string }) {
  const [contactEmail, setContactEmail] = useState("");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<SubmissionState>("idle");
  const [statusText, setStatusText] = useState("");
  const [title, setTitle] = useState("");
  const feedbackConfigured = Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN);
  const source = normalizeSource(initialSource);
  const sourceLabel = sourceLabels[source] ?? "App feedback";
  const canSubmit = useMemo(
    () => feedbackConfigured && title.trim().length > 2 && message.trim().length > 8 && state !== "submitting",
    [feedbackConfigured, message, state, title]
  );

  async function submitFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    setState("submitting");
    setStatusText("");

    try {
      await Sentry.sendFeedback(
        {
          email: contactEmail.trim() || undefined,
          message: `${title.trim()}\n\n${message.trim()}`,
          source: "capitolwonk-in-app",
          tags: {
            feedback_source: source || "manual",
            feedback_surface: "capitolwonk-ce"
          },
          url: window.location.href
        },
        { includeReplay: false }
      );

      setContactEmail("");
      setMessage("");
      setState("sent");
      setStatusText("Feedback sent securely. Thank you for helping improve CapitolWonk CE.");
      setTitle("");
    } catch {
      setState("error");
      setStatusText("Feedback could not be sent. Check your connection and try again.");
    }
  }

  return (
    <form onSubmit={submitFeedback} className="space-y-5">
      <section className="rounded-[1.35rem] border border-white/10 bg-[#061a33]/76 px-5 py-5 shadow-[inset_0_0_24px_rgba(43,141,255,0.06),0_18px_42px_rgba(0,0,0,0.18)] backdrop-blur-xl">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#ffb12b]/12 text-[#ffb12b]">
            <MessageSquarePlus className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-[22px] font-medium leading-tight">Send feedback</h2>
            <p className="mt-2 text-[14px] leading-5 text-white/56">
              Tell us what broke, felt confusing, looked wrong, or would make {publicBrandName} more useful.
            </p>
          </div>
        </div>
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/42">Report source</div>
          <div className="mt-2 text-[17px] font-semibold leading-tight text-white">{sourceLabel}</div>
          <p className="mt-1 text-[13px] leading-snug text-white/50">
            Error context and the current app page are attached. Session replay and default personal-data collection are disabled.
          </p>
        </div>
      </section>

      <section className="rounded-[1.35rem] border border-white/10 bg-[#061a33]/76 px-5 py-5 shadow-[inset_0_0_24px_rgba(43,141,255,0.06),0_18px_42px_rgba(0,0,0,0.18)] backdrop-blur-xl">
        <FieldLabel label="Short title" />
        <input
          autoCapitalize="sentences"
          autoCorrect="on"
          spellCheck={true}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Example: dashboard card is confusing"
          className="mt-3 h-12 w-full rounded-2xl border border-white/12 bg-[#020b18]/70 px-4 text-[16px] text-white outline-none placeholder:text-white/34 focus:border-[#ffb12b]/70"
        />

        <div className="mt-5">
          <FieldLabel label="What happened?" />
          <textarea
            autoCapitalize="sentences"
            autoCorrect="on"
            spellCheck={true}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="What did you expect, what happened, and how can we reproduce it?"
            rows={7}
            className="mt-3 w-full resize-none rounded-2xl border border-white/12 bg-[#020b18]/70 px-4 py-3 text-[16px] leading-6 text-white outline-none placeholder:text-white/34 focus:border-[#ffb12b]/70"
          />
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between gap-3">
            <FieldLabel label="Contact email" />
            <span className="text-[12px] font-medium text-white/34">Optional</span>
          </div>
          <input
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect="off"
            inputMode="email"
            spellCheck={false}
            value={contactEmail}
            onChange={(event) => setContactEmail(event.target.value)}
            placeholder="Only if you want a follow-up"
            className="mt-3 h-12 w-full rounded-2xl border border-white/12 bg-[#020b18]/70 px-4 text-[16px] text-white outline-none placeholder:text-white/34 focus:border-[#ffb12b]/70"
          />
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="mt-6 flex h-[52px] w-full items-center justify-center rounded-2xl bg-gradient-to-r from-[#ffdf63] via-[#ffb12b] to-[#ff8a00] text-[17px] font-semibold text-[#061126] shadow-[0_0_24px_rgba(255,177,43,0.22)] transition disabled:opacity-45"
        >
          {state === "submitting" ? "Sending..." : "Send feedback"}
          {state !== "submitting" ? <ArrowRight className="ml-2 h-5 w-5" strokeWidth={2} aria-hidden="true" /> : null}
        </button>

        {!feedbackConfigured ? (
          <div className="mt-4 rounded-2xl border border-[#ffb12b]/24 bg-[#ffb12b]/10 px-4 py-3 text-[14px] leading-5 text-[#ffd77a]">
            Secure feedback delivery is awaiting protected Sentry configuration. No report can be submitted from this build yet.
          </div>
        ) : null}

        {statusText ? (
          <div className={`mt-4 flex items-start gap-3 rounded-2xl border px-4 py-3 text-[14px] leading-5 ${state === "error" ? "border-[#ff5b4a]/35 bg-[#ff5b4a]/10 text-[#ff9b90]" : "border-[#43ed74]/24 bg-[#43ed74]/10 text-[#56f18a]"}`}>
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} aria-hidden="true" />
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

function normalizeSource(value: string) {
  return value === "round-3" ? "live-testing" : value;
}
