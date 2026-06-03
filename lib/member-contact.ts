import type { Member } from "@/types/capitol";

function safeUrl(input?: string | null) {
  if (!input) return null;

  try {
    return new URL(input);
  } catch {
    return null;
  }
}

function chamberContactPath(member: Member) {
  if (member.chamber === "House") return "contact/email";
  return "contact";
}

export function resolveOfficialContactUrl(member: Member) {
  const officialUrl = safeUrl(member.officialUrl);
  if (officialUrl) {
    const contactCandidate = new URL(chamberContactPath(member), officialUrl).toString();
    return contactCandidate;
  }

  const sourceUrl = safeUrl(member.sourceUrl);
  return sourceUrl?.toString() ?? "https://www.congress.gov/";
}

export function contactSubjectForMember(member: Member) {
  const chamberLabel = member.chamber === "House" ? "Representative" : "Senator";
  return `Constituent message for ${chamberLabel} ${member.fullName}`;
}
