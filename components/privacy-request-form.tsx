"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, Send } from "lucide-react";
import {
  privacyRequestDetailMaxLength,
  privacyRequestTypeOptions,
  type PrivacyRequestSummary,
  type PrivacyRequestType
} from "@/lib/privacy-request-contract";

type SubmissionState = "idle" | "submitting" | "sent" | "error";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function statusLabel(status: PrivacyRequestSummary["status"]) {
  if (status === "reviewing") return "Being reviewed";
  if (status === "resolved") return "Resolved";
  return "Received";
}

function requestTypeLabel(requestType: PrivacyRequestType) {
  return privacyRequestTypeOptions.find((option) => option.value === requestType)?.label ?? "Privacy request";
}

export function PrivacyRequestForm() {
  const [detail, setDetail] = useState("");
  const [loading, setLoading] = useState(true);
  const [requestType, setRequestType] = useState<PrivacyRequestType>("access_summary");
  const [requests, setRequests] = useState<PrivacyRequestSummary[]>([]);
  const [state, setState] = useState<SubmissionState>("idle");
  const [statusText, setStatusText] = useState("");
  const canSubmit = useMemo(() => state !== "submitting", [state]);

  useEffect(() => {
    let active = true;

    fetch("/api/privacy/requests", { cache: "no-store", credentials: "same-origin" })
      .then(async (response) => {
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
          requests?: PrivacyRequestSummary[];
        };
        if (!active) return;
        if (!response.ok) throw new Error(data.error || "Privacy-request status is unavailable.");
        setRequests(data.requests ?? []);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setState("error");
        setStatusText(error instanceof Error ? error.message : "Privacy-request status is unavailable.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  async function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    setState("submitting");
    setStatusText("");

    const response = await fetch("/api/privacy/requests", {
      body: JSON.stringify({ detail, requestType }),
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      method: "POST"
    }).catch(() => null);
    const data = response
      ? ((await response.json().catch(() => ({}))) as {
          created?: boolean;
          error?: string;
          request?: PrivacyRequestSummary;
        })
      : {};

    if (!response?.ok || !data.request) {
      setState("error");
      setStatusText(data.error || "Privacy request could not be submitted. No request was recorded.");
      return;
    }

    setRequests((current) => [data.request!, ...current.filter((request) => request.id !== data.request!.id)]);
    setDetail("");
    setState("sent");
    setStatusText(
      data.created
        ? "Your request was received. Save the request ID shown below."
        : "An active request of this type already exists, so no duplicate was created."
    );
  }

  return (
    <div className="space-y-4">
      <form onSubmit={submitRequest} className="rounded-[1.35rem] border border-white/12 bg-[#061a33]/76 px-5 py-5">
        <label className="block text-[13px] font-semibold uppercase tracking-[0.08em] text-white/50">
          Request type
          <select
            value={requestType}
            onChange={(event) => setRequestType(event.target.value as PrivacyRequestType)}
            className="mt-3 h-12 w-full rounded-2xl border border-white/12 bg-[#020b18] px-4 text-[15px] text-white outline-none focus:border-[#ffb12b]/70"
          >
            {privacyRequestTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>

        <p className="mt-3 text-[13px] leading-5 text-white/52">
          {privacyRequestTypeOptions.find((option) => option.value === requestType)?.description}
        </p>

        <label className="mt-5 block text-[13px] font-semibold uppercase tracking-[0.08em] text-white/50">
          Optional detail
          <textarea
            value={detail}
            onChange={(event) => setDetail(event.target.value)}
            maxLength={privacyRequestDetailMaxLength}
            rows={6}
            placeholder="Briefly describe the data or correction involved."
            className="mt-3 w-full resize-none rounded-2xl border border-white/12 bg-[#020b18]/70 px-4 py-3 text-[15px] leading-6 text-white outline-none placeholder:text-white/34 focus:border-[#ffb12b]/70"
          />
        </label>
        <div className="mt-2 text-right text-[12px] text-white/38">{detail.length}/{privacyRequestDetailMaxLength}</div>

        <div className="mt-4 rounded-2xl border border-[#ffb12b]/22 bg-[#ffb12b]/[0.08] px-4 py-3 text-[13px] leading-5 text-[#ffd77a]">
          Do not include passwords, verification codes, payment data, medical information, government IDs, tokens, or identity documents.
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="mt-5 flex h-[50px] w-full items-center justify-center rounded-2xl bg-gradient-to-r from-[#ffdf63] via-[#ffb12b] to-[#ff8a00] text-[16px] font-semibold text-[#061126] transition disabled:opacity-45"
        >
          {state === "submitting" ? "Submitting…" : "Submit privacy request"}
          {state !== "submitting" ? <Send className="ml-2 h-4 w-4" aria-hidden="true" /> : null}
        </button>

        {statusText ? (
          <div
            role={state === "error" ? "alert" : "status"}
            aria-live={state === "error" ? "assertive" : "polite"}
            className={`mt-4 flex items-start gap-3 rounded-2xl border px-4 py-3 text-[13px] leading-5 ${state === "error" ? "border-[#ff5b4a]/35 bg-[#ff5b4a]/10 text-[#ff9b90]" : "border-[#43ed74]/24 bg-[#43ed74]/10 text-[#56f18a]"}`}
          >
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {statusText}
          </div>
        ) : null}
      </form>

      <section className="rounded-[1.35rem] border border-white/12 bg-[#061a33]/76 px-5 py-5">
        <h2 className="text-[18px] font-semibold text-white">Your recent requests</h2>
        {loading ? (
          <p role="status" className="mt-3 text-[13px] text-white/52">Loading request status…</p>
        ) : requests.length ? (
          <div className="mt-4 space-y-3">
            {requests.map((request) => (
              <div key={request.id} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[15px] font-semibold text-white">{requestTypeLabel(request.requestType)}</div>
                    <div className="mt-1 font-mono text-[11px] text-white/42">{request.id}</div>
                  </div>
                  <span className="rounded-full border border-[#43ed74]/22 bg-[#43ed74]/10 px-2.5 py-1 text-[11px] font-semibold text-[#56f18a]">
                    {statusLabel(request.status)}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-2 text-[12px] text-white/44">
                  <Clock3 className="h-4 w-4" aria-hidden="true" />
                  {formatDate(request.requestedAt)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-[13px] leading-5 text-white/52">No privacy requests are recorded for this account.</p>
        )}
      </section>
    </div>
  );
}
