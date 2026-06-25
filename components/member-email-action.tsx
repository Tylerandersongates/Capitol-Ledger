"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Mail, Send } from "lucide-react";
import { recordGamificationEvent } from "@/lib/browser-gamification";
import {
  confirmLocalSentLetter,
  recordLocalSentLetter,
  type SentLetterRecord
} from "@/lib/browser-letter-history";

type MemberEmailActionProps = {
  bioguideId: string;
  chamber: "House" | "Senate";
  className?: string;
  memberName: string;
};

type SendState = "idle" | "sending" | "confirming" | "success" | "error";

export function MemberEmailAction({ bioguideId, chamber, className, memberName }: MemberEmailActionProps) {
  const [expanded, setExpanded] = useState(false);
  const [fromEmail, setFromEmail] = useState("");
  const [message, setMessage] = useState("");
  const [pendingLetter, setPendingLetter] = useState<SentLetterRecord | null>(null);
  const [status, setStatus] = useState<SendState>("idle");
  const [statusMessage, setStatusMessage] = useState("");

  const subject = useMemo(() => {
    const chamberLabel = chamber === "House" ? "Representative" : "Senator";
    return `Constituent message for ${chamberLabel} ${memberName}`;
  }, [chamber, memberName]);

  async function onSend() {
    setStatus("sending");
    setStatusMessage("");
    setPendingLetter(null);

    const response = await fetch(`/api/members/${bioguideId}/email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        fromEmail: fromEmail || undefined,
        message,
        subject
      })
    }).catch(() => null);

    if (!response?.ok) {
      const payload = (await response?.json().catch(() => null)) as { error?: string } | null;
      setStatus("error");
      setStatusMessage(payload?.error || "Unable to send right now.");
      return;
    }

    const payload = (await response.json().catch(() => null)) as
      | {
          contactUrl?: string;
          letter?: SentLetterRecord;
          mailtoUrl?: string;
          message?: string;
          mode?: "manual" | "webhook";
          status?: "prepared" | "sent";
        }
      | null;

    if (payload?.mailtoUrl) {
      window.location.href = payload.mailtoUrl;
    }

    if (payload?.mode === "manual" && payload.contactUrl) {
      window.open(payload.contactUrl, "_blank", "noopener,noreferrer");
    }

    const localLetter = payload?.letter ? recordLocalSentLetter(payload.letter) : null;

    if (payload?.mode === "manual") {
      setPendingLetter(localLetter ?? payload?.letter ?? null);
      setStatus("confirming");
      setStatusMessage("Message opened. After you send it, confirm here so Capitol Ledger CE can mark it sent.");
      return;
    }

    setPendingLetter(null);
    recordGamificationEvent("contact-representative", bioguideId);
    setStatus("success");
    setStatusMessage(payload?.message || "Message sent. Replies will go to your email inbox.");
    setExpanded(false);
    setMessage("");
  }

  async function onConfirmSent() {
    if (pendingLetter?.id) {
      const response = await fetch("/api/account/letters", {
        body: JSON.stringify({ id: pendingLetter.id }),
        headers: {
          "Content-Type": "application/json"
        },
        method: "PATCH"
      }).catch(() => null);
      const payload = (await response?.json().catch(() => null)) as { letter?: SentLetterRecord } | null;

      if (payload?.letter) {
        recordLocalSentLetter(payload.letter);
      } else {
        confirmLocalSentLetter(pendingLetter.id);
      }
    }

    recordGamificationEvent("contact-representative", bioguideId);
    setStatus("success");
    setStatusMessage("Message marked sent. Replies and follow-up correspondence stay in your email provider.");
    setPendingLetter(null);
    setExpanded(false);
    setMessage("");
  }

  return (
    <div className={`relative inline-flex ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => {
          setExpanded((current) => !current);
          setStatus("idle");
          setStatusMessage("");
          setPendingLetter(null);
        }}
        className="inline-flex items-center gap-2 rounded-xl border border-[#ffb12b]/35 bg-[linear-gradient(180deg,rgba(255,177,43,0.14)_0%,rgba(255,177,43,0.07)_100%)] px-4 py-2 text-[15px] font-semibold text-[#ffb12b] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_10px_22px_rgba(1,8,24,0.26)] transition hover:brightness-110"
      >
        <Mail className="h-4 w-4" />
        Message
      </button>

      {expanded ? (
        <div className="absolute left-1/2 top-full z-40 mt-3 w-[min(19rem,calc(100vw-7rem))] -translate-x-1/2 rounded-[1.15rem] border border-white/12 bg-[linear-gradient(180deg,rgba(12,39,74,0.98)_0%,rgba(5,18,42,0.98)_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_20px_38px_rgba(1,8,24,0.52)] backdrop-blur-xl">
          {status === "confirming" ? (
            <>
              <div className="grid grid-cols-[34px_minmax(0,1fr)] gap-3 rounded-xl border border-[#43ed74]/18 bg-[#43ed74]/8 px-3 py-3 text-white">
                <span className="grid h-8 w-8 place-items-center rounded-xl border border-[#43ed74]/24 bg-[#43ed74]/10 text-[#43ed74]">
                  <CheckCircle2 className="h-4 w-4" strokeWidth={2} />
                </span>
                <div>
                  <div className="text-[14px] font-semibold text-white">Finish sending</div>
                  <p className="mt-1 text-[12px] leading-snug text-white/58">
                    Use the opened email draft or contact form. Replies will go to your own email provider.
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={onConfirmSent}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-[#ffdf63] via-[#ffb12b] to-[#ff8a00] px-4 text-[14px] font-semibold text-[#071225]"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  I sent it
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStatus("idle");
                    setStatusMessage("");
                    setPendingLetter(null);
                  }}
                  className="inline-flex h-10 items-center rounded-xl border border-white/18 px-4 text-[14px] text-white/75"
                >
                  Edit
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="mb-3 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2 text-[12px] leading-snug text-white/56">
                Write a message for this office. Capitol Ledger CE opens the official contact path and keeps a record when you mark it sent.
              </p>

              <label className="block text-[12px] font-medium uppercase tracking-[0.08em] text-white/55">Your email</label>
              <input
                type="email"
                value={fromEmail}
                onChange={(event) => setFromEmail(event.target.value)}
                placeholder="you@example.com"
                className="mt-2 h-11 w-full rounded-xl border border-white/14 bg-[#04142c]/95 px-3 text-[15px] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] placeholder:text-white/38 focus:border-[#ffb12b]/50 focus:outline-none"
              />

              <label className="mt-3 block text-[12px] font-medium uppercase tracking-[0.08em] text-white/55">Message</label>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={5}
                placeholder="Write your message..."
                className="mt-2 w-full resize-y rounded-xl border border-white/14 bg-[#04142c]/95 px-3 py-2 text-[15px] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] placeholder:text-white/38 focus:border-[#ffb12b]/50 focus:outline-none"
              />

              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={onSend}
                  disabled={status === "sending" || message.trim().length < 10}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-[#ffdf63] via-[#ffb12b] to-[#ff8a00] px-4 text-[14px] font-semibold text-[#071225] disabled:cursor-not-allowed disabled:opacity-55"
                >
                  <Send className="h-4 w-4" />
                  {status === "sending" ? "Preparing..." : "Prepare message"}
                </button>
                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  className="inline-flex h-10 items-center rounded-xl border border-white/18 px-4 text-[14px] text-white/75"
                >
                  Cancel
                </button>
              </div>
            </>
          )}

          {statusMessage ? (
            <p className={`mt-3 text-[13px] ${status === "error" ? "text-[#ff8d8d]" : "text-[#43e08f]"}`}>{statusMessage}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
