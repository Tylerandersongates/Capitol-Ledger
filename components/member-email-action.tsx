"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Clipboard, ExternalLink, Mail, Send } from "lucide-react";
import { publicBrandName } from "@/lib/brand";
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

type SendState = "idle" | "sending" | "confirming" | "confirmingSent" | "confirmingError" | "success" | "error";
type ConfirmationMode = "account" | "local";
type CopiedField = "message" | "subject";

async function copyToClipboard(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textArea = document.createElement("textarea");
  textArea.value = value;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.opacity = "0";
  document.body.appendChild(textArea);
  textArea.select();
  const copied = document.execCommand("copy");
  document.body.removeChild(textArea);
  if (!copied) throw new Error("Clipboard copy failed.");
}

export function MemberEmailAction({ bioguideId, chamber, className, memberName }: MemberEmailActionProps) {
  const [expanded, setExpanded] = useState(false);
  const [fromEmail, setFromEmail] = useState("");
  const [message, setMessage] = useState("");
  const [copiedField, setCopiedField] = useState<CopiedField | null>(null);
  const [pendingConfirmationMode, setPendingConfirmationMode] = useState<ConfirmationMode>("local");
  const [pendingContactUrl, setPendingContactUrl] = useState("");
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
    setCopiedField(null);
    setPendingContactUrl("");
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
          confirmationMode?: ConfirmationMode;
          contactUrl?: string;
          letter?: SentLetterRecord;
          message?: string;
          mode?: "manual" | "webhook";
          status?: "prepared" | "sent";
        }
      | null;

    const localLetter = payload?.letter ? recordLocalSentLetter(payload.letter) : null;

    if (payload?.mode === "manual") {
      if (!payload.contactUrl || !payload.letter) {
        setStatus("error");
        setStatusMessage("The official contact path could not be prepared. Try again.");
        return;
      }
      setPendingConfirmationMode(payload.confirmationMode ?? "local");
      setPendingContactUrl(payload.contactUrl);
      setPendingLetter(localLetter ?? payload?.letter ?? null);
      setStatus("confirming");
      setStatusMessage(`Copy your subject and message, open the official form, then confirm only after you send it.`);
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
    if (!pendingLetter?.id) {
      setStatus("error");
      setStatusMessage("The prepared message could not be confirmed. Prepare it again.");
      return;
    }

    setStatus("confirmingSent");
    setStatusMessage("Saving your confirmation...");

    if (pendingConfirmationMode === "account") {
      const response = await fetch("/api/account/letters", {
        body: JSON.stringify({ id: pendingLetter.id }),
        headers: {
          "Content-Type": "application/json"
        },
        method: "PATCH"
      }).catch(() => null);
      const payload = (await response?.json().catch(() => null)) as { letter?: SentLetterRecord } | null;

      if (!response?.ok || !payload?.letter) {
        setStatus("confirmingError");
        setStatusMessage("Your confirmation could not be saved. Your draft is still prepared; please try again.");
        return;
      }

      recordLocalSentLetter(payload.letter);
    } else {
      const confirmed = confirmLocalSentLetter(pendingLetter.id);
      if (!confirmed) {
        setStatus("confirmingError");
        setStatusMessage("Your confirmation could not be saved. Your draft is still prepared; please try again.");
        return;
      }
    }

    recordGamificationEvent("contact-representative", bioguideId);
    setStatus("success");
    setStatusMessage("Message marked sent. Replies and follow-up correspondence stay in your email provider.");
    setCopiedField(null);
    setPendingContactUrl("");
    setPendingLetter(null);
    setExpanded(false);
    setMessage("");
  }

  async function onCopy(field: CopiedField, value: string) {
    try {
      await copyToClipboard(value);
      setCopiedField(field);
      setStatus("confirming");
      setStatusMessage(`${field === "subject" ? "Subject" : "Message"} copied. Open the official form when you are ready.`);
    } catch {
      setCopiedField(null);
      setStatus("confirmingError");
      setStatusMessage(`Copy failed. Select the ${field} manually before opening the official form.`);
    }
  }

  const isConfirmationStep = status === "confirming" || status === "confirmingSent" || status === "confirmingError";

  return (
    <div className={`relative inline-flex ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => {
          setExpanded((current) => !current);
          setStatus("idle");
          setStatusMessage("");
          setCopiedField(null);
          setPendingContactUrl("");
          setPendingLetter(null);
        }}
        className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-[#ffb12b]/35 bg-[linear-gradient(180deg,rgba(255,177,43,0.14)_0%,rgba(255,177,43,0.07)_100%)] px-4 py-2 text-[14px] font-semibold text-[#ffb12b] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_10px_22px_rgba(1,8,24,0.26)] transition hover:brightness-110"
      >
        <Mail className="h-4 w-4" />
        Message
      </button>

      {expanded ? (
        <div className="absolute left-1/2 top-full z-40 mt-3 w-[min(19rem,calc(100vw-7rem))] -translate-x-1/2 rounded-[1.15rem] border border-white/12 bg-[linear-gradient(180deg,rgba(12,39,74,0.98)_0%,rgba(5,18,42,0.98)_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_20px_38px_rgba(1,8,24,0.52)] backdrop-blur-xl">
          {isConfirmationStep ? (
            <>
              <div className="grid grid-cols-[34px_minmax(0,1fr)] gap-3 rounded-xl border border-[#43ed74]/18 bg-[#43ed74]/8 px-3 py-3 text-white">
                <span className="grid h-8 w-8 place-items-center rounded-xl border border-[#43ed74]/24 bg-[#43ed74]/10 text-[#43ed74]">
                  <CheckCircle2 className="h-4 w-4" strokeWidth={2} />
                </span>
                <div>
                  <div className="text-[14px] font-semibold text-white">Finish sending</div>
                  <p className="mt-1 text-[12px] leading-snug text-white/58">
                    Copy both fields, then use the official office form. Nothing is marked sent until you confirm below.
                  </p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onCopy("subject", subject)}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/18 px-3 text-[13px] font-medium text-white/78"
                >
                  <Clipboard className="h-4 w-4" aria-hidden="true" />
                  {copiedField === "subject" ? "Subject copied" : "Copy subject"}
                </button>
                <button
                  type="button"
                  onClick={() => onCopy("message", message)}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/18 px-3 text-[13px] font-medium text-white/78"
                >
                  <Clipboard className="h-4 w-4" aria-hidden="true" />
                  {copiedField === "message" ? "Message copied" : "Copy message"}
                </button>
              </div>
              <a
                href={pendingContactUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[#ffb12b]/35 bg-[#ffb12b]/10 px-4 text-[14px] font-semibold text-[#ffca5a]"
              >
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                Open official form
              </a>
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={onConfirmSent}
                  disabled={status === "confirmingSent"}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-[#ffdf63] via-[#ffb12b] to-[#ff8a00] px-4 text-[14px] font-semibold text-[#071225] disabled:cursor-not-allowed disabled:opacity-55"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {status === "confirmingSent" ? "Saving..." : "I sent it"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStatus("idle");
                    setStatusMessage("");
                    setCopiedField(null);
                    setPendingContactUrl("");
                    setPendingLetter(null);
                  }}
                  className="inline-flex h-10 items-center rounded-xl border border-white/18 px-4 text-[14px] text-white/75"
                >
                  I did not send it
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="mb-3 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2 text-[12px] leading-snug text-white/56">
                Write a message for this office. {publicBrandName} opens the official contact path and keeps a record when you mark it sent.
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
            <p className={`mt-3 text-[13px] ${status === "error" || status === "confirmingError" ? "text-[#ff8d8d]" : "text-[#43e08f]"}`}>{statusMessage}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
