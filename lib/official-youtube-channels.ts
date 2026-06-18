import type { Chamber } from "../types/capitol";

export type OfficialYoutubeChannelVerificationStatus = "verified" | "needs-review";

export type OfficialYoutubeChannel = {
  memberBioguideId: string;
  officialName: string;
  chamber: Chamber;
  channelId?: string;
  youtubeUsername?: string;
  youtubeHandle?: string;
  channelUrl: string;
  verificationSourceUrl: string;
  verifiedAt: string;
  verificationStatus: OfficialYoutubeChannelVerificationStatus;
  sourceNotes: string;
};

const officialYoutubeChannels = [
  {
    memberBioguideId: "C001098",
    officialName: "Sen. Ted Cruz",
    chamber: "Senate",
    channelId: "UCOTZ-6H1rri1lSsj6IzhUyw",
    channelUrl: "https://www.youtube.com/channel/UCOTZ-6H1rri1lSsj6IzhUyw",
    verificationSourceUrl: "https://www.cruz.senate.gov/",
    verifiedAt: "2026-06-18",
    verificationStatus: "verified",
    sourceNotes: "Official Senate site links directly to this YouTube channel."
  },
  {
    memberBioguideId: "S000033",
    officialName: "Sen. Bernie Sanders",
    chamber: "Senate",
    youtubeUsername: "senatorsanders",
    channelUrl: "https://www.youtube.com/senatorsanders",
    verificationSourceUrl: "https://www.sanders.senate.gov/",
    verifiedAt: "2026-06-18",
    verificationStatus: "verified",
    sourceNotes: "Official Senate site links directly to this YouTube username URL."
  },
  {
    memberBioguideId: "W000817",
    officialName: "Sen. Elizabeth Warren",
    chamber: "Senate",
    youtubeUsername: "senelizabethwarren",
    channelUrl: "https://www.youtube.com/senelizabethwarren",
    verificationSourceUrl: "https://www.warren.senate.gov/",
    verifiedAt: "2026-06-18",
    verificationStatus: "verified",
    sourceNotes: "Official Senate site links directly to this YouTube username URL."
  },
  {
    memberBioguideId: "M001157",
    officialName: "Rep. Michael McCaul",
    chamber: "House",
    youtubeUsername: "MichaelTMcCaul",
    channelUrl: "https://www.youtube.com/user/MichaelTMcCaul",
    verificationSourceUrl: "https://mccaul.house.gov/",
    verifiedAt: "2026-06-18",
    verificationStatus: "verified",
    sourceNotes: "Official House site links directly to this YouTube user URL."
  },
  {
    memberBioguideId: "S001184",
    officialName: "Sen. Tim Scott",
    chamber: "Senate",
    youtubeUsername: "SenatorTimScott",
    channelUrl: "https://www.youtube.com/SenatorTimScott",
    verificationSourceUrl: "https://www.scott.senate.gov/",
    verifiedAt: "2026-06-18",
    verificationStatus: "verified",
    sourceNotes: "Official Senate site links directly to this YouTube channel URL."
  },
  {
    memberBioguideId: "S001198",
    officialName: "Sen. Dan Sullivan",
    chamber: "Senate",
    channelId: "UC7tXCm8gKlAhTFo2kuf5ylw",
    channelUrl: "https://www.youtube.com/channel/UC7tXCm8gKlAhTFo2kuf5ylw",
    verificationSourceUrl: "https://www.sullivan.senate.gov/",
    verifiedAt: "2026-06-18",
    verificationStatus: "verified",
    sourceNotes: "Official Senate site footer links directly to this YouTube channel."
  },
  {
    memberBioguideId: "W000790",
    officialName: "Sen. Raphael Warnock",
    chamber: "Senate",
    youtubeUsername: "senatorwarnock",
    channelUrl: "https://www.youtube.com/senatorwarnock",
    verificationSourceUrl: "https://www.warnock.senate.gov/",
    verifiedAt: "2026-06-18",
    verificationStatus: "verified",
    sourceNotes: "Official Senate site links directly to this YouTube channel URL."
  }
] as const satisfies readonly OfficialYoutubeChannel[];

export function getOfficialYoutubeChannels() {
  return [...officialYoutubeChannels];
}

export function getOfficialYoutubeChannelForMember(memberBioguideId: string) {
  return officialYoutubeChannels.find((channel) => channel.memberBioguideId === memberBioguideId);
}

export function getOfficialYoutubeChannelsForMembers(memberBioguideIds: string[]) {
  const requestedMemberIds = new Set(memberBioguideIds);
  return officialYoutubeChannels.filter((channel) => requestedMemberIds.has(channel.memberBioguideId));
}
