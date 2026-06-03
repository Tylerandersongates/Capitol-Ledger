import type { Member } from "@/types/capitol";

type MemberServiceFallback = Pick<Member, "firstElectedDate" | "nextElectionDate" | "termsInOffice">;

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
  if (!fallback) return member;

  return {
    ...member,
    firstElectedDate: member.firstElectedDate ?? fallback.firstElectedDate,
    nextElectionDate: member.nextElectionDate ?? fallback.nextElectionDate,
    termsInOffice: member.termsInOffice ?? fallback.termsInOffice
  };
}
