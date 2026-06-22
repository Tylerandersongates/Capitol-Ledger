"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Vote } from "lucide-react";
import { useGamificationSnapshot } from "@/components/gamification-live-stats";
import { MobileCard } from "@/components/mobile-ui";
import { setGamificationEventCount } from "@/lib/browser-gamification";
import { getGamificationEventRule } from "@/lib/gamification";

type ElectionEntry = {
  id: string;
  label: string;
  type: "General" | "Primary" | "Runoff" | "Special";
};

const electionLogEntries: ElectionEntry[] = [
  { id: "2026-primary", label: "2026 Primary Election", type: "Primary" },
  { id: "2026-general", label: "2026 General Election", type: "General" },
  { id: "2026-runoff", label: "2026 Runoff Election", type: "Runoff" },
  { id: "2027-district-special", label: "2027 District Special Election", type: "Special" },
  { id: "2028-primary", label: "2028 Primary Election", type: "Primary" },
  { id: "2028-general", label: "2028 General Election", type: "General" }
];

const electionParticipationKey = "capitol-ledger:election-participation-ids";
const electionEvent = "participate-election";
const totalElectionCount = electionLogEntries.length;
const electionBadgeProgress = getGamificationEventRule(electionEvent)?.badgeProgress ?? [];
const voterElectionGoal = electionBadgeProgress.find((progress) => progress.badgeId === "voter")?.threshold ?? 4;
const ballotVeteranElectionGoal = getGamificationEventRule(electionEvent)?.badgeProgress.find((progress) => progress.badgeId === "ballot-veteran")?.threshold ?? 5;
const superVoterElectionGoal = electionBadgeProgress.find((progress) => progress.badgeId === "super-voter")?.threshold ?? totalElectionCount;
const electionBadgeMilestones = [
  { label: "Voter Badge", threshold: voterElectionGoal },
  { label: "Ballot Veteran", threshold: ballotVeteranElectionGoal },
  { label: "Super Voter", threshold: superVoterElectionGoal }
];

function readStoredElectionIds() {
  if (typeof window === "undefined") return [];

  try {
    const raw = JSON.parse(window.localStorage.getItem(electionParticipationKey) ?? "[]");
    if (!Array.isArray(raw)) return [];

    const validIds = new Set(electionLogEntries.map((entry) => entry.id));
    return Array.from(new Set(raw.filter((value): value is string => typeof value === "string" && validIds.has(value))));
  } catch {
    return [];
  }
}

function writeStoredElectionIds(ids: string[]) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(electionParticipationKey, JSON.stringify(ids));
  } catch {
    return;
  }
}

function pillTone(type: ElectionEntry["type"]) {
  if (type === "Primary") return "border-[#79a8ff]/40 bg-[#79a8ff]/14 text-[#79a8ff]";
  if (type === "General") return "border-[#ffbd39]/45 bg-[#ffbd39]/14 text-[#ffbd39]";
  if (type === "Runoff") return "border-[#d18bff]/45 bg-[#d18bff]/14 text-[#d18bff]";
  return "border-[#43ed74]/40 bg-[#43ed74]/14 text-[#43ed74]";
}

function nextElectionBadgeMessage(electionCount: number) {
  const nextMilestone = electionBadgeMilestones.find((milestone) => electionCount < milestone.threshold);

  if (nextMilestone) {
    const remainingElections = nextMilestone.threshold - electionCount;
    return `${remainingElections} more unique election${remainingElections === 1 ? "" : "s"} to unlock ${nextMilestone.label}.`;
  }

  return "All election participation badges unlocked.";
}

