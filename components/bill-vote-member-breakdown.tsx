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
import { MobileGlassScrollFrame } from "@/components/mobile-glass-scroll-frame";
import type { Member, VotePosition } from "@/types/capitol";
import type { VoteMemberPositionRecord } from "@/lib/data";
import { UserRound } from "lucide-react";

type VoteMemberBreakdownProps = {
  chamber: "House" | "Senate";
  positions: VoteMemberPositionRecord[];
  showPinnedSection?: boolean;
};

type VoteFilter = "all" | VotePosition;
type PartyGroupKey = Member["party"] | "Unknown";
type PositionCounts = {
  no: number;
  notVoting: number;
  present: number;
  yes: number;
};
type PartyVoteGroup = {
  counts: PositionCounts;
  key: PartyGroupKey;
  label: string;
  records: VoteMemberPositionRecord[];
};

const voteFilters: Array<{ label: string; value: VoteFilter }> = [
  { label: "All", value: "all" },
  { label: "Yes", value: "Yes" },
  { label: "No", value: "No" },
  { label: "Present", value: "Present" },
  { label: "Not Voting", value: "Not Voting" }
];

const partyGroupDefinitions: Array<{ key: PartyGroupKey; label: string }> = [
  { key: "Republican", label: "Republicans" },
  { key: "Democrat", label: "Democrats" },
  { key: "Independent", label: "Independents" },
  { key: "Unknown", label: "Party pending" }
];

export function BillVoteMemberBreakdown({ chamber, positions, showPinnedSection = true }: VoteMemberBreakdownProps) {
  const [filter, setFilter] = useState<VoteFilter>("all");
  const [pinnedMemberIds, setPinnedMemberIds] = useState<string[]>([]);
  const members = useMemo(() => positions.map((record) => record.member).filter((member): member is Member => Boolean(member)), [positions]);
  const pinnedMemberSet = useMemo(() => new Set(pinnedMemberIds), [pinnedMemberIds]);
  const sortedPositions = useMemo(() => sortVotePositions(positions), [positions]);
  const pinnedPositions = useMemo(() => sortedPositions.filter((record) => pinnedMemberSet.has(record.memberBioguideId)), [pinnedMemberSet, sortedPositions]);
  const filteredPositions = useMemo(() => sortedPositions.filter((record) => filter === "all" || record.position === filter), [filter, sortedPositions]);
  const groupedFilteredPositions = useMemo(() => groupPositionsByParty(filteredPositions), [filteredPositions]);

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
      {showPinnedSection ? (
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
      ) : null}

      <section>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[12px] font-semibold uppercase tracking-[0.1em] text-white/48">All Member Votes By Party</div>
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
        <MobileGlassScrollFrame frameClassName="mt-3" heightClassName="max-h-[21rem]" className="space-y-4 px-3 py-3" ariaLabel="All member vote positions by party">
          {groupedFilteredPositions.length ? (
            groupedFilteredPositions.map((group) => (
              <div key={group.key} className="rounded-xl border border-white/8 bg-white/[0.025] px-3 py-2">
                <PartyGroupHeader group={group} />
                <div className="mt-2 divide-y divide-white/8">
                  {group.records.map((record) => (
                    <MemberVoteRow key={`${group.key}-${record.voteId}-${record.memberBioguideId}`} record={record} pinned={pinnedMemberSet.has(record.memberBioguideId)} />
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-white/12 bg-white/[0.035] px-4 py-4 text-[13px] leading-snug text-white/52">
              No member positions match this filter.
            </div>
          )}
        </MobileGlassScrollFrame>
      </section>
    </div>
  );
}

function sortVotePositions(positions: VoteMemberPositionRecord[]) {
  return [...positions].sort((left, right) => {
    const partyDelta = partyWeight(left) - partyWeight(right);
    if (partyDelta) return partyDelta;

    const positionDelta = positionWeight(left.position) - positionWeight(right.position);
    if (positionDelta) return positionDelta;

    return (left.member?.lastName ?? left.member?.fullName ?? left.memberBioguideId).localeCompare(right.member?.lastName ?? right.member?.fullName ?? right.memberBioguideId);
  });
}

function partyWeight(record: VoteMemberPositionRecord) {
  const party = record.member?.party;
  if (party === "Republican") return 0;
  if (party === "Democrat") return 1;
  if (party === "Independent") return 2;
  return 3;
}

function positionWeight(position: VotePosition) {
  if (position === "Yes") return 0;
  if (position === "No") return 1;
  if (position === "Present") return 2;
  return 3;
}

function groupPositionsByParty(positions: VoteMemberPositionRecord[]): PartyVoteGroup[] {
  return partyGroupDefinitions
    .map((definition) => {
      const records = positions.filter((record) => (record.member?.party ?? "Unknown") === definition.key);

      return {
        counts: countPartyPositions(records),
        key: definition.key,
        label: definition.label,
        records
      };
    })
    .filter((group) => group.records.length > 0);
}

function countPartyPositions(positions: VoteMemberPositionRecord[]): PositionCounts {
  return positions.reduce(
    (counts, record) => {
      if (record.position === "Yes") counts.yes += 1;
      else if (record.position === "No") counts.no += 1;
      else if (record.position === "Present") counts.present += 1;
      else counts.notVoting += 1;

      return counts;
    },
    { no: 0, notVoting: 0, present: 0, yes: 0 }
  );
}

function countPositions(positions: VoteMemberPositionRecord[], filter: VoteFilter) {
  if (filter === "all") return positions.length;
  return positions.filter((record) => record.position === filter).length;
}

function PartyGroupHeader({ group }: { group: PartyVoteGroup }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/8 pb-2">
      <div className="min-w-0">
        <div className={`text-[12px] font-semibold uppercase tracking-[0.09em] ${partyToneClass(group.key)}`}>{group.label}</div>
        <div className="mt-1 text-[12px] text-white/45">{group.records.length} positions</div>
      </div>
      <div className="flex flex-wrap justify-end gap-1.5">
        <span className="rounded-full border border-[#43ed74]/22 bg-[#43ed74]/10 px-2 py-1 text-[10px] font-semibold text-[#43ed74]">Y {group.counts.yes}</span>
        <span className="rounded-full border border-[#ff503d]/22 bg-[#ff503d]/10 px-2 py-1 text-[10px] font-semibold text-[#ff6b5c]">N {group.counts.no}</span>
        <span className="rounded-full border border-[#ffb12b]/24 bg-[#ffb12b]/10 px-2 py-1 text-[10px] font-semibold text-[#ffb12b]">P {group.counts.present}</span>
        <span className="rounded-full border border-white/10 bg-white/[0.045] px-2 py-1 text-[10px] font-semibold text-white/58">NV {group.counts.notVoting}</span>
      </div>
    </div>
  );
}

function partyToneClass(party: PartyGroupKey) {
  if (party === "Republican") return "text-[#ff9b8f]";
  if (party === "Democrat") return "text-[#9fbeff]";
  if (party === "Independent") return "text-[#d7b8ff]";
  return "text-white/54";
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
