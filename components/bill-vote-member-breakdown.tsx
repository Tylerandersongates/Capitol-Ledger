"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  followsChangedEvent,
  hydrateAccountLedgerFromAccount,
  persistenceEvent,
  readSavedFollowRecords
} from "@/lib/browser-account-ledger";
import {
  accountProfileChangedEvent,
  fetchAccountProfile,
  readLocalDistrictProfile
} from "@/lib/browser-account-profile";
import { getMatchedOfficials } from "@/lib/beta-district-presets";
import type { Member, VotePosition } from "@/types/capitol";
import type { VoteMemberPositionRecord } from "@/lib/data";
import { UserRound } from "lucide-react";

type VoteMemberBreakdownProps = {
  chamber: "House" | "Senate";
  positions: VoteMemberPositionRecord[];
};

type VoteFilter = "all" | VotePosition;

const voteFilters: Array<{ label: string; value: VoteFilter }> = [
  { label: "All", value: "all" },
  { label: "Yes", value: "Yes" },
  { label: "No", value: "No" },
  { label: "Not Voting", value: "Not Voting" }
];

export function BillVoteMemberBreakdown({ chamber, positions }: VoteMemberBreakdownProps) {
  const [filter, setFilter] = useState<VoteFilter>("all");
  const [pinnedMemberIds, setPinnedMemberIds] = useState<string[]>([]);
  const members = useMemo(() => positions.map((record) => record.member).filter((member): member is Member => Boolean(member)), [positions]);
  const pinnedMemberSet = useMemo(() => new Set(pinnedMemberIds), [pinnedMemberIds]);
  const sortedPositions = useMemo(() => sortVotePositions(positions), [positions]);
  const pinnedPositions = sortedPositions.filter((record) => pinnedMemberSet.has(record.memberBioguideId));
  const filteredPositions = sortedPositions.filter((record) => filter === "all" || record.position === filter);
  const visibleFilteredPositions = filteredPositions.slice(0, 60);

  useEffect(() => {
    let active = true;

    function refreshPinnedMembers() {
      if (!active) return;
      const savedMemberIds = readSavedFollowRecords()
        .filter((record) => record.type === "member")
        .map((record) => record.id);
      const district = readLocalDistrictProfile();
      const districtMemberIds = district.districtCode
        ? getMatchedOfficials(members, district.districtCode)
            .filter((member) => member.chamber === chamber)
            .map((member) => member.bioguideId)
        : [];
      const positionMemberIds = new Set(positions.map((record) => record.memberBioguideId));
      const nextPinnedIds = Array.from(new Set([...districtMemberIds, ...savedMemberIds])).filter((memberId) => positionMemberIds.has(memberId));

      setPinnedMemberIds(nextPinnedIds);
    }

    refreshPinnedMembers();
    hydrateAccountLedgerFromAccount().then(() => refreshPinnedMembers());
    fetchAccountProfile().then(() => refreshPinnedMembers());

    window.addEventListener("storage", refreshPinnedMembers);
    window.addEventListener("focus", refreshPinnedMembers);
    window.addEventListener("pageshow", refreshPinnedMembers);
    window.addEventListener(followsChangedEvent, refreshPinnedMembers);
    window.addEventListener(persistenceEvent, refreshPinnedMembers);
    window.addEventListener(accountProfileChangedEvent, refreshPinnedMembers);

    return () => {
      active = false;
      window.removeEventListener("storage", refreshPinnedMembers);
      window.removeEventListener("focus", refreshPinnedMembers);
      window.removeEventListener("pageshow", refreshPinnedMembers);
      window.removeEventListener(followsChangedEvent, refreshPinnedMembers);
      window.removeEventListener(persistenceEvent, refreshPinnedMembers);
      window.removeEventListener(accountProfileChangedEvent, refreshPinnedMembers);
    };
  }, [chamber, members, positions]);

  if (!positions.length) {
    return (
      <div className="mt-4 rounded-xl border border-dashed border-white/12 bg-white/[0.035] px-4 py-4 text-[14px] leading-snug text-white/52">
        Member-level votes are not linked for this roll call yet.
      </div>
    );
  }

  return (
    <div className="mt-5 space-y-4">
      <section className="rounded-xl border border-[#ffb12b]/20 bg-[#ffb12b]/8 px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.09em] text-[#ffb12b]">Your Representatives</div>
            <div className="mt-1 text-[13px] leading-snug text-white/52">Pinned from district setup and saved officials.</div>
          </div>
          <span className="rounded-full border border-white/10 bg-white/[0.045] px-2.5 py-1 text-[11px] font-semibold text-white/56">
            {pinnedPositions.length}
          </span>
        </div>
        <div className="mt-3 divide-y divide-white/8">
          {pinnedPositions.length ? (
            pinnedPositions.map((record) => <MemberVoteRow key={`pinned-${record.voteId}-${record.memberBioguideId}`} record={record} pinned />)
          ) : (
            <div className="py-3 text-[13px] leading-snug text-white/52">
              Complete district setup or save officials to pin your delegation on recorded votes.
            </div>
          )}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[12px] font-semibold uppercase tracking-[0.1em] text-white/48">All Member Votes</div>
            <div className="mt-1 text-[13px] text-white/50">{positions.length} recorded positions</div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {voteFilters.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setFilter(item.value)}
              className={`h-9 rounded-full border px-3 text-[12px] font-semibold ${
                filter === item.value
                  ? "border-[#ffb12b]/55 bg-[#ffb12b]/14 text-[#ffb12b]"
                  : "border-white/10 bg-white/[0.035] text-white/58 hover:text-white/78"
              }`}
            >
              {item.label} {countPositions(positions, item.value)}
            </button>
          ))}
        </div>
        <div className="mt-3 max-h-[19rem] overflow-y-auto rounded-xl border border-white/10 bg-[#071a38]/48 px-3 py-1 [scrollbar-color:rgba(255,177,43,0.68)_rgba(255,255,255,0.06)] [scrollbar-width:thin]">
          <div className="divide-y divide-white/8">
            {visibleFilteredPositions.map((record) => (
              <MemberVoteRow key={`${record.voteId}-${record.memberBioguideId}`} record={record} pinned={pinnedMemberSet.has(record.memberBioguideId)} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function sortVotePositions(positions: VoteMemberPositionRecord[]) {
  return [...positions].sort((left, right) => {
    const leftPinnedWeight = positionWeight(left.position);
    const rightPinnedWeight = positionWeight(right.position);
    if (leftPinnedWeight !== rightPinnedWeight) return leftPinnedWeight - rightPinnedWeight;
    return (left.member?.lastName ?? left.member?.fullName ?? left.memberBioguideId).localeCompare(right.member?.lastName ?? right.member?.fullName ?? right.memberBioguideId);
  });
}

function positionWeight(position: VotePosition) {
  if (position === "Yes") return 0;
  if (position === "No") return 1;
  if (position === "Present") return 2;
  return 3;
}

function countPositions(positions: VoteMemberPositionRecord[], filter: VoteFilter) {
  if (filter === "all") return positions.length;
  return positions.filter((record) => record.position === filter).length;
}

function MemberVoteRow({ pinned, record }: { pinned?: boolean; record: VoteMemberPositionRecord }) {
  const member = record.member;

  return (
    <Link href={member ? `/members/${member.bioguideId}` : "#"} className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 py-3">
      {member?.photoUrl ? (
        <Image src={member.photoUrl} alt="" width={40} height={40} className="h-10 w-10 rounded-full border border-white/12 object-cover" />
      ) : (
        <span className="grid h-10 w-10 place-items-center rounded-full bg-white/6 text-white/54">
          <UserRound className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
        </span>
      )}
      <span className="min-w-0">
        <span className="block truncate text-[14px] font-semibold text-white">{member?.fullName ?? record.memberBioguideId}</span>
        <span className="mt-1 block truncate text-[12px] text-white/50">
          {member ? `${member.chamber} / ${member.state}${member.district ? `-${member.district}` : ""} / ${member.party}` : "Member profile pending"}
          {pinned ? " / Pinned" : ""}
        </span>
      </span>
      <PositionPill position={record.position} />
    </Link>
  );
}

function PositionPill({ position }: { position: VotePosition }) {
  const classes =
    position === "Yes"
      ? "border-[#43ed74]/22 bg-[#43ed74]/10 text-[#43ed74]"
      : position === "No"
        ? "border-[#ff503d]/22 bg-[#ff503d]/10 text-[#ff6b5c]"
        : position === "Present"
          ? "border-[#ffb12b]/24 bg-[#ffb12b]/10 text-[#ffb12b]"
          : "border-white/10 bg-white/[0.045] text-white/60";

  return <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${classes}`}>{position}</span>;
}
