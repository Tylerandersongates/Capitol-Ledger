import { Chamber, Party, Prisma, VotePosition as PrismaVotePosition, type PrismaClient } from "@prisma/client";
import type { Bill, CapitolSourceLink, CommitteeRecord, Member } from "../../types/capitol";
import type { CongressBillListItem, CongressCommitteeListItem, CongressMemberListItem } from "./client";
import type { NormalizedCongressBillSummary, NormalizedCongressCosponsor, NormalizedCongressMemberVote, NormalizedCongressVote } from "./normalizers";

type UpsertResult = {
  createdOrUpdated: number;
  skipped: number;
};

type BillSummaryUpsertInput = {
  bill: Pick<Bill, "billNumber" | "billType" | "congress">;
  summary: NormalizedCongressBillSummary | null;
};

const chamberMap = {
  House: Chamber.HOUSE,
  Senate: Chamber.SENATE
} as const;

const partyMap = {
  Democrat: Party.DEMOCRAT,
  Independent: Party.INDEPENDENT,
  Republican: Party.REPUBLICAN
} as const;

const votePositionMap = {
  "Not Voting": PrismaVotePosition.NOT_VOTING,
  No: PrismaVotePosition.NO,
  Present: PrismaVotePosition.PRESENT,
  Yes: PrismaVotePosition.YES
} as const;

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
}

function toJsonText(value: unknown) {
  return JSON.stringify(value ?? null) ?? "null";
}

