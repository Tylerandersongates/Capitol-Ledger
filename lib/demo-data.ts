import type { Bill, BillVideo, Cosponsor, Member, MemberVote, UpdateEvent, Vote } from "@/types/capitol";

export const members: Member[] = [
  {
    bioguideId: "O000172",
    firstName: "Alexandria",
    lastName: "Ocasio-Cortez",
    fullName: "Rep. Alexandria Ocasio-Cortez",
    party: "Democrat",
    state: "NY",
    district: "14",
    chamber: "House",
    active: true,
    term: "119th Congress",
    photoUrl: "https://www.congress.gov/img/member/o000172_200.jpg",
    officialUrl: "https://ocasio-cortez.house.gov/",
    sourceUrl: "https://www.congress.gov/member/alexandria-ocasio-cortez/O000172",
    description: "House member from New York with committee, sponsorship, and roll-call records ready for source review."
  },
  {
    bioguideId: "C001098",
    firstName: "Ted",
    lastName: "Cruz",
    fullName: "Sen. Ted Cruz",
    party: "Republican",
    state: "TX",
    chamber: "Senate",
    active: true,
    term: "119th Congress",
    photoUrl: "https://www.congress.gov/img/member/c001098_200.jpg",
    officialUrl: "https://www.cruz.senate.gov/",
    sourceUrl: "https://www.congress.gov/member/ted-cruz/C001098",
    description: "Senator from Texas with recent votes, sponsored legislation, and public record links grouped for inspection."
  },
  {
    bioguideId: "S000033",
    firstName: "Bernard",
    lastName: "Sanders",
    fullName: "Sen. Bernie Sanders",
    party: "Independent",
    state: "VT",
    chamber: "Senate",
    active: true,
    term: "119th Congress",
    photoUrl: "https://www.congress.gov/img/member/s000033_200.jpg",
    officialUrl: "https://www.sanders.senate.gov/",
    sourceUrl: "https://www.congress.gov/member/bernard-sanders/S000033",
    description: "Independent senator from Vermont with issue, sponsorship, and roll-call activity shown in neutral context."
  },
  {
    bioguideId: "M001153",
    firstName: "Lisa",
    lastName: "Murkowski",
    fullName: "Sen. Lisa Murkowski",
    party: "Republican",
    state: "AK",
    chamber: "Senate",
    active: true,
    term: "119th Congress",
    photoUrl: "https://www.congress.gov/img/member/m001153_200.jpg",
    officialUrl: "https://www.murkowski.senate.gov/",
    sourceUrl: "https://www.congress.gov/member/lisa-murkowski/M001153",
    description: "Senator from Alaska included to demonstrate cross-party filtering and chamber-specific vote views."
  }
];

export const bills: Bill[] = [
  {
    id: "demo-hr-4021",
    congress: 119,
    billType: "HR",
    billNumber: "4021",
    displayNumber: "H.R. 4021",
    title: "Civic Data Transparency Act",
    shortTitle: "Civic Data Transparency Act",
    sponsorBioguideId: "O000172",
    policyArea: "Government Operations",
    introducedDate: "2026-04-10",
    committeeName: "House Oversight Committee",
    latestActionText: "Referred to committee for review.",
    latestActionDate: "2026-04-21",
    summary:
      "Generated demo summary: would require machine-readable publication of selected congressional records and status updates.",
    sourceUrl: "https://www.congress.gov/"
  },
  {
    id: "demo-s-1188",
    congress: 119,
    billType: "S",
    billNumber: "1188",
    displayNumber: "S. 1188",
    title: "Border Infrastructure Review Act",
    shortTitle: "Border Infrastructure Review Act",
    sponsorBioguideId: "C001098",
    policyArea: "Homeland Security",
    introducedDate: "2026-03-04",
    committeeName: "Senate Homeland Security Committee",
    latestActionText: "Placed on Senate legislative calendar.",
    latestActionDate: "2026-03-17",
    summary:
      "Generated demo summary: would direct an annual review of border infrastructure projects, costs, and implementation timelines.",
    sourceUrl: "https://www.congress.gov/"
  },
  {
    id: "demo-s-2710",
    congress: 119,
    billType: "S",
    billNumber: "2045",
    displayNumber: "S. 2045",
    title: "Affordable Childcare Act",
    shortTitle: "Affordable Childcare Act",
    sponsorBioguideId: "S000033",
    policyArea: "Health",
    introducedDate: "2026-01-21",
    committeeName: "Senate HELP Committee",
    latestActionText: "Committee hearings held.",
    latestActionDate: "2026-02-06",
    summary:
      "Generated demo summary: would expand childcare affordability grants and require public reporting on access, costs, and workforce stability.",
    sourceUrl: "https://www.congress.gov/"
  },
  {
    id: "demo-s-449",
    congress: 119,
    billType: "S",
    billNumber: "449",
    displayNumber: "S. 449",
    title: "Arctic Resilience and Ports Act",
    shortTitle: "Arctic Resilience and Ports Act",
    sponsorBioguideId: "M001153",
    policyArea: "Transportation and Public Works",
    introducedDate: "2026-01-29",
    committeeName: "Senate Commerce Committee",
    latestActionText: "Reported by committee with amendments.",
    latestActionDate: "2026-04-02",
    summary:
      "Generated demo summary: would authorize planning funds for Arctic port resilience, safety, and supply chain projects.",
    sourceUrl: "https://www.congress.gov/"
  }
];

