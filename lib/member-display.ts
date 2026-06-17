import type { Member } from "@/types/capitol";

export type MemberDisplayRecord = Pick<Member, "chamber" | "district" | "fullName" | "party" | "state">;

const territoryHouseSeatStates = ["AS", "DC", "GU", "MP", "PR", "VI"];

export function stripMemberPrefix(fullName: string) {
  return fullName.replace(/^Sen\.\s+|^Rep\.\s+/i, "").trim();
}

export function isAtLargeDistrict(district?: string) {
  const normalized = district?.trim().toLowerCase();
  return normalized === "0" || normalized === "00" || normalized === "al" || normalized === "at-large" || normalized === "at large" || normalized === "atlarge";
}

export function isTerritoryHouseSeat(member: Pick<MemberDisplayRecord, "chamber" | "state">) {
  return member.chamber === "House" && territoryHouseSeatStates.includes(member.state);
}

export function memberOfficeLabel(member: Pick<MemberDisplayRecord, "chamber" | "state">) {
  if (member.chamber === "Senate") return "Senator";
  if (member.state === "PR") return "Resident Commissioner";
  if (isTerritoryHouseSeat(member)) return "Delegate";
  return "Representative";
}

export function memberSeatCode(member: Pick<MemberDisplayRecord, "chamber" | "district" | "state">) {
  if (member.district) return `${member.state}-${isAtLargeDistrict(member.district) ? "AL" : member.district}`;
  return isTerritoryHouseSeat(member) ? `${member.state}-AL` : member.state;
}

export function memberResultMeta(member: MemberDisplayRecord, separator = " · ") {
  return [memberOfficeLabel(member), memberSeatCode(member), member.party].join(separator);
}

export function memberDisplayLocation(member: Pick<MemberDisplayRecord, "chamber" | "district" | "state">, stateLabel = member.state) {
  if (!member.district) return isTerritoryHouseSeat(member) ? `${stateLabel} At-Large` : stateLabel;
  return isAtLargeDistrict(member.district) ? `${stateLabel} At-Large` : `${stateLabel} District ${member.district}`;
}

export function memberSeatTag(member: Pick<MemberDisplayRecord, "chamber" | "district" | "party" | "state">) {
  const partyCode = member.party.trim().charAt(0).toUpperCase() || "U";
  return `[${partyCode}-${memberSeatCode(member)}]`;
}
