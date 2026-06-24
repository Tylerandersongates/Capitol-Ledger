"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ClipboardCheck } from "lucide-react";
import { useGamificationSnapshot } from "@/components/gamification-live-stats";
import { MobileCard } from "@/components/mobile-ui";
import { recordGamificationEvent } from "@/lib/browser-gamification";

const registrationEvent = "complete-voter-registration";
const registrationCompletionKey = "capitol-ledger:voter-registration-form-complete";
const registrationTargetId = "voter-registration-form";

function readRegistrationComplete() {
  if (typeof window === "undefined") return false;

  try {
    return window.localStorage.getItem(registrationCompletionKey) === "true";
  } catch {
    return false;
  }
}

function writeRegistrationComplete() {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(registrationCompletionKey, "true");
  } catch {
    return;
  }
}

export function VoterRegistrationCard() {
  const snapshot = useGamificationSnapshot();
  const [complete, setComplete] = useState(false);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState("");
  const registrationCount = useMemo(
    () => snapshot.eventCounts.find((record) => record.event === registrationEvent)?.count ?? 0,
    [snapshot.eventCounts]
  );
  const isComplete = complete || registrationCount > 0;

  useEffect(() => {
    if (readRegistrationComplete() || registrationCount > 0) {
      setComplete(true);
      writeRegistrationComplete();
    }
  }, [registrationCount]);

  function markComplete() {
    if (isComplete) return;

    if (!pending) {
      setPending(true);
      setStatus("Tap again to confirm this is complete.");
      return;
    }

    recordGamificationEvent(registrationEvent, registrationTargetId);
    writeRegistrationComplete();
    setComplete(true);
    setPending(false);
    setStatus("Voter registration marked complete.");
  }

  return (
    <div id="voter-registration">
      <MobileCard variant="dashboard" className="px-5 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-[#79a8ff]" strokeWidth={1.8} aria-hidden="true" />
            <h2 className="text-[21px] font-medium leading-none">Voter registration</h2>
          </div>
          <div className="rounded-full border border-white/12 bg-white/[0.06] px-3 py-1 text-[12px] font-medium text-white/76">
            {isComplete ? "1/1" : "0/1"}
          </div>
        </div>

        <p className="mt-3 text-[13px] leading-relaxed text-white/58">
          Mark this complete after you finish your voter registration form.
        </p>

        <button
          type="button"
          onClick={markComplete}
          disabled={isComplete}
          aria-pressed={isComplete}
          className={`mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl border text-[14px] font-semibold transition ${
            isComplete
              ? "cursor-default border-[#43ed74]/30 bg-[#43ed74]/12 text-[#8ef8af]"
              : pending
                ? "border-[#ffbd39]/44 bg-[#ffbd39]/12 text-[#ffcf63] hover:brightness-110"
                : "border-[#79a8ff]/34 bg-[#79a8ff]/12 text-[#9fc4ff] hover:brightness-110"
          }`}
        >
          <CheckCircle2 className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          {isComplete ? "Complete" : pending ? "Confirm complete" : "Mark complete"}
        </button>

        <div className="mt-3 flex items-start gap-2 rounded-xl border border-[#79a8ff]/18 bg-[#79a8ff]/8 px-3 py-2 text-[12px] text-[#b8d2ff]">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.9} aria-hidden="true" />
          <span>{status || "Counts once toward your Register to Vote badge."}</span>
        </div>
      </MobileCard>
    </div>
  );
}