export const cosponsors: Cosponsor[] = [
  { billId: "demo-hr-4021", memberBioguideId: "S000033", joinedAt: "2026-04-23" },
  { billId: "demo-s-2710", memberBioguideId: "O000172", joinedAt: "2026-02-15" },
  { billId: "demo-s-449", memberBioguideId: "C001098", joinedAt: "2026-04-04" },
  { billId: "demo-s-1188", memberBioguideId: "M001153", joinedAt: "2026-03-20" }
];

export const billVideos: BillVideo[] = [
  {
    id: "video-s-2710-hearing",
    billId: "demo-s-2710",
    title: "Child care assistance oversight hearing archive",
    speaker: "Senate HELP Committee",
    role: "Official hearing source",
    source: "U.S. Senate HELP Committee",
    sourceKind: "Official committee video",
    verifiedAt: "2026-05-19",
    publishedAt: "2026-02-12",
    duration: "Hearing archive",
    videoUrl: "https://www.help.senate.gov/hearings/restoring-integrity-preventing-fraud-in-child-care-assistance-programs",
    type: "Committee Hearing",
    summary: "Official HELP Committee hearing page for child care assistance comments, witnesses, and committee video records."
  },
  {
    id: "video-s-2710-floor",
    billId: "demo-s-2710",
    title: "Senate floor video and Congressional Record source",
    speaker: "U.S. Senate floor",
    role: "Floor remarks source",
    source: "Congress.gov Video",
    sourceKind: "Official floor video",
    verifiedAt: "2026-05-19",
    publishedAt: "2026-04-03",
    duration: "Source feed",
    videoUrl: "https://www.congress.gov/video",
    type: "Floor Speech",
    summary: "Official Congress.gov video destination for floor proceedings and member remarks connected to legislative debate."
  },
  {
    id: "video-hr-4021-floor",
    billId: "demo-hr-4021",
    title: "House floor proceedings video source",
    speaker: "U.S. House floor",
    role: "Floor remarks source",
    source: "HouseLive",
    sourceKind: "Official floor video",
    verifiedAt: "2026-05-19",
    publishedAt: "2026-04-28",
    duration: "Live archive",
    videoUrl: "https://live.house.gov/",
    type: "Floor Speech",
    summary: "Official House floor video destination for proceedings, debate, and public-record transparency remarks."
  },
  {
    id: "video-s-1188-hearing",
    billId: "demo-s-1188",
    title: "Homeland security hearing and oversight archive",
    speaker: "Senate Homeland Security Committee",
    role: "Official hearing source",
    source: "U.S. Senate HSGAC",
    sourceKind: "Official committee video",
    verifiedAt: "2026-05-19",
    publishedAt: "2026-03-17",
    duration: "Hearing archive",
    videoUrl: "https://www.hsgac.senate.gov/hearings/",
    type: "Committee Hearing",
    summary: "Official Senate homeland security hearing archive for oversight comments, testimony, and implementation discussions."
  },
  {
    id: "video-s-1188-floor",
    billId: "demo-s-1188",
    title: "Senate roll-call and debate source",
    speaker: "U.S. Senate floor",
    role: "Vote and debate source",
    source: "U.S. Senate Roll Call Votes",
    sourceKind: "Official vote record",
    verifiedAt: "2026-05-19",
    publishedAt: "2026-03-24",
    duration: "Source feed",
    videoUrl: "https://www.senate.gov/legislative/votes_new.htm",
    type: "Public Statement",
    summary: "Official Senate voting source for roll-call context, floor action, and follow-up debate references."
  },
  {
    id: "video-s-449-hearing",
    billId: "demo-s-449",
    title: "U.S. maritime investments in the Arctic field hearing",
    speaker: "Senate Commerce Committee",
    role: "Official hearing source",
    source: "U.S. Senate Commerce Committee",
    sourceKind: "Official committee video",
    verifiedAt: "2026-05-19",
    publishedAt: "2026-02-20",
    duration: "Hearing archive",
    videoUrl: "https://www.commerce.senate.gov/meetings/subcommittee-field-hearing-on-u-s-maritime-investments-in-the-arctic/",
    type: "Committee Hearing",
    summary: "Official Commerce Committee field hearing source for Arctic infrastructure, maritime investment, and port resilience discussion."
  }
];

