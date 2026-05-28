export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}

export function partyInitial(party: string) {
  if (party === "Democrat") return "D";
  if (party === "Republican") return "R";
  if (party === "Independent") return "I";
  return "?";
}

export function positionTone(position: string) {
  if (position === "Yes") return "bg-civic/15 text-aurora";
  if (position === "No") return "bg-rust/15 text-rust";
  if (position === "Present") return "bg-brass/15 text-brass";
  return "bg-white/10 text-blue-100";
}
