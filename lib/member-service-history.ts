import type { Member } from "@/types/capitol";
import houseElectionHistory from "@/data/house-first-elected-119.json";

type MemberServiceFallback = Pick<Member, "firstElectedDate" | "nextElectionDate" | "termsInOffice">;

const votingHouseStates = new Set(
  "AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY".split(" ")
);
const houseFirstElectionDates = houseElectionHistory.members as Record<string, { firstElectedDate: string }>;

export function nextRegularHouseElectionDate(asOf: Date = new Date()): string {
  const year = asOf.getUTCFullYear();
  const electionYear = year % 2 === 0 ? year : year + 1;
  const firstNovemberDay = new Date(Date.UTC(electionYear, 10, 1)).getUTCDay();
  const firstMonday = 1 + (8 - firstNovemberDay) % 7;
  const electionDate = new Date(Date.UTC(electionYear, 10, firstMonday + 1)).toISOString().slice(0, 10);
  // Keep election day current through midnight in Hawaii, the last voting state to finish the day.
  const endOfElectionDay = Date.UTC(electionYear, 10, firstMonday + 2, 10);
  return asOf.getTime() < endOfElectionDay
    ? electionDate
    : nextRegularHouseElectionDate(new Date(Date.UTC(electionYear + 1, 0, 1)));
}

export const memberServiceFallbacks: Record<string, MemberServiceFallback> = {
  C001056: {
    firstElectedDate: "2002-11-05",
    nextElectionDate: "2026-11-03",
    termsInOffice: 4
  },
  C001098: {
    firstElectedDate: "2012-11-06",
    nextElectionDate: "2030-11-05",
    termsInOffice: 3
  },
  G000555: {
    firstElectedDate: "2010-11-02",
    nextElectionDate: "2030-11-05",
    termsInOffice: 4
  },
  G000585: {
    firstElectedDate: "2017-06-06",
    nextElectionDate: "2026-11-03",
    termsInOffice: 5
  },
  M000133: {
    firstElectedDate: "2013-06-25",
    nextElectionDate: "2026-11-03",
    termsInOffice: 3
  },
  M001153: {
    firstElectedDate: "2004-11-02",
    nextElectionDate: "2028-11-07",
    termsInOffice: 4
  },
  M001157: {
    firstElectedDate: "2004-11-02",
    nextElectionDate: "2026-11-03",
    termsInOffice: 11
  },
  O000172: {
    firstElectedDate: "2018-11-06",
    nextElectionDate: "2026-11-03",
    termsInOffice: 4
  },
  P000145: {
    firstElectedDate: "2022-11-08",
    nextElectionDate: "2028-11-07",
    termsInOffice: 2
  },
  P000617: {
    firstElectedDate: "2018-11-06",
    nextElectionDate: "2026-11-03",
    termsInOffice: 4
  },
  S000033: {
    firstElectedDate: "2006-11-07",
    nextElectionDate: "2030-11-05",
    termsInOffice: 4
  },
  S000148: {
    firstElectedDate: "1998-11-03",
    nextElectionDate: "2028-11-07",
    termsInOffice: 5
  },
  S001150: {
    firstElectedDate: "2024-11-05",
    nextElectionDate: "2030-11-05",
    termsInOffice: 1
  },
  W000817: {
    firstElectedDate: "2012-11-06",
    nextElectionDate: "2030-11-05",
    termsInOffice: 3
  }
};

export function withMemberServiceFallback(member: Member): Member {
  const fallback = memberServiceFallbacks[member.bioguideId];
  const votingHouseMember = member.chamber === "House" && votingHouseStates.has(member.state);
  const houseFirstElectedDate = votingHouseMember ? houseFirstElectionDates[member.bioguideId]?.firstElectedDate : undefined;
  if (!fallback && !votingHouseMember) return member;

  return {
    ...member,
    firstElectedDate: houseFirstElectedDate ?? member.firstElectedDate ?? fallback?.firstElectedDate,
    // A House seat's next regular election is a calendar date, not a claim that its incumbent will run.
    nextElectionDate: votingHouseMember ? (member.active ? nextRegularHouseElectionDate() : undefined) : member.nextElectionDate ?? fallback?.nextElectionDate,
    termsInOffice: member.termsInOffice ?? fallback?.termsInOffice
  };
}
