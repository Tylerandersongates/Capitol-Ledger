import type { Bill, Chamber, Vote } from "@/types/capitol";
import { isAtLargeDistrict, memberStateCode } from "@/lib/member-display";

export type AlertGroup = "today" | "yesterday" | "earlier";

export type VoteReminderMember = {
  bioguideId: string;
  chamber: Chamber;
  district?: string;
  fullName: string;
  state: string;
};

export type CurrentVoteReminder = {
  bill: Bill;
  contact: VoteReminderMember;
  group: Exclude<AlertGroup, "earlier">;
  id: string;
  vote: Vote;
};

function startOfLocalDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function startOfUtcDay(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function stateAndDistrictFromCode(value?: string) {
  const match = value?.trim().toUpperCase().match(/^([A-Z]{2})-(?:0?(\d{1,2})|(AL))$/);
  return match ? { district: match[2] ?? match[3], state: match[1] } : null;
}

export function getAlertGroupFromDate(value: string, now = new Date()): AlertGroup {
  const occurredAt = new Date(value);
  if (Number.isNaN(occurredAt.getTime())) return "earlier";

  const today = startOfLocalDay(now);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const occurredDay = startOfLocalDay(occurredAt);

  if (occurredDay.getTime() === today.getTime()) return "today";
  if (occurredDay.getTime() === yesterday.getTime()) return "yesterday";
  return "earlier";
}

export function isDefaultUnreadAlertDate(value: string) {
  return getAlertGroupFromDate(value) !== "earlier";
}

export function getVoteAlertGroupFromDate(value: string, now = new Date()): AlertGroup {
  const occurredAt = new Date(value);
  if (Number.isNaN(occurredAt.getTime())) return "earlier";

  const today = startOfUtcDay(now);
  const yesterday = new Date(today);
  yesterday.setUTCDate(today.getUTCDate() - 1);
  const occurredDay = startOfUtcDay(occurredAt);

  if (occurredDay.getTime() === today.getTime()) return "today";
  if (occurredDay.getTime() === yesterday.getTime()) return "yesterday";
  return "earlier";
}

export function selectVoteReminderContact(
  members: VoteReminderMember[],
  districtCode: string | undefined,
  chamber: Chamber
) {
  const district = stateAndDistrictFromCode(districtCode);
  if (!district) return undefined;

  const sameStateAndChamber = members
    .filter((member) => member.chamber === chamber && memberStateCode(member.state) === district.state)
    .sort((left, right) => left.fullName.localeCompare(right.fullName));

  if (chamber === "Senate") return sameStateAndChamber[0];
  return sameStateAndChamber.find((member) =>
    isAtLargeDistrict(district.district)
      ? isAtLargeDistrict(member.district)
      : member.district === district.district
  );
}

export function getCurrentVoteReminder({
  districtCode,
  enabled,
  followedBillIds,
  members,
  now = new Date(),
  voteId,
  voteFeed
}: {
  districtCode?: string;
  enabled: boolean;
  followedBillIds: Iterable<string>;
  members: VoteReminderMember[];
  now?: Date;
  voteId?: string;
  voteFeed?: Array<{ bill?: Bill; vote: Vote }>;
}): CurrentVoteReminder | null {
  if (!enabled) return null;

  const followedBills = new Set(followedBillIds);
  for (const candidate of voteFeed ?? []) {
    if (voteId && candidate.vote.id !== voteId) continue;
    if (!candidate.bill || !candidate.vote.billId) continue;
    if (candidate.vote.billId !== candidate.bill.id || !followedBills.has(candidate.bill.id)) continue;

    const voteTime = Date.parse(candidate.vote.voteDate);
    if (!Number.isFinite(voteTime) || voteTime > now.getTime()) continue;

    const group = getVoteAlertGroupFromDate(candidate.vote.voteDate, now);
    if (group === "earlier") continue;

    const contact = selectVoteReminderContact(members, districtCode, candidate.vote.chamber);
    if (!contact) continue;

    return {
      bill: candidate.bill,
      contact,
      group,
      id: `system-vote-reminder:${candidate.vote.id}`,
      vote: candidate.vote
    };
  }

  return null;
}