function dateOrNull(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function memberRawByBioguideId(rawMembers: CongressMemberListItem[]) {
  return new Map(rawMembers.filter((member) => member.bioguideId).map((member) => [member.bioguideId as string, member]));
}

function billRawKey(raw: Pick<CongressBillListItem, "congress" | "number" | "type">) {
  if (!raw.congress || !raw.type || !raw.number) return "";
  return `${raw.congress}:${raw.type.toUpperCase()}:${raw.number}`;
}

function billKey(bill: Pick<Bill, "billNumber" | "billType" | "congress">) {
  return `${bill.congress}:${bill.billType.toUpperCase()}:${bill.billNumber}`;
}

function billRawByKey(rawBills: CongressBillListItem[]) {
  const values = new Map<string, CongressBillListItem>();

  rawBills.forEach((bill) => {
    const key = billRawKey(bill);
    if (key) values.set(key, bill);
  });

  return values;
}

function committeeRawById(rawCommittees: CongressCommitteeListItem[]) {
  const values = new Map<string, CongressCommitteeListItem>();

  rawCommittees.forEach((committee) => {
    const id = committee.systemCode;
    if (id) values.set(id, committee);
  });

  return values;
}

async function existingMemberIds(prisma: PrismaClient, bioguideIds: string[]) {
  if (!bioguideIds.length) return new Set<string>();

  const rows = await prisma.member.findMany({
    select: {
      bioguideId: true
    },
    where: {
      bioguideId: {
        in: Array.from(new Set(bioguideIds))
      }
    }
  });

  return new Set(rows.map((member) => member.bioguideId));
}

async function existingBillsByKey(prisma: PrismaClient, bills: Array<Pick<Bill, "billNumber" | "billType" | "congress">>) {
  const uniqueBills = Array.from(new Map(bills.map((bill) => [billKey(bill), bill])).values());
  if (!uniqueBills.length) return new Map<string, string>();

  const rows = await prisma.bill.findMany({
    select: {
      billNumber: true,
      billType: true,
      congress: true,
      id: true
    },
    where: {
      OR: uniqueBills.map((bill) => ({
        billNumber: bill.billNumber,
        billType: bill.billType,
        congress: bill.congress
      }))
    }
  });

  return new Map(rows.map((bill) => [billKey(bill), bill.id]));
}

export async function upsertCongressMembers(
  prisma: PrismaClient,
  members: Member[],
  rawMembers: CongressMemberListItem[] = []
): Promise<UpsertResult> {
  const rawById = memberRawByBioguideId(rawMembers);
  let createdOrUpdated = 0;
  let skipped = 0;

  for (const member of members) {
    const raw = rawById.get(member.bioguideId) ?? member;

    await prisma.member.upsert({
      where: {
        bioguideId: member.bioguideId
      },
      update: {
        active: member.active,
        chamber: chamberMap[member.chamber],
        district: member.district,
        firstName: member.firstName,
        fullName: member.fullName,
        lastName: member.lastName,
        officialUrl: member.officialUrl,
        party: partyMap[member.party] ?? Party.UNKNOWN,
        photoUrl: member.photoUrl,
        rawJson: toJson(raw),
        sourceUrl: member.sourceUrl,
        state: member.state
      },
      create: {
        active: member.active,
        bioguideId: member.bioguideId,
        chamber: chamberMap[member.chamber],
        district: member.district,
        firstName: member.firstName,
        fullName: member.fullName,
        lastName: member.lastName,
        officialUrl: member.officialUrl,
        party: partyMap[member.party] ?? Party.UNKNOWN,
        photoUrl: member.photoUrl,
        rawJson: toJson(raw),
        sourceUrl: member.sourceUrl,
        state: member.state
      }
    });

    createdOrUpdated += 1;
  }

  return {
    createdOrUpdated,
    skipped
  };
}

export async function upsertCongressCosponsors(
  prisma: PrismaClient,
  cosponsors: NormalizedCongressCosponsor[]
): Promise<UpsertResult> {
  const billIdsByKey = await existingBillsByKey(
    prisma,
    cosponsors.map((cosponsor) => cosponsor.bill)
  );
  const validMemberIds = await existingMemberIds(
    prisma,
    cosponsors.map((cosponsor) => cosponsor.memberBioguideId)
  );
  let createdOrUpdated = 0;
  let skipped = 0;

  for (const cosponsor of cosponsors) {
    const billId = billIdsByKey.get(billKey(cosponsor.bill));
    if (!billId || !validMemberIds.has(cosponsor.memberBioguideId)) {
      skipped += 1;
      continue;
    }

    await prisma.cosponsor.upsert({
      where: {
        billId_memberBioguideId: {
          billId,
          memberBioguideId: cosponsor.memberBioguideId
        }
      },
      update: {
        joinedAt: dateOrNull(cosponsor.joinedAt),
        withdrawnAt: dateOrNull(cosponsor.withdrawnAt)
      },
      create: {
        billId,
        joinedAt: dateOrNull(cosponsor.joinedAt),
        memberBioguideId: cosponsor.memberBioguideId,
        withdrawnAt: dateOrNull(cosponsor.withdrawnAt)
      }
    });

    createdOrUpdated += 1;
  }

  return {
    createdOrUpdated,
    skipped
  };
}

export async function upsertCongressVotes(prisma: PrismaClient, votes: NormalizedCongressVote[]): Promise<UpsertResult> {
  const billIdsByKey = await existingBillsByKey(
    prisma,
    votes.map((vote) => vote.bill).filter((bill): bill is Pick<Bill, "billNumber" | "billType" | "congress"> => Boolean(bill))
  );
  let createdOrUpdated = 0;
  let skipped = 0;

  for (const vote of votes) {
    const billId = vote.bill ? billIdsByKey.get(billKey(vote.bill)) ?? null : null;
    const voteDate = dateOrNull(vote.voteDate);

    if (!voteDate) {
      skipped += 1;
      continue;
    }

    await prisma.vote.upsert({
      where: {
        congress_chamber_rollCall: {
          chamber: chamberMap[vote.chamber],
          congress: vote.congress,
          rollCall: vote.rollCall
        }
      },
      update: {
        billId,
        question: vote.question,
        result: vote.result,
        session: vote.session,
        sourceUrl: vote.sourceUrl,
        voteDate
      },
      create: {
        billId,
        chamber: chamberMap[vote.chamber],
        congress: vote.congress,
        question: vote.question,
        result: vote.result,
        rollCall: vote.rollCall,
        session: vote.session,
        sourceUrl: vote.sourceUrl,
        voteDate
      }
    });

    createdOrUpdated += 1;
  }

  return {
    createdOrUpdated,
    skipped
  };
}

export async function upsertCongressMemberVotes(
  prisma: PrismaClient,
  memberVotes: NormalizedCongressMemberVote[]
): Promise<UpsertResult> {
  if (!memberVotes.length) {
    return {
      createdOrUpdated: 0,
      skipped: 0
    };
  }

  const validMemberIds = await existingMemberIds(
    prisma,
    memberVotes.map((memberVote) => memberVote.memberBioguideId)
  );
  const uniqueVotes = Array.from(
    new Map(memberVotes.map((memberVote) => [`${memberVote.vote.congress}:${memberVote.vote.chamber}:${memberVote.vote.rollCall}`, memberVote.vote])).values()
  );
  const voteRows = await prisma.vote.findMany({
    select: {
      chamber: true,
      congress: true,
      id: true,
      rollCall: true
    },
    where: {
      OR: uniqueVotes.map((vote) => ({
        chamber: chamberMap[vote.chamber],
        congress: vote.congress,
        rollCall: vote.rollCall
      }))
    }
  });
  const voteIdsByKey = new Map(voteRows.map((vote) => [`${vote.congress}:${vote.chamber}:${vote.rollCall}`, vote.id]));
  let createdOrUpdated = 0;
  let skipped = 0;

  for (const memberVote of memberVotes) {
    const voteId = voteIdsByKey.get(`${memberVote.vote.congress}:${chamberMap[memberVote.vote.chamber]}:${memberVote.vote.rollCall}`);
    if (!voteId || !validMemberIds.has(memberVote.memberBioguideId)) {
      skipped += 1;
      continue;
    }

    await prisma.memberVote.upsert({
      where: {
        voteId_memberBioguideId: {
          memberBioguideId: memberVote.memberBioguideId,
          voteId
        }
      },
      update: {
        position: votePositionMap[memberVote.position]
      },
      create: {
        memberBioguideId: memberVote.memberBioguideId,
        position: votePositionMap[memberVote.position],
        voteId
      }
    });

    createdOrUpdated += 1;
  }

  return {
    createdOrUpdated,
    skipped
  };
}

export async function upsertCongressBills(
  prisma: PrismaClient,
  bills: Bill[],
  rawBills: CongressBillListItem[] = []
): Promise<UpsertResult> {
  const rawByKey = billRawByKey(rawBills);
  const sponsorIds = bills.map((bill) => bill.sponsorBioguideId).filter((value): value is string => Boolean(value));
  const validSponsorIds = await existingMemberIds(prisma, sponsorIds);
  let createdOrUpdated = 0;
  let skipped = 0;

  for (const bill of bills) {
    const raw = rawByKey.get(billKey(bill)) ?? bill;
    const sponsorBioguideId = bill.sponsorBioguideId && validSponsorIds.has(bill.sponsorBioguideId) ? bill.sponsorBioguideId : null;
    const latestActionDate = dateOrNull(bill.latestActionDate);

    await prisma.bill.upsert({
      where: {
        congress_billType_billNumber: {
          billNumber: bill.billNumber,
          billType: bill.billType,
          congress: bill.congress
        }
      },
      update: {
        latestActionDate,
        latestActionText: bill.latestActionText,
        policyArea: bill.policyArea,
        rawJson: toJson(raw),
        shortTitle: bill.shortTitle,
        sourceUrl: bill.sourceUrl,
        sponsorBioguideId,
        summary: bill.summary,
        title: bill.title
      },
      create: {
        billNumber: bill.billNumber,
        billType: bill.billType,
        congress: bill.congress,
        latestActionDate,
        latestActionText: bill.latestActionText,
        policyArea: bill.policyArea,
        rawJson: toJson(raw),
        shortTitle: bill.shortTitle,
        sourceUrl: bill.sourceUrl,
        sponsorBioguideId,
        summary: bill.summary,
        title: bill.title
      }
    });

    createdOrUpdated += 1;
    if (bill.sponsorBioguideId && !sponsorBioguideId) skipped += 1;
  }

  return {
    createdOrUpdated,
    skipped
  };
}

export async function upsertCongressCommittees(
  prisma: PrismaClient,
  committees: CommitteeRecord[],
  rawCommittees: CongressCommitteeListItem[] = []
): Promise<UpsertResult> {
  const rawById = committeeRawById(rawCommittees);
  let createdOrUpdated = 0;
  let skipped = 0;

  for (const committee of committees) {
    const chamber = committee.chamber ? chamberMap[committee.chamber] : null;
    const raw = rawById.get(committee.systemCode ?? committee.id) ?? committee;

    await prisma.$executeRaw`
      INSERT INTO "Committee" ("id", "name", "chamber", "systemCode", "sourceUrl", "rawJson", "createdAt", "updatedAt")
      VALUES (${committee.id}, ${committee.name}, ${chamber}::"Chamber", ${committee.systemCode ?? null}, ${committee.sourceUrl ?? null}, ${toJsonText(raw)}::jsonb, NOW(), NOW())
      ON CONFLICT ("id") DO UPDATE SET
        "name" = EXCLUDED."name",
        "chamber" = EXCLUDED."chamber",
        "systemCode" = EXCLUDED."systemCode",
        "sourceUrl" = EXCLUDED."sourceUrl",
        "rawJson" = EXCLUDED."rawJson",
        "updatedAt" = NOW()
    `;

    createdOrUpdated += 1;
  }

  return {
    createdOrUpdated,
    skipped
  };
}

export async function upsertCongressBillSummaries(
  prisma: PrismaClient,
  billSummaries: BillSummaryUpsertInput[]
): Promise<UpsertResult> {
  let createdOrUpdated = 0;
  let skipped = 0;

  for (const record of billSummaries) {
    if (!record.summary?.text) {
      skipped += 1;
      continue;
    }

    const result = await prisma.bill.updateMany({
      data: {
        summary: record.summary.text
      },
      where: {
        billNumber: record.bill.billNumber,
        billType: record.bill.billType,
        congress: record.bill.congress
      }
    });

    if (result.count > 0) {
      createdOrUpdated += result.count;
    } else {
      skipped += 1;
    }
  }

  return {
    createdOrUpdated,
    skipped
  };
}

export async function upsertOfficialSourceLinks(
  prisma: PrismaClient,
  sourceLinks: CapitolSourceLink[]
): Promise<UpsertResult> {
  let createdOrUpdated = 0;
  let skipped = 0;

  for (const sourceLink of sourceLinks) {
    const verifiedAt = dateOrNull(sourceLink.verifiedAt);

    await prisma.$executeRaw`
      INSERT INTO "OfficialSourceLink" ("id", "targetType", "targetId", "label", "url", "source", "sourceKind", "verifiedAt", "createdAt", "updatedAt")
      VALUES (${sourceLink.id}, ${sourceLink.targetType}, ${sourceLink.targetId}, ${sourceLink.label}, ${sourceLink.url}, ${sourceLink.source}, ${sourceLink.sourceKind}, ${verifiedAt}, NOW(), NOW())
      ON CONFLICT ("id") DO UPDATE SET
        "targetType" = EXCLUDED."targetType",
        "targetId" = EXCLUDED."targetId",
        "label" = EXCLUDED."label",
        "url" = EXCLUDED."url",
        "source" = EXCLUDED."source",
        "sourceKind" = EXCLUDED."sourceKind",
        "verifiedAt" = EXCLUDED."verifiedAt",
        "updatedAt" = NOW()
    `;

    createdOrUpdated += 1;
  }

  return {
    createdOrUpdated,
    skipped
  };
}