export const votes: Vote[] = [
  {
    id: "demo-vote-house-142",
    congress: 119,
    chamber: "House",
    rollCall: "142",
    question: "On passage of H.R. 4021",
    result: "Passed",
    voteDate: "2026-04-28",
    yesCount: 228,
    noCount: 206,
    presentCount: 0,
    notVotingCount: 1,
    billId: "demo-hr-4021",
    explanation: "Generated demo explanation: the vote advanced a public-records transparency bill out of the House.",
    sourceUrl: "https://clerk.house.gov/Votes"
  },
  {
    id: "demo-vote-senate-68",
    congress: 119,
    chamber: "Senate",
    rollCall: "68",
    question: "On cloture for S. 1188",
    result: "Cloture rejected",
    voteDate: "2026-03-24",
    yesCount: 46,
    noCount: 51,
    presentCount: 0,
    notVotingCount: 3,
    billId: "demo-s-1188",
    explanation: "Generated demo explanation: the motion would have limited debate and moved the bill closer to final passage.",
    sourceUrl: "https://www.senate.gov/legislative/votes_new.htm"
  },
  {
    id: "demo-vote-senate-77",
    congress: 119,
    chamber: "Senate",
    rollCall: "77",
    question: "On amendment to S. 2045",
    result: "Agreed to",
    voteDate: "2026-04-03",
    yesCount: 64,
    noCount: 28,
    presentCount: 0,
    notVotingCount: 8,
    billId: "demo-s-2710",
    explanation: "Generated demo explanation: the amendment added reporting requirements for rural health grant recipients.",
    sourceUrl: "https://www.senate.gov/legislative/votes_new.htm"
  }
];

export const memberVotes: MemberVote[] = [
  { voteId: "demo-vote-house-142", memberBioguideId: "O000172", position: "Yes" },
  { voteId: "demo-vote-senate-68", memberBioguideId: "C001098", position: "Yes" },
  { voteId: "demo-vote-senate-68", memberBioguideId: "S000033", position: "No" },
  { voteId: "demo-vote-senate-68", memberBioguideId: "M001153", position: "Present" },
  { voteId: "demo-vote-senate-77", memberBioguideId: "C001098", position: "No" },
  { voteId: "demo-vote-senate-77", memberBioguideId: "S000033", position: "Yes" },
  { voteId: "demo-vote-senate-77", memberBioguideId: "M001153", position: "Yes" }
];

export const updateEvents: UpdateEvent[] = [
  {
    id: "event-1",
    targetType: "bill",
    targetId: "demo-hr-4021",
    title: "Bill advanced",
    body: "H.R. 4021 received a recorded House vote in the demo ledger.",
    occurredAt: "2026-04-28",
    sourceUrl: "https://clerk.house.gov/Votes"
  },
  {
    id: "event-2",
    targetType: "member",
    targetId: "S000033",
    title: "New recorded vote",
    body: "A Senate amendment vote was added to the member activity feed.",
    occurredAt: "2026-04-03",
    sourceUrl: "https://www.senate.gov/legislative/votes_new.htm"
  },
  {
    id: "event-3",
    targetType: "bill",
    targetId: "demo-s-449",
    title: "Committee action",
    body: "The Arctic Resilience and Ports Act was reported by committee with amendments.",
    occurredAt: "2026-04-02",
    sourceUrl: "https://www.congress.gov/"
  }
];
