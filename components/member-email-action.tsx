"use client";

import { useMemo, useState } from "react";
import { Mail, Send } from "lucide-react";
import { recordGamificationEvent } from "@/lib/browser-gamification";

type MemberEmailActionProps = {
  bioguideId: string;
  chamber: "House" | "Senate";
  className?: string;
  memberName: string;
};

type SendState = "idle" | "sending" | "success" | "error";

export function MemberEmailAction({ bioguideId, chamber, className, memberName }: MemberEmailActionProps) {
  const [expanded, setExpanded] = useState(false);
  const [fromEmail, setFromEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<SendState>("idle");
  const [statusMessage, setStatusMessage] = useState("");

  const subject = useMemo(() => {
    const chamberLabel = chamber === "House" ? "Representative" : "Senator";
    return `Constituent message for ${chamberLabel} ${memberName}`;
  }, [chamber, memberName]);

  async function onSend() {
    setStatus("sending");
    setStatusMessage("");

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
          mailtoUrl?: string;
          message?: string;
          mode?: "manual" | "webhook";
          status?: "prepared" | "sent";
        }
      | null;

    recordGamificationEvent("contact-representative", bioguideId);

    if (payload?.mailtoUrl) {
      window.location.href = payload.mailtoUrl;
    }

    if (payload?.mode === "manual" && payload.contactUrl) {
      window.open(payload.contactUrl, "_blank", "noopener,noreferrer");
    }

    setStatus("success");
    setStatusMessage(payload?.message || "Message prepared.");
    setExpanded(false);
    setMessage("");
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => {
          setExpanded((current) => !current);
          setStatus("idle");
          setStatusMessage("");
        }}
        className="inline-flex items-center gap-2 rounded-xl border border-[#ffb12b]/40 bg-[#ffb12b]/12 px-4 py-2 text-[15px] font-medium text-[#ffb12b] transition hover:bg-[#ffb12b]/18"
      >
        <Mail className="h-4 w-4" />
        Email
      </button>

      {expanded ? (
        <div className="mt-3 rounded-2xl border border-[#ffb12b]/25 bg-[#071834]/88 p-4">
          <label className="block text-[12px] font-medium uppercase tracking-[0.08em] text-white/55">Your email</label>
          <input
            type="email"
            value={fromEmail}
            onChange={(event) => setFromEmail(event.target.value)}
            placeholder="you@example.com"
            className="mt-2 h-11 w-full rounded-xl border border-white/14 bg-[#04142c] px-3 text-[15px] text-white placeholder:text-white/38 focus:border-[#ffb12b]/50 focus:outline-none"
          />

          <label className="mt-3 block text-[12px] font-medium uppercase tracking-[0.08em] text-white/55">Message</label>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={5}
            placeholder="Write your message..."
            className="mt-2 w-full resize-y rounded-xl border border-white/14 bg-[#04142c] px-3 py-2 text-[15px] text-white placeholder:text-white/38 focus:border-[#ffb12b]/50 focus:outline-none"
          />

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={onSend}
              disabled={status === "sending" || message.trim().length < 10}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-[#ffdf63] via-[#ffb12b] to-[#ff8a00] px-4 text-[14px] font-semibold text-[#071225] disabled:cursor-not-allowed disabled:opacity-55"
            >
              <Send className="h-4 w-4" />
              {status === "sending" ? "Sending..." : "Send"}
            </button>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="inline-flex h-10 items-center rounded-xl border border-white/18 px-4 text-[14px] text-white/75"
            >
              Cancel
            </button>
          </div>

          {statusMessage ? (
            <p className={`mt-3 text-[13px] ${status === "error" ? "text-[#ff8d8d]" : "text-[#43e08f]"}`}>{statusMessage}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
