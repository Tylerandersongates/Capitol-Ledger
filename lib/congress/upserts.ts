import { Chamber, Party, Prisma, VotePosition as PrismaVotePosition, type PrismaClient } from "@prisma/client";
import type { Bill, CapitolSourceLink, CommitteeRecord, Member } from "../../types/capitol";
import type { CongressBillListItem, CongressCommitteeListItem, CongressMemberDetailItem, CongressMemberListItem } from "./client";
import type { NormalizedCongressBillSummary, NormalizedCongressCosponsor, NormalizedCongressMemberVote, NormalizedCongressVote } from "./normalizers";

type UpsertResult = {
  createdOrUpdated: number;
  skipped: number;
};

type BillSummaryUpsertInput = {
  bill: Pick<Bill, "billNumber" | "billType" | "congress">;
  summary: NormalizedCongressBillSummary | null;
};

type BillCatalogUpsertOptions = {
  batchSize?: number;
};

type CongressBillUpsertOptions = {
  preserveExistingEnrichment?: boolean;
};

type CongressVoteUpsertOptions = {
  batchSize?: number;
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
  Other: PrismaVotePosition.OTHER,
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

type CongressMemberRawItem = CongressMemberListItem | CongressMemberDetailItem;

function memberRawByBioguideId(rawMembers: CongressMemberRawItem[]) {
  return new Map(rawMembers.filter((member) => member.bioguideId).map((member) => [member.bioguideId as string, member]));
}

function hasMemberServiceHistory(raw: unknown) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
  const record = raw as Record<string, unknown>;
  const terms = record.terms;

  if (Array.isArray(terms)) return terms.length > 0;
  if (terms && typeof terms === "object" && Array.isArray((terms as Record<string, unknown>).item)) {
    return ((terms as Record<string, unknown>).item as unknown[]).length > 0;
  }

  return Boolean(record.firstElectedDate || record.nextElectionDate || record.termsInOffice);
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
  rawMembers: CongressMemberRawItem[] = []
): Promise<UpsertResult> {
  const rawById = memberRawByBioguideId(rawMembers);
  let createdOrUpdated = 0;
  let skipped = 0;

  for (const member of members) {
    const raw = rawById.get(member.bioguideId) ?? member;
    const rawJson = toJson(raw);
    const update: Prisma.MemberUpdateInput = {
      active: member.active,
      chamber: chamberMap[member.chamber],
      district: member.district,
      firstName: member.firstName,
      fullName: member.fullName,
      lastName: member.lastName,
      officialUrl: member.officialUrl,
      party: partyMap[member.party] ?? Party.UNKNOWN,
      photoUrl: member.photoUrl,
      sourceUrl: member.sourceUrl,
      state: member.state
    };

    if (hasMemberServiceHistory(raw)) {
      update.rawJson = rawJson;
    }

    await prisma.member.upsert({
      where: {
        bioguideId: member.bioguideId
      },
      update,
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
        rawJson,
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

export async function reconcileCongressMemberRoster(prisma: PrismaClient, activeMemberIds: string[]) {
  const uniqueActiveMemberIds = Array.from(new Set(activeMemberIds));
  if (uniqueActiveMemberIds.length < 500) {
    throw new Error(`Refusing roster reconciliation with only ${uniqueActiveMemberIds.length} active member IDs.`);
  }

  const result = await prisma.member.updateMany({
    data: {
      active: false
    },
    where: {
      active: true,
      bioguideId: {
        notIn: uniqueActiveMemberIds
      }
    }
  });

  return {
    deactivated: result.count
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

export async function upsertCongressVotes(
  prisma: PrismaClient,
  votes: NormalizedCongressVote[],
  { batchSize = 250 }: CongressVoteUpsertOptions = {}
): Promise<UpsertResult> {
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 1_000) {
    throw new Error("Vote database batch size must be an integer from 1 to 1000.");
  }

  const billIdsByKey = await existingBillsByKey(
    prisma,
    votes.map((vote) => vote.bill).filter((bill): bill is Pick<Bill, "billNumber" | "billType" | "congress"> => Boolean(bill))
  );
  let createdOrUpdated = 0;
  let skipped = 0;

  for (let offset = 0; offset < votes.length; offset += batchSize) {
    const records = votes.slice(offset, offset + batchSize).flatMap((vote) => {
      const voteDate = dateOrNull(vote.voteDate);
      if (!voteDate || !vote.session) {
        skipped += 1;
        return [];
      }

      return [
        {
          billId: vote.bill ? billIdsByKey.get(billKey(vote.bill)) ?? null : null,
          chamber: chamberMap[vote.chamber],
          congress: vote.congress,
          id: `vote-${vote.congress}-${vote.chamber.toLowerCase()}-${vote.session}-${vote.rollCall}`,
          question: vote.question,
          rawJson: vote,
          result: vote.result ?? null,
          rollCall: vote.rollCall,
          session: vote.session,
          sourceUrl: vote.sourceUrl ?? null,
          voteDate: voteDate.toISOString()
        }
      ];
    });

    if (!records.length) continue;
    const recordsJson = JSON.stringify(records);

    await prisma.$executeRaw`
      INSERT INTO "Vote" (
        "id",
        "congress",
        "chamber",
        "rollCall",
        "session",
        "question",
        "result",
        "voteDate",
        "sourceUrl",
        "billId",
        "rawJson",
        "createdAt",
        "updatedAt"
      )
      SELECT
        record."id",
        record."congress",
        record."chamber"::"Chamber",
        record."rollCall",
        record."session",
        record."question",
        record."result",
        record."voteDate",
        record."sourceUrl",
        record."billId",
        record."rawJson",
        NOW(),
        NOW()
      FROM jsonb_to_recordset(${recordsJson}::jsonb) AS record(
        "id" TEXT,
        "congress" INTEGER,
        "chamber" TEXT,
        "rollCall" TEXT,
        "session" TEXT,
        "question" TEXT,
        "result" TEXT,
        "voteDate" TIMESTAMP,
        "sourceUrl" TEXT,
        "billId" TEXT,
        "rawJson" JSONB
      )
      ON CONFLICT ("congress", "chamber", "session", "rollCall") DO UPDATE SET
        "question" = EXCLUDED."question",
        "result" = EXCLUDED."result",
        "voteDate" = EXCLUDED."voteDate",
        "sourceUrl" = EXCLUDED."sourceUrl",
        "billId" = COALESCE(EXCLUDED."billId", "Vote"."billId"),
        "rawJson" = EXCLUDED."rawJson",
        "updatedAt" = NOW()
    `;

    createdOrUpdated += records.length;
  }

  return {
    createdOrUpdated,
    skipped
  };
}

export async function upsertCongressMemberVotes(
  prisma: PrismaClient,
  memberVotes: NormalizedCongressMemberVote[],
  { batchSize = 2_000 }: CongressVoteUpsertOptions = {}
): Promise<UpsertResult> {
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 5_000) {
    throw new Error("Member vote database batch size must be an integer from 1 to 5000.");
  }
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
    new Map(
      memberVotes.map((memberVote) => [
        `${memberVote.vote.congress}:${memberVote.vote.chamber}:${memberVote.vote.session}:${memberVote.vote.rollCall}`,
        memberVote.vote
      ])
    ).values()
  );
  const votePartitions = Array.from(
    new Map(
      uniqueVotes.map((vote) => [
        `${vote.congress}:${vote.chamber}:${vote.session}`,
        {
          chamber: chamberMap[vote.chamber],
          congress: vote.congress,
          session: vote.session
        }
      ])
    ).values()
  );
  const voteRows = await prisma.vote.findMany({
    select: {
      chamber: true,
      congress: true,
      id: true,
      rollCall: true,
      session: true
    },
    where: {
      OR: votePartitions
    }
  });
  const voteIdsByKey = new Map(voteRows.map((vote) => [`${vote.congress}:${vote.chamber}:${vote.session}:${vote.rollCall}`, vote.id]));
  let createdOrUpdated = 0;
  let skipped = 0;

  const records = memberVotes.flatMap((memberVote) => {
    const voteId = voteIdsByKey.get(
      `${memberVote.vote.congress}:${chamberMap[memberVote.vote.chamber]}:${memberVote.vote.session}:${memberVote.vote.rollCall}`
    );
    if (!voteId || !validMemberIds.has(memberVote.memberBioguideId)) {
      skipped += 1;
      return [];
    }

    return [
      {
        id: `member-vote-${voteId}-${memberVote.memberBioguideId}`,
        memberBioguideId: memberVote.memberBioguideId,
        position: votePositionMap[memberVote.position],
        positionLabel: memberVote.positionLabel ?? null,
        voteId
      }
    ];
  });

  for (let offset = 0; offset < records.length; offset += batchSize) {
    const recordsJson = JSON.stringify(records.slice(offset, offset + batchSize));

    await prisma.$executeRaw`
      INSERT INTO "MemberVote" (
        "id",
        "voteId",
        "memberBioguideId",
        "position",
        "positionLabel"
      )
      SELECT
        record."id",
        record."voteId",
        record."memberBioguideId",
        record."position"::"VotePosition",
        record."positionLabel"
      FROM jsonb_to_recordset(${recordsJson}::jsonb) AS record(
        "id" TEXT,
        "voteId" TEXT,
        "memberBioguideId" TEXT,
        "position" TEXT,
        "positionLabel" TEXT
      )
      ON CONFLICT ("voteId", "memberBioguideId") DO UPDATE SET
        "position" = EXCLUDED."position",
        "positionLabel" = EXCLUDED."positionLabel"
    `;

    createdOrUpdated += Math.min(batchSize, records.length - offset);
  }

  return {
    createdOrUpdated,
    skipped
  };
}

export async function upsertCongressBills(
  prisma: PrismaClient,
  bills: Bill[],
  rawBills: CongressBillListItem[] = [],
  { preserveExistingEnrichment = false }: CongressBillUpsertOptions = {}
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
        policyArea: preserveExistingEnrichment && bill.policyArea === "Legislation" ? undefined : bill.policyArea,
        rawJson: toJson(raw),
        shortTitle: bill.shortTitle,
        sourceUrl: bill.sourceUrl,
        sponsorBioguideId: preserveExistingEnrichment && !sponsorBioguideId ? undefined : sponsorBioguideId,
        summary: preserveExistingEnrichment ? undefined : bill.summary,
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

export async function upsertCongressBillCatalog(
  prisma: PrismaClient,
  bills: Bill[],
  rawBills: CongressBillListItem[] = [],
  { batchSize = 250 }: BillCatalogUpsertOptions = {}
): Promise<UpsertResult> {
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 1_000) {
    throw new Error("Bill catalog database batch size must be an integer from 1 to 1000.");
  }

  const rawByKey = billRawByKey(rawBills);
  const sponsorIds = bills.map((bill) => bill.sponsorBioguideId).filter((value): value is string => Boolean(value));
  const validSponsorIds = await existingMemberIds(prisma, sponsorIds);
  let createdOrUpdated = 0;
  let skipped = 0;

  for (let offset = 0; offset < bills.length; offset += batchSize) {
    const batch = bills.slice(offset, offset + batchSize);
    const records = batch.map((bill) => {
      const sponsorBioguideId = bill.sponsorBioguideId && validSponsorIds.has(bill.sponsorBioguideId) ? bill.sponsorBioguideId : null;
      if (bill.sponsorBioguideId && !sponsorBioguideId) skipped += 1;

      return {
        billNumber: bill.billNumber,
        billType: bill.billType,
        congress: bill.congress,
        id: bill.id,
        latestActionDate: dateOrNull(bill.latestActionDate)?.toISOString() ?? null,
        latestActionText: bill.latestActionText,
        policyArea: bill.policyArea,
        rawJson: rawByKey.get(billKey(bill)) ?? bill,
        shortTitle: bill.shortTitle,
        sourceUrl: bill.sourceUrl,
        sponsorBioguideId,
        summary: bill.summary,
        title: bill.title
      };
    });
    const recordsJson = JSON.stringify(records);

    await prisma.$executeRaw`
      INSERT INTO "Bill" (
        "id",
        "congress",
        "billType",
        "billNumber",
        "title",
        "shortTitle",
        "sponsorBioguideId",
        "policyArea",
        "latestActionText",
        "latestActionDate",
        "summary",
        "sourceUrl",
        "rawJson",
        "createdAt",
        "updatedAt"
      )
      SELECT
        record."id",
        record."congress",
        record."billType",
        record."billNumber",
        record."title",
        record."shortTitle",
        record."sponsorBioguideId",
        record."policyArea",
        record."latestActionText",
        record."latestActionDate",
        record."summary",
        record."sourceUrl",
        record."rawJson",
        NOW(),
        NOW()
      FROM jsonb_to_recordset(${recordsJson}::jsonb) AS record(
        "id" TEXT,
        "congress" INTEGER,
        "billType" TEXT,
        "billNumber" TEXT,
        "title" TEXT,
        "shortTitle" TEXT,
        "sponsorBioguideId" TEXT,
        "policyArea" TEXT,
        "latestActionText" TEXT,
        "latestActionDate" TIMESTAMP,
        "summary" TEXT,
        "sourceUrl" TEXT,
        "rawJson" JSONB
      )
      ON CONFLICT ("congress", "billType", "billNumber") DO UPDATE SET
        "title" = EXCLUDED."title",
        "shortTitle" = EXCLUDED."shortTitle",
        "sponsorBioguideId" = COALESCE(EXCLUDED."sponsorBioguideId", "Bill"."sponsorBioguideId"),
        "policyArea" = CASE
          WHEN EXCLUDED."policyArea" = 'Legislation' THEN "Bill"."policyArea"
          ELSE EXCLUDED."policyArea"
        END,
        "latestActionText" = EXCLUDED."latestActionText",
        "latestActionDate" = EXCLUDED."latestActionDate",
        "summary" = COALESCE("Bill"."summary", EXCLUDED."summary"),
        "sourceUrl" = EXCLUDED."sourceUrl",
        "rawJson" = COALESCE("Bill"."rawJson", EXCLUDED."rawJson"),
        "updatedAt" = NOW()
    `;

    createdOrUpdated += records.length;
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
