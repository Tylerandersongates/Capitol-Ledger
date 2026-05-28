import { PrismaClient, Chamber, FollowTargetType, Party, VotePosition } from "@prisma/client";
import { bills, cosponsors, members, memberVotes, updateEvents, votes } from "../lib/demo-data";

const prisma = new PrismaClient();

const chamberMap = {
  House: Chamber.HOUSE,
  Senate: Chamber.SENATE
} as const;

const partyMap = {
  Democrat: Party.DEMOCRAT,
  Republican: Party.REPUBLICAN,
  Independent: Party.INDEPENDENT
} as const;

const positionMap = {
  Yes: VotePosition.YES,
  No: VotePosition.NO,
  Present: VotePosition.PRESENT,
  "Not Voting": VotePosition.NOT_VOTING
} as const;

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "demo@capitolledger.local" },
    update: {},
    create: {
      email: "demo@capitolledger.local",
      name: "Demo User"
    }
  });

  for (const member of members) {
    await prisma.member.upsert({
      where: { bioguideId: member.bioguideId },
      update: {
        firstName: member.firstName,
        lastName: member.lastName,
        fullName: member.fullName,
        party: partyMap[member.party],
        state: member.state,
        district: member.district,
        chamber: chamberMap[member.chamber],
        active: member.active,
        photoUrl: member.photoUrl,
        officialUrl: member.officialUrl,
        sourceUrl: member.sourceUrl,
        rawJson: member
      },
      create: {
        bioguideId: member.bioguideId,
        firstName: member.firstName,
        lastName: member.lastName,
        fullName: member.fullName,
        party: partyMap[member.party],
        state: member.state,
        district: member.district,
        chamber: chamberMap[member.chamber],
        active: member.active,
        photoUrl: member.photoUrl,
        officialUrl: member.officialUrl,
        sourceUrl: member.sourceUrl,
        rawJson: member
      }
    });
  }

  for (const bill of bills) {
    await prisma.bill.upsert({
      where: {
        congress_billType_billNumber: {
          congress: bill.congress,
          billType: bill.billType,
          billNumber: bill.billNumber
        }
      },
      update: {
        title: bill.title,
        shortTitle: bill.shortTitle,
        sponsorBioguideId: bill.sponsorBioguideId,
        policyArea: bill.policyArea,
        latestActionText: bill.latestActionText,
        latestActionDate: new Date(bill.latestActionDate),
        summary: bill.summary,
        sourceUrl: bill.sourceUrl,
        rawJson: bill
      },
      create: {
        id: bill.id,
        congress: bill.congress,
        billType: bill.billType,
        billNumber: bill.billNumber,
        title: bill.title,
        shortTitle: bill.shortTitle,
        sponsorBioguideId: bill.sponsorBioguideId,
        policyArea: bill.policyArea,
        latestActionText: bill.latestActionText,
        latestActionDate: new Date(bill.latestActionDate),
        summary: bill.summary,
        sourceUrl: bill.sourceUrl,
        rawJson: bill
      }
    });
  }

  for (const cosponsor of cosponsors) {
    await prisma.cosponsor.upsert({
      where: {
        billId_memberBioguideId: {
          billId: cosponsor.billId,
          memberBioguideId: cosponsor.memberBioguideId
        }
      },
      update: {
        joinedAt: new Date(cosponsor.joinedAt)
      },
      create: {
        billId: cosponsor.billId,
        memberBioguideId: cosponsor.memberBioguideId,
        joinedAt: new Date(cosponsor.joinedAt)
      }
    });
  }

  for (const vote of votes) {
    await prisma.vote.upsert({
      where: {
        congress_chamber_rollCall: {
          congress: vote.congress,
          chamber: chamberMap[vote.chamber],
          rollCall: vote.rollCall
        }
      },
      update: {
        question: vote.question,
        result: vote.result,
        voteDate: new Date(vote.voteDate),
        sourceUrl: vote.sourceUrl,
        billId: vote.billId,
        rawJson: vote
      },
      create: {
        id: vote.id,
        congress: vote.congress,
        chamber: chamberMap[vote.chamber],
        rollCall: vote.rollCall,
        question: vote.question,
        result: vote.result,
        voteDate: new Date(vote.voteDate),
        sourceUrl: vote.sourceUrl,
        billId: vote.billId,
        rawJson: vote
      }
    });
  }

  for (const memberVote of memberVotes) {
    await prisma.memberVote.upsert({
      where: {
        voteId_memberBioguideId: {
          voteId: memberVote.voteId,
          memberBioguideId: memberVote.memberBioguideId
        }
      },
      update: {
        position: positionMap[memberVote.position]
      },
      create: {
        voteId: memberVote.voteId,
        memberBioguideId: memberVote.memberBioguideId,
        position: positionMap[memberVote.position]
      }
    });
  }

  await prisma.follow.upsert({
    where: {
      userId_targetType_targetId: {
        userId: user.id,
        targetType: FollowTargetType.MEMBER,
        targetId: "O000172"
      }
    },
    update: {},
    create: {
      userId: user.id,
      targetType: FollowTargetType.MEMBER,
      targetId: "O000172"
    }
  });

  for (const update of updateEvents) {
    await prisma.updateEvent.upsert({
      where: { id: update.id },
      update: {
        title: update.title,
        body: update.body,
        sourceUrl: update.sourceUrl,
        occurredAt: new Date(update.occurredAt)
      },
      create: {
        id: update.id,
        userId: user.id,
        targetType: update.targetType === "member" ? FollowTargetType.MEMBER : FollowTargetType.BILL,
        targetId: update.targetId,
        title: update.title,
        body: update.body,
        sourceUrl: update.sourceUrl,
        occurredAt: new Date(update.occurredAt)
      }
    });
  }

  console.log("Seeded Capitol Ledger demo data.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