export function ElectionParticipationCard() {
  const snapshot = useGamificationSnapshot();
  const [loggedElectionIds, setLoggedElectionIds] = useState<string[]>([]);
  const [hasInitializedSelection, setHasInitializedSelection] = useState(false);
  const [status, setStatus] = useState("");
  const snapshotElectionCount = useMemo(
    () => snapshot.eventCounts.find((record) => record.event === "participate-election")?.count ?? 0,
    [snapshot.eventCounts]
  );
  const electionCount = loggedElectionIds.length;

  useEffect(() => {
    if (hasInitializedSelection) return;

    const persisted = readStoredElectionIds();
    if (persisted.length > 0) {
      setLoggedElectionIds(persisted);
      setHasInitializedSelection(true);
      return;
    }

    if (snapshotElectionCount <= 0) return;
    const seeded = electionLogEntries.slice(0, Math.min(snapshotElectionCount, electionLogEntries.length)).map((entry) => entry.id);
    writeStoredElectionIds(seeded);
    setLoggedElectionIds(seeded);
    setHasInitializedSelection(true);
  }, [hasInitializedSelection, snapshotElectionCount]);

  function applyElectionSelection(nextIds: string[]) {
    setHasInitializedSelection(true);
    const nextUniqueIds = Array.from(new Set(nextIds));
    writeStoredElectionIds(nextUniqueIds);
    setLoggedElectionIds(nextUniqueIds);
    setGamificationEventCount(electionEvent, nextUniqueIds.length);
  }

  function toggleElectionSelection(entry: ElectionEntry) {
    const isLogged = loggedElectionIds.includes(entry.id);
    if (isLogged) {
      try {
        const nextIds = loggedElectionIds.filter((id) => id !== entry.id);
        applyElectionSelection(nextIds);
        setStatus(`Removed: ${entry.label}`);
      } catch {
        setStatus("Could not update this election right now. Please try again.");
      }
      return;
    }

    try {
      const nextIds = [...loggedElectionIds, entry.id];
      applyElectionSelection(nextIds);
      setStatus(`Logged: ${entry.label}`);
    } catch {
      setStatus("Could not update this election right now. Please try again.");
    }
  }

  return (
    <div id="election-participation">
      <MobileCard variant="dashboard" className="px-5 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Vote className="h-5 w-5 text-[#ffbd39]" strokeWidth={1.8} aria-hidden="true" />
            <h2 className="text-[21px] font-medium leading-none">Election Participation</h2>
          </div>
          <div className="rounded-full border border-white/12 bg-white/[0.06] px-3 py-1 text-[12px] font-medium text-white/76">
            {electionCount}/{totalElectionCount}
          </div>
        </div>

        <p className="mt-3 text-[13px] leading-relaxed text-white/58">
          Count primary, general, runoff, and special elections toward Voter, Ballot Veteran, and Super Voter badges.
        </p>
        <p className="mt-1 text-[11px] uppercase tracking-[0.05em] text-white/42">
          Tap once to log an election. Tap a logged row again to remove it.
        </p>

        <div className="mt-4 grid gap-2">
          {electionLogEntries.map((entry) => {
            const isLogged = loggedElectionIds.includes(entry.id);
            const rowClassName = isLogged
              ? "border-[#43ed74]/42 bg-[#43ed74]/12 shadow-[0_0_16px_rgba(67,237,116,0.16)]"
              : "border-white/10 bg-white/[0.03]";

            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => toggleElectionSelection(entry)}
                className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-left transition hover:bg-white/[0.06] ${rowClassName}`}
              >
                <span className="flex items-center gap-2">
                  {isLogged ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-[#43ed74]" strokeWidth={2} aria-hidden="true" />
                  ) : (
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-white/28" aria-hidden="true" />
                  )}
                  <span className="truncate text-[14px] text-white/78">{entry.label}</span>
                </span>
                <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.05em] ${pillTone(entry.type)}`}>
                  {entry.type}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex items-start gap-2 rounded-xl border border-[#43ed74]/20 bg-[#43ed74]/8 px-3 py-2 text-[12px] text-[#8ef8af]">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.9} aria-hidden="true" />
          <span>
            <span className="block">{nextElectionBadgeMessage(electionCount)}</span>
            {status ? <span className="mt-1 block text-white/48">{status}</span> : null}
          </span>
        </div>
      </MobileCard>
    </div>
  );
}
