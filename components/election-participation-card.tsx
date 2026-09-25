"use client";

import { CalendarClock, Vote } from "lucide-react";
import { useGamificationSnapshot } from "@/components/gamification-live-stats";
import { MobileCard } from "@/components/mobile-ui";

export function ElectionParticipationCard() {
  const snapshot = useGamificationSnapshot();
  const legacyElectionEntries = snapshot.eventCounts.find(
    (record) => record.event === "participate-election"
  )?.count ?? 0;

  return (
    <div id="election-participation">
      <MobileCard variant="dashboard" className="px-5 py-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Vote className="h-5 w-5 text-[#ffbd39]" strokeWidth={1.8} aria-hidden="true" />
            <h2 className="text-[21px] font-medium leading-none">Elections</h2>
          </div>
          <div className="rounded-full border border-white/12 bg-white/[0.06] px-3 py-1 text-[12px] font-medium text-white/76">
            {legacyElectionEntries} legacy {legacyElectionEntries === 1 ? "entry" : "entries"}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-[36px_minmax(0,1fr)] gap-3 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl border border-[#ffbd39]/24 bg-[#ffbd39]/10 text-[#ffbd39]">
            <CalendarClock className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />
          </span>
          <div>
            <div className="text-[14px] font-semibold text-white">Election logging is unavailable</div>
            <p className="mt-1 text-[12px] leading-snug text-white/56">
              A verified, dated election catalog is required before new participation can be recorded or election badges can be earned.
            </p>
          </div>
        </div>

        {legacyElectionEntries > 0 ? (
          <p className="mt-3 text-[11px] leading-snug text-white/42">
            Existing undated entries remain in the all-time activity total for storage compatibility. They are not presented as verified participation and do not unlock election badges.
          </p>
        ) : null}
      </MobileCard>
    </div>
  );
}
