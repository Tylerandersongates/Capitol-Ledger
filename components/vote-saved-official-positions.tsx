"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, UserRound, UsersRound, Vote } from "lucide-react";
import { MobileGlassScrollFrame } from "@/components/mobile-glass-scroll-frame";
import { MobileCard } from "@/components/mobile-ui";
import {
  followsChangedEvent,
  hydrateAccountLedgerFromAccount,
  persistenceEvent,
  readSavedFollowRecords
} from "@/lib/browser-account-ledger";
import type { Member, VotePosition } from "@/types/capitol";

type SavedOfficialPosition = {
  member?: Member;
  memberBioguideId: string;
  position: VotePosition;
  voteId: string;
};

type VoteSavedOfficialPositionsProps = {
  memberPositions: SavedOfficialPosition[];
};

export function VoteSavedOfficialPositions({ memberPositions }: VoteSavedOfficialPositionsProps) {
  const [savedMemberIds, setSavedMemberIds] = useState<string[]>([]);
  const [loadedSavedOfficials, setLoadedSavedOfficials] = useState(false);

  useEffect(() => {
    let active = true;

    function refreshSavedOfficials() {
      if (!active) return;
      setSavedMemberIds(readSavedMemberIds());
      setLoadedSavedOfficials(true);
    }

    refreshSavedOfficials();
    window.addEventListener("storage", refreshSavedOfficials);
    window.addEventListener(persistenceEvent, refreshSavedOfficials);
    window.addEventListener(followsChangedEvent, refreshSavedOfficials);
    void hydrateAccountLedgerFromAccount().then(refreshSavedOfficials);

    return () => {
      active = false;
      window.removeEventListener("storage", refreshSavedOfficials);
      window.removeEventListener(persistenceEvent, refreshSavedOfficials);
      window.removeEventListener(followsChangedEvent, refreshSavedOfficials);
    };
  }, []);

  const savedPositions = useMemo(() => {
    const positionsByMemberId = new Map(
      memberPositions
        .filter((record) => record.member)
        .map((record) => [record.member?.bioguideId ?? record.memberBioguideId, record])
    );

    return savedMemberIds.flatMap((memberId) => {
      const record = positionsByMemberId.get(memberId);
      return record ? [record] : [];
    });
  }, [memberPositions, savedMemberIds]);

  const emptyMessage = !loadedSavedOfficials
    ? "Loading saved officials..."
    : savedMemberIds.length
      ? "No saved officials have a recorded position on this vote."
      : "Save officials to see their recorded positions on this vote.";

  return (
    <MobileCard variant="dashboard" className="px-5 py-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-[13px] font-medium uppercase tracking-wide text-white/50">Recorded Positions</div>
          <h2 className="mt-2 text-[21px] font-medium leading-none">Saved officials</h2>
        </div>
        <UsersRound className="h-7 w-7 text-[#ffb12b]" strokeWidth={1.8} aria-hidden="true" />
      </div>
      {savedPositions.length ? (
        <MobileGlassScrollFrame heightClassName="h-[169px]" className="divide-y divide-white/8" ariaLabel="Saved official vote positions">
          {savedPositions.map((record) => {
            if (!record.member) return null;

            return (
              <Link key={record.member.bioguideId} href={`/members/${record.member.bioguideId}`} className="grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 py-4">
                {record.member.photoUrl ? <Image src={record.member.photoUrl} alt="" width={44} height={44} className="h-11 w-11 rounded-full border border-rust/35 object-cover" /> : <span className="grid h-11 w-11 place-items-center rounded-full bg-white/6 text-white/54"><UserRound className="h-6 w-6" /></span>}
                <span className="min-w-0">
                  <span className="block truncate text-[16px] font-semibold text-white">{record.member.fullName}</span>
                  <span className="mt-1 block text-[13px] text-white/52">{record.member.state} · {record.member.party}</span>
                </span>
                <PositionPill position={record.position} />
              </Link>
            );
          })}
        </MobileGlassScrollFrame>
      ) : (
        <div className="mt-5 rounded-xl border border-white/8 bg-white/[0.035] px-3 py-3 text-[13px] leading-snug text-white/58">
          {emptyMessage}
        </div>
      )}
    </MobileCard>
  );
}

function readSavedMemberIds() {
  const seen = new Set<string>();
  const ids: string[] = [];

  readSavedFollowRecords().forEach((record) => {
    if (record.type !== "member" || !record.id || seen.has(record.id)) return;
    seen.add(record.id);
    ids.push(record.id);
  });

  return ids;
}

function PositionPill({ position }: { position: VotePosition }) {
  const classes =
    position === "Yes"
      ? "bg-[#43ed74]/12 text-[#43ed74]"
      : position === "No"
        ? "bg-[#ff503d]/12 text-[#ff6b5c]"
        : position === "Present"
          ? "bg-[#ffb12b]/12 text-[#ffb12b]"
          : "bg-white/8 text-white/60";

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[13px] font-medium leading-none ${classes}`}>
      {position === "Yes" ? <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" /> : <Vote className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />}
      {position}
    </span>
  );
}
