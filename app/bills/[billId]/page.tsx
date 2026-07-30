import { MobileShell } from "@/components/mobile-shell";
import { BillStanceControl } from "@/components/bill-stance-controls";
import { GamificationEventAnchor } from "@/components/gamification-actions";
import { MobileBottomNav, MobileCard, mobileIconButtonClass, mobileViewAllClass } from "@/components/mobile-ui";
import { MobileGlassScrollFrame } from "@/components/mobile-glass-scroll-frame";
import { BillVoteMemberBreakdown } from "@/components/bill-vote-member-breakdown";
import { HistoryBackButton } from "@/components/history-back-button";
import { SaveTargetButton } from "@/components/saved-ledger-controls";
import { PlanFeatureGate } from "@/components/subscription-controls";
import { VoteSpreadPanel } from "@/components/vote-spread-panel";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactElement, ReactNode } from "react";
import {
  ArrowLeft,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  ExternalLink,
  FileCheck2,
  FileClock,
  FilePenLine,
  FileText,
  Home,
  Link2,
  MessageSquareText,
  PlayCircle,
  Search,
  ShieldCheck,
  Share2,
  Sparkles,
  UsersRound,
  Settings,
  Vote as VoteIcon,
  type LucideIcon
} from "lucide-react";
import { resolveAiBillAnalysis } from "@/lib/ai-bill-analysis-agent";
import type { AiBillAnalysis } from "@/lib/ai-policy-lens";
import { isBillLawActionText } from "@/lib/bill-status";
import { getBillDetailWithLiveData, getBillSummary, getBillStatus, getVoteTotals } from "@/lib/data";
import { getCurrentEffectiveAccountSubscription } from "@/lib/effective-account-subscription";
import { isPlanFeatureEnabled } from "@/lib/subscription-plans";
import { formatDate } from "@/lib/utils";
import type { BillSummaryResolution, VoteMemberPositionRecord } from "@/lib/data";
import type { Bill, BillAction, BillSourceMatch, BillVideo, Member, Vote } from "@/types/capitol";

type BillPageProps = {
  params: Promise<{
    billId: string;
  }>;
  searchParams?: Promise<{
    tab?: string;
  }>;
};

type BillTab = "overview" | "votes" | "timeline" | "details";
type ProgressStep = {
  date: string;
  detail?: string;
  icon: LucideIcon;
  label: string;
  state?: "complete" | "current" | "pending";
};
type BillVoteKind = "Final Passage" | "Veto Override" | "Amendment" | "Procedural" | "Committee" | "Recorded Vote";
type BillVoteEvent = {
  detailHref?: string;
  detailLabel?: string;
  impact: string;
  kind: BillVoteKind;
  positions: VoteMemberPositionRecord[];
  score: number;
  sourceAction?: BillAction;
  sourceType: "linked-vote" | "official-action";
  totals: ReturnType<typeof getVoteTotals>;
  vote: Vote;
  voteLabel: string;
};

const billTabs: Array<{ label: string; value: BillTab }> = [
  { label: "Overview", value: "overview" },
  { label: "Votes", value: "votes" },
  { label: "Timeline", value: "timeline" },
  { label: "Details", value: "details" }
];

export const dynamic = "force-dynamic";

function normalizeTab(tab?: string): BillTab {
  return tab === "votes" || tab === "timeline" || tab === "details" ? tab : "overview";
}

function tabHref(billId: string, tab: BillTab) {
  return tab === "overview" ? `/bills/${billId}` : `/bills/${billId}?tab=${tab}`;
}

function billOriginChamber(billType: string) {
  const normalizedType = billType.toUpperCase();
  if (normalizedType.startsWith("H")) return "House" as const;
  if (normalizedType.startsWith("S")) return "Senate" as const;
  return undefined;
}

function receivingChamberFor(originChamber: "House" | "Senate") {
  return originChamber === "House" ? "Senate" : "House";
}

function lowerIncludes(value: string, phrase: string) {
  return value.toLowerCase().includes(phrase.toLowerCase());
}

function isOriginPassageVote(vote: Vote, originChamber: "House" | "Senate") {
  const result = vote.result.toLowerCase();
  const question = vote.question.toLowerCase();
  return vote.chamber === originChamber && (result.includes("passed") || question.includes("passage"));
}

function hasCrossChamberAction({
  actionText,
  originChamber,
  originPassageVote,
  receivingChamber
}: {
  actionText: string;
  originChamber: "House" | "Senate";
  originPassageVote?: Vote;
  receivingChamber: "House" | "Senate";
}) {
  const action = actionText.toLowerCase();
  const receivingName = receivingChamber.toLowerCase();
  const receivedByOtherChamber = action.includes(`received in the ${receivingName}`) || action.includes(`received in ${receivingName}`);
  const referredInOtherChamber =
    action.includes(`referred to the ${receivingName}`) ||
    action.includes(`${receivingName} committee`) ||
    (receivingChamber === "Senate" && action.includes("read twice") && action.includes("referred"));
  const receivingSignal =
    action.includes(receivingName) || receivedByOtherChamber || referredInOtherChamber;
  const originPassageSignal =
    Boolean(originPassageVote) ||
    action.includes(`passed the ${originChamber.toLowerCase()}`) ||
    action.includes(`${originChamber.toLowerCase()} passage`);

  return receivingSignal && (originPassageSignal || receivedByOtherChamber || referredInOtherChamber);
}

function crossChamberStepLabel(actionText: string, receivingChamber: "House" | "Senate") {
  if (lowerIncludes(actionText, "referred") || lowerIncludes(actionText, "committee")) return `Referred to ${receivingChamber} committee`;
  if (lowerIncludes(actionText, `received in the ${receivingChamber}`)) return `Received in ${receivingChamber}`;
  return `${receivingChamber} action`;
}

function resolveProgressStepIndex(actionText: string, status: string, stepCount: number) {
  const action = actionText.toLowerCase();
  const normalizedStatus = status.toLowerCase();

  if (isBillLawActionText(action) || normalizedStatus === "enacted") return stepCount - 1;
  if (action.includes("passed") || action.includes("agreed to") || normalizedStatus === "passed") return Math.max(0, stepCount - 2);
  if (isFloorActionText(action)) return Math.min(stepCount - 1, 5);
  if (action.includes("calendar") || action.includes("placed on")) return Math.min(stepCount - 1, 4);
  if (action.includes("reported") || action.includes("ordered to be reported") || action.includes("committee report")) return Math.min(stepCount - 1, 3);
  if (action.includes("hearing") || action.includes("markup") || action.includes("committee") || action.includes("subcommittee")) return Math.min(stepCount - 1, 2);
  if (action.includes("referred") || action.includes("received in")) return Math.min(stepCount - 1, 1);

  return 0;
}

function isFloorActionText(action: string) {
  return (
    action.includes("floor") ||
    action.includes("roll call") ||
    action.includes("vote") ||
    action.includes("debate") ||
    action.includes("considered under") ||
    action.includes("rule provides for consideration") ||
    action.includes("motion to recommit")
  );
}

function progressStepState(index: number, currentIndex: number): ProgressStep["state"] {
  if (index < currentIndex) return "complete";
  if (index === currentIndex) return "current";
  return "pending";
}

function buildBillProgressSteps(bill: Bill, billVotes: Vote[], status: string): ProgressStep[] {
  const introducedDate = bill.introducedDate;
  const originChamber = billOriginChamber(bill.billType);

  if (originChamber) {
    const receivingChamber = receivingChamberFor(originChamber);
    const originPassageVote = billVotes.find((vote) => isOriginPassageVote(vote, originChamber));
    const crossChamberAction = hasCrossChamberAction({
      actionText: bill.latestActionText,
      originChamber,
      originPassageVote,
      receivingChamber
    });

    if (crossChamberAction) {
      const receivingLabel = crossChamberStepLabel(bill.latestActionText, receivingChamber);
      const originPassageDetail = originPassageVote
        ? `${bill.displayNumber} cleared the ${originChamber} before moving to the ${receivingChamber}.`
        : `${bill.displayNumber} could not move to the ${receivingChamber} without clearing the ${originChamber}; a linked roll-call for that step is not available yet.`;
      const currentIndex = 4;

      return [
        { label: `Introduced in ${originChamber}`, date: introducedDate ? formatDate(introducedDate) : "", icon: FileCheck2, state: progressStepState(0, currentIndex) },
        {
          label: `${originChamber} committee`,
          date: introducedDate ? formatDate(introducedDate) : "",
          icon: FileText,
          detail: `Initial review started in the ${originChamber}, where this ${bill.displayNumber} originated.`,
          state: progressStepState(1, currentIndex)
        },
        {
          label: `Passed ${originChamber}`,
          date: originPassageVote ? formatDate(originPassageVote.voteDate) : "",
          icon: FileCheck2,
          detail: originPassageDetail,
          state: progressStepState(2, currentIndex)
        },
        {
          label: `Sent to ${receivingChamber}`,
          date: formatDate(bill.latestActionDate),
          icon: FileClock,
          detail: `After ${originChamber} passage, ${bill.displayNumber} moved to the ${receivingChamber} for the next stage.`,
          state: progressStepState(3, currentIndex)
        },
        {
          label: receivingLabel,
          date: formatDate(bill.latestActionDate),
          icon: FileClock,
          detail: bill.committeeName
            ? `${originChamber} passage is complete; current activity is now tied to ${bill.committeeName}.`
            : `${originChamber} passage is complete; current activity is now in the ${receivingChamber}.`,
          state: progressStepState(4, currentIndex)
        },
        { label: "Final passage", date: "", icon: FilePenLine, state: progressStepState(5, currentIndex) },
        { label: "Enacted", date: status === "Enacted" ? formatDate(bill.latestActionDate) : "", icon: FileCheck2, state: progressStepState(6, currentIndex) }
      ];
    }
  }

  const labels: Array<Omit<ProgressStep, "date" | "state">> = [
    { label: originChamber ? `Introduced in ${originChamber}` : "Introduced", icon: FileCheck2 },
    { label: "Referred to Committee", icon: FileText },
    { label: "Committee Review", icon: FileClock, detail: bill.committeeName ? `Currently tied to ${bill.committeeName}.` : "Committee assignment or hearing activity appears here when available." },
    { label: "Reported", icon: FilePenLine },
    { label: "Calendar", icon: CalendarDays },
    { label: "Floor Action", icon: VoteIcon },
    { label: "Passed Chamber", icon: FileCheck2 },
    { label: "Enacted", icon: FileCheck2 }
  ];
  const currentIndex = resolveProgressStepIndex(bill.latestActionText, status, labels.length);

  return labels.map((step, index) => ({
    ...step,
    date: index === 0 ? (introducedDate ? formatDate(introducedDate) : "") : index === currentIndex ? formatDate(bill.latestActionDate) : "",
    detail: index === currentIndex ? bill.latestActionText : step.detail,
    state: progressStepState(index, currentIndex)
  }));
}

function voteActionKey(chamber?: string, rollCall?: string) {
  return chamber && rollCall ? `${chamber.toLowerCase()}:${rollCall}` : "";
}

function voteActionEventKey(action: BillAction) {
  return voteActionKey(action.chamber, action.rollCall) || `action:${action.id}`;
}

function parseActionVoteCounts(actionText: string) {
  const countMatch =
    actionText.match(/(?:yeas? and nays?|ayes? and noes?|yea-nay vote|recorded vote)[^0-9]*(\d+)\s*[-–]\s*(\d+)/i) ??
    actionText.match(/:\s*(\d+)\s*[-–]\s*(\d+)\s*\(/);

  if (!countMatch) return undefined;

  return {
    no: Number(countMatch[2]),
    yes: Number(countMatch[1])
  };
}

function resultFromActionVote(actionText: string) {
  const normalized = actionText.toLowerCase();
  if (normalized.includes("ordered to be reported")) return "Ordered Reported";
  if (normalized.includes("passed")) return "Passed";
  if (normalized.includes("agreed to")) return "Agreed";
  if (normalized.includes("failed")) return "Failed";
  if (normalized.includes("rejected")) return "Rejected";
  return "Recorded";
}

function questionFromActionVote(actionText: string) {
  return actionText
    .replace(/\s*\(Roll no\.\s*\d+\)\.?/i, "")
    .replace(/\s*\(text:\s*[^)]+\)/gi, "")
    .trim();
}

function buildActionVoteEvent(bill: Bill, action: BillAction): BillVoteEvent {
  const counts = parseActionVoteCounts(action.action);
  const chamber = action.chamber ?? billOriginChamber(bill.billType) ?? "House";
  const voteLabel = action.rollCall ? `${chamber} Roll Call ${action.rollCall}` : `${chamber} Action Vote`;
  const vote: Vote = {
    billId: bill.id,
    chamber,
    congress: bill.congress,
    explanation: `Extracted from the official action log for ${bill.displayNumber}.`,
    id: action.linkedVoteId ?? `${bill.id}-action-vote-${action.id}`,
    noCount: counts?.no,
    notVotingCount: undefined,
    presentCount: undefined,
    question: questionFromActionVote(action.action),
    result: resultFromActionVote(action.action),
    rollCall: action.rollCall ?? "Pending",
    sourceUrl: action.sourceUrl ?? bill.sourceUrl,
    voteDate: action.date,
    yesCount: counts?.yes
  };
  const kind = classifyBillVote(vote);

  return {
    detailHref: action.linkedVoteId ? `/votes/${action.linkedVoteId}` : action.sourceUrl,
    detailLabel: action.linkedVoteId ? "Open vote" : "Open source",
    impact: `From official action: ${action.action}`,
    kind,
    positions: [],
    score: getBillVoteScore(vote, kind),
    sourceAction: action,
    sourceType: "official-action",
    totals: getVoteTotals(vote),
    vote,
    voteLabel
  };
}

function actionTimestampValue(action?: BillAction) {
  if (!action) return 0;
  const timestamp = Date.parse(action.occurredAt || action.date);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function voteEventTimestampValue(event: BillVoteEvent) {
  const actionTimestamp = actionTimestampValue(event.sourceAction);
  if (actionTimestamp) return actionTimestamp;
  const voteTimestamp = Date.parse(event.vote.voteDate);
  return Number.isFinite(voteTimestamp) ? voteTimestamp : 0;
}

function buildBillVoteEvents(bill: Bill, billVotes: Vote[], billActions: BillAction[], voteMemberPositionsByVoteId: Record<string, VoteMemberPositionRecord[]>): BillVoteEvent[] {
  const voteActions = billActions.filter((action) => action.kind === "Vote" && (action.rollCall || parseActionVoteCounts(action.action)));
  const actionsByLinkedVoteId = new Map<string, BillAction>();
  const actionsByVoteKey = new Map<string, BillAction>();
  const syncedVoteIds = new Set(billVotes.map((vote) => vote.id));
  const eventsByVoteKey = new Map<string, BillVoteEvent>();

  voteActions.forEach((action) => {
    if (action.linkedVoteId) actionsByLinkedVoteId.set(action.linkedVoteId, action);
    const key = voteActionKey(action.chamber, action.rollCall);
    if (key) actionsByVoteKey.set(key, action);
  });

  billVotes.forEach((vote) => {
    const kind = classifyBillVote(vote);
    const sourceAction = actionsByLinkedVoteId.get(vote.id) ?? actionsByVoteKey.get(voteActionKey(vote.chamber, vote.rollCall));
    const event: BillVoteEvent = {
      detailHref: `/votes/${vote.id}`,
      detailLabel: "Open vote",
      impact: sourceAction ? `From official action: ${sourceAction.action}` : explainBillVoteImpact(bill, vote, kind),
      kind,
      positions: voteMemberPositionsByVoteId[vote.id] ?? [],
      score: getBillVoteScore(vote, kind),
      sourceAction,
      sourceType: "linked-vote",
      totals: getVoteTotals(vote),
      vote,
      voteLabel: `${vote.chamber} Roll Call ${vote.rollCall}`
    };

    eventsByVoteKey.set(voteActionKey(vote.chamber, vote.rollCall), event);
  });

  voteActions.forEach((action) => {
    if (action.linkedVoteId && syncedVoteIds.has(action.linkedVoteId)) return;
    const key = voteActionEventKey(action);
    if (eventsByVoteKey.has(key)) return;
    eventsByVoteKey.set(key, buildActionVoteEvent(bill, action));
  });

  return [...eventsByVoteKey.values()].sort((left, right) => voteEventTimestampValue(left) - voteEventTimestampValue(right));
}

function selectOverviewVoteEvent(bill: Bill, voteEvents: BillVoteEvent[], status: string) {
  if (!voteEvents.length) return undefined;

  const lawTimestamp = Date.parse(bill.latestActionDate);
  const candidates = voteEvents.filter((event) => {
    if (!Number.isFinite(lawTimestamp)) return true;
    return Date.parse(event.vote.voteDate) <= lawTimestamp;
  });
  const eligibleEvents = candidates.length ? candidates : voteEvents;
  const substantiveEvents = eligibleEvents.filter((event) => event.kind !== "Procedural");
  const decisivePool = status === "Enacted" || status === "Passed" ? substantiveEvents : substantiveEvents.length ? substantiveEvents : eligibleEvents;

  return [...(decisivePool.length ? decisivePool : eligibleEvents)].sort((left, right) => {
    const scoreDelta = right.score - left.score;
    if (scoreDelta) return scoreDelta;
    return Date.parse(right.vote.voteDate) - Date.parse(left.vote.voteDate);
  })[0];
}

function classifyBillVote(vote: Vote): BillVoteKind {
  const text = `${vote.question} ${vote.result}`.toLowerCase();

  if (text.includes("veto") && text.includes("override")) return "Veto Override";
  if (text.includes("amendment") || text.includes("amdt")) return "Amendment";
  if (text.includes("committee") || text.includes("ordered to be reported")) return "Committee";
  if (text.includes("passage") || text.includes("passed") || text.includes("on passage") || text.includes("final passage")) return "Final Passage";
  if (text.includes("motion") || text.includes("rule") || text.includes("table") || text.includes("previous question") || text.includes("cloture")) return "Procedural";
  return "Recorded Vote";
}

function getBillVoteScore(vote: Vote, kind: BillVoteKind) {
  const text = `${vote.question} ${vote.result}`.toLowerCase();
  let score = 20;

  if (kind === "Final Passage") score += 80;
  if (kind === "Veto Override") score += 78;
  if (kind === "Recorded Vote") score += 50;
  if (kind === "Committee") score += 40;
  if (kind === "Amendment") score += 28;
  if (kind === "Procedural") score += 12;
  if (text.includes("passed") || text.includes("agreed to")) score += 18;
  if (text.includes("failed") || text.includes("rejected")) score -= 10;

  return score;
}

function explainBillVoteImpact(bill: Bill, vote: Vote, kind: BillVoteKind) {
  if (kind === "Final Passage") return `This ${vote.chamber} vote is the main recorded vote tied to ${bill.displayNumber}.`;
  if (kind === "Veto Override") return "This vote would decide whether Congress overrides a presidential veto.";
  if (kind === "Amendment") return "This vote changed, or tried to change, the bill before a final decision.";
  if (kind === "Committee") return "This vote happened in committee before the full chamber took it up.";
  if (kind === "Procedural") return "This vote affected whether the chamber could keep moving the bill forward.";
  return "This vote is part of the bill history and helps explain how lawmakers acted.";
}

function getOverviewVoteLabel(status: string, voteEvent?: BillVoteEvent) {
  if (!voteEvent) {
    if (status === "Enacted") return "Passed without a recorded vote";
    if (status === "Passed") return "No recorded passage vote";
    return "No recorded vote yet";
  }

  if (status === "Enacted") return "Final vote before law";
  if (voteEvent.kind === "Final Passage") return "Main passage vote";
  return voteEvent.kind;
}

function getNoRecordedVoteMessage(status: string) {
  if (status === "Enacted") {
    return "This bill is law, but a recorded final vote is not linked here yet. It may have passed by voice vote, unanimous consent, or the vote may still be syncing.";
  }
  if (status === "Passed") {
    return "This bill is marked as passed, but a recorded vote is not linked here yet. It may have passed without a roll call or the vote may still be syncing.";
  }
  return "No recorded votes are linked to this bill yet.";
}

function hasRecordedVoteTotals(event: BillVoteEvent) {
  return event.totals.yes + event.totals.no + event.totals.present + event.totals.notVoting > 0;
}

export default async function BillPage(props: BillPageProps) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const [detail, initialSubscription] = await Promise.all([getBillDetailWithLiveData(params.billId), getCurrentEffectiveAccountSubscription()]);
  if (!detail) notFound();

  const { bill, billActions, billVideos, billVotes, cosponsors, sourceMatches, sponsor, voteMemberPositionsByVoteId } = detail;
  const status = getBillStatus(bill);
  const voteEvents = buildBillVoteEvents(bill, billVotes, billActions, voteMemberPositionsByVoteId);
  const overviewVoteEvent = selectOverviewVoteEvent(bill, voteEvents, status);
  const activeTab = normalizeTab(searchParams?.tab);
  const billSummary = activeTab === "details" ? await getBillSummary(bill) : null;
  const canUseAiPolicyLens = isPlanFeatureEnabled(initialSubscription?.plan ?? "free", "aiPolicyLens");
  const aiPolicyLensAnalysis =
    billSummary
      ? await resolveAiBillAnalysis(bill, {
          billActions,
          billVotes,
          enableLive: canUseAiPolicyLens,
          sourceMatches,
          summaryText: billSummary.text
        })
      : null;
  const displayNumber = bill.displayNumber.replace(". ", ".");
  const headerTitle = bill.shortTitle || bill.title;
  let headerTitleSizeClass = "text-[32px] leading-[1.06]";
  if (headerTitle.length > 90) headerTitleSizeClass = "text-[24px] leading-[1.12]";
  else if (headerTitle.length > 54) headerTitleSizeClass = "text-[27px] leading-[1.1]";
  const introducedDate = bill.introducedDate;
  const progressSteps = buildBillProgressSteps(bill, billVotes, status);

  return (
    <MobileShell
      minHeight="min-h-[1080px]"
      contentClassName="px-8 pb-5 pt-8"
      statusBarClassName="flex items-center justify-between text-[17px] font-semibold"
    >
      <header className="mt-10 flex items-center justify-between">
        <HistoryBackButton className={mobileIconButtonClass}>
          <ArrowLeft className="h-7 w-7" strokeWidth={2.2} aria-hidden="true" />
        </HistoryBackButton>
        <div className="flex items-center gap-5">
          <SaveTargetButton targetType="bill" targetId={bill.id} label="Save bill" />
          <GamificationEventAnchor
            href={bill.sourceUrl}
            event="open-official-source"
            targetId={`${bill.id}-header-source`}
            className={mobileIconButtonClass}
            aria-label="Open official bill source"
          >
            <Share2 className="h-7 w-7" strokeWidth={1.9} aria-hidden="true" />
          </GamificationEventAnchor>
        </div>
      </header>

      <section className="mt-10">
        <h1 className={`${headerTitleSizeClass} hyphens-auto break-words font-semibold text-white`} style={{ overflowWrap: "anywhere" }}>
          {headerTitle}
        </h1>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="rounded-full border border-white/12 bg-white/[0.055] px-3.5 py-2 text-[15px] font-semibold leading-none text-white/72">
            {displayNumber}
          </span>
          <span className="rounded-full border border-emerald-400/35 bg-emerald-400/13 px-3.5 py-2 text-[15px] font-medium leading-none text-[#59ee83]">
            {status}
          </span>
        </div>
        <BillStanceControl billId={bill.id} />
      </section>

      <nav className="mt-10 flex items-center justify-between border-b border-white/10 text-center text-[19px]">
        {billTabs.map((tab) => {
          const active = activeTab === tab.value;
          return (
            <Link key={tab.value} href={tabHref(bill.id, tab.value)} className={`min-w-20 pb-5 ${active ? "border-b-2 border-[#ffb12b] font-medium text-[#ffb12b]" : "text-white/58"}`}>
              {tab.label}
            </Link>
          );
        })}
      </nav>

      <main className="mt-7 space-y-5 pb-8">
        {activeTab === "overview" ? (
          <>
            <KeyDetailsCard bill={bill} cosponsors={cosponsors} introducedDate={introducedDate} sponsor={sponsor} status={status} />
            <ProgressSummaryCard billId={bill.id} progressSteps={progressSteps} />
            <VoteBreakdownCard billId={bill.id} status={status} voteEvent={overviewVoteEvent} />
          </>
        ) : null}

        {activeTab === "votes" ? <VotesTab overviewVoteId={overviewVoteEvent?.vote.id} status={status} voteEvents={voteEvents} /> : null}

        {activeTab === "timeline" ? <TimelineTab bill={bill} billActions={billActions} billVideos={billVideos} progressSteps={progressSteps} status={status} /> : null}

        {activeTab === "details" && billSummary ? (
          <>
            <BillSummaryCard bill={bill} status={status} summary={billSummary} />
            <PlanFeatureGate feature="aiPolicyLens" initialSubscription={initialSubscription}>
              {aiPolicyLensAnalysis ? <AiPolicyLensCard analysis={aiPolicyLensAnalysis} /> : null}
            </PlanFeatureGate>
            <PlanFeatureGate feature="sourceMap" initialSubscription={initialSubscription}>
              <SourceMapCard sourceMatches={sourceMatches} />
            </PlanFeatureGate>
            <PlanFeatureGate feature="speechVideo" initialSubscription={initialSubscription}>
              <VideoCard billVideos={billVideos} />
            </PlanFeatureGate>
          </>
        ) : null}
      </main>

      <MobileBottomNav
        indicatorClassName="mx-auto mt-4 h-1.5 w-36 rounded-full bg-white/70"
        items={[
          { href: "/dashboard", icon: <Home />, label: "Home" },
          { active: true, href: "/search?type=bills", icon: <FileText />, label: "Bills" },
          { href: "/search", icon: <Search />, label: "Search" },
          { href: "/alerts", icon: <Bell />, label: "Alerts" },
          { href: "/settings", icon: <Settings />, label: "Settings" }
        ]}
      />
    </MobileShell>
  );
}

function ProgressSummaryCard({ billId, progressSteps }: { billId: string; progressSteps: ProgressStep[] }) {
  const activeStepIndex = getCurrentProgressStepIndex(progressSteps);
  const currentStep = progressSteps[activeStepIndex];
  const progressFillPercent = (activeStepIndex / Math.max(1, progressSteps.length - 1)) * 100;

  return (
    <MobileCard variant="rust" className="px-5 py-5">
      <div className="flex items-center justify-between">
        <h2 className="text-[23px] font-medium">Where it stands</h2>
        <Link href={tabHref(billId, "timeline")} className={mobileViewAllClass}>
          See timeline
        </Link>
      </div>
      <div className="mt-7 px-2">
        <div className="relative h-11">
          <div className="absolute left-3 right-3 top-5 h-[3px] bg-white/13" />
          <div className="absolute left-3 top-5 h-[3px] bg-[#ffb12b]" style={{ width: activeStepIndex === 0 ? "0" : `calc(${progressFillPercent}% - 0.75rem)` }} />
          {progressSteps.map((step, index) => {
            const active = index <= activeStepIndex;
            const Icon = step.icon;
            const left = `${(index / Math.max(1, progressSteps.length - 1)) * 100}%`;
            return (
              <div key={step.label} className="absolute top-0 -translate-x-1/2" style={{ left }}>
                <span className={`grid h-10 w-10 place-items-center rounded-full ${active ? "border-2 border-[#ffb12b] bg-[#07172d] text-[#ffb12b] shadow-[0_0_18px_rgba(255,177,43,0.32)]" : "border-2 border-white/13 bg-[#07172d] text-white/25"}`}>
                  <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden="true" />
                </span>
              </div>
            );
          })}
        </div>
        <div className="mt-3 grid gap-1 text-center" style={{ gridTemplateColumns: `repeat(${progressSteps.length}, minmax(0, 1fr))` }}>
          {progressSteps.map((step, index) => (
            <div key={`${step.label}-label`} className={index === activeStepIndex ? "text-[#ffb12b]" : index < activeStepIndex ? "text-white/72" : "text-white/34"}>
              <div className="truncate text-[10px] font-semibold uppercase tracking-[0.04em]">{compactProgressLabel(step.label)}</div>
              <div className="mt-1 truncate text-[10px] leading-none">{step.date ? compactProgressDate(step.date) : index < activeStepIndex ? "Done" : "Pending"}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-xl border border-[#ffb12b]/28 bg-[#ffb12b]/8 px-3 py-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/45">Now</span>
            <span className="min-w-0 truncate text-right text-[13px] font-medium text-[#ffb12b]">
              {currentStep.label}
              {currentStep.date ? <span className="font-normal text-[#ffd083]"> / {currentStep.date}</span> : null}
            </span>
          </div>
        </div>
      </div>
    </MobileCard>
  );
}

function isProgressStepActive(step: ProgressStep) {
  return step.state === "complete" || step.state === "current" || Boolean(step.date);
}

function getCurrentProgressStepIndex(progressSteps: ProgressStep[]) {
  const currentIndex = progressSteps.findIndex((step) => step.state === "current");
  if (currentIndex >= 0) return currentIndex;

  return progressSteps.reduce((latestIndex, step, index) => (isProgressStepActive(step) ? index : latestIndex), 0);
}

function compactProgressLabel(label: string) {
  if (label === "Introduced in House" || label === "Introduced in Senate" || label === "Introduced") return "Start";
  if (label === "House committee" || label === "Senate committee") return "Review";
  if (label === "Committee Review") return "Review";
  if (label === "Referred to Committee") return "Review";
  if (label === "Committee Hearing") return "Hearing";
  if (label === "Floor Action") return "Floor";
  if (label === "Passed Chamber") return "Passed";
  if (label.startsWith("Passed ")) return "Passed";
  if (label.startsWith("Sent to ")) return "Sent";
  if (label === "Received in House") return "House";
  if (label === "Received in Senate") return "Senate";
  if (label === "House action" || label === "Senate action") return "Action";
  if (label === "Marked Up") return "Markup";
  if (label === "Final passage") return "Final";
  if (label === "Enacted") return "Law";
  return label;
}

function compactProgressDate(date: string) {
  return date.replace(/, \d{4}$/, "");
}

function BillSummaryCard({ bill, status, summary }: { bill: Bill; status: string; summary: BillSummaryResolution }) {
  const sourceTone =
    summary.source === "official"
      ? "border-emerald-400/26 bg-emerald-400/10 text-[#59ee83]"
      : summary.source === "stored"
        ? "border-[#ffb12b]/32 bg-[#ffb12b]/10 text-[#ffb12b]"
        : "border-white/10 bg-white/5 text-white/56";

  return (
    <MobileCard variant="rust" className="overflow-hidden px-5 py-5">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-5">
        <div className="min-w-0">
          <div className="text-[12px] font-semibold uppercase tracking-[0.1em] text-white/48">Summary</div>
          <div className={`mt-3 inline-flex rounded-full border px-3 py-1.5 text-[12px] font-semibold leading-none ${sourceTone}`}>
            {summary.label}
          </div>
        </div>
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-[#ffb12b]/24 bg-[#ffb12b]/10 text-[#ffb12b] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_18px_rgba(255,177,43,0.16)]">
          <FileText className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
        </span>
      </div>
      <ScrollableTextBox className="text-[16px] text-white/70">
        {summary.text}
      </ScrollableTextBox>
      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded-full border border-[#ffb12b]/30 bg-[#ffb12b]/10 px-3 py-1.5 text-[12px] font-semibold text-[#ffb12b] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
          {bill.policyArea}
        </span>
        <span className="rounded-full border border-emerald-400/24 bg-emerald-400/10 px-3 py-1.5 text-[12px] font-semibold text-[#59ee83] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
          {status}
        </span>
        <span className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5 text-[12px] font-semibold text-white/56">
          {bill.congress}th Congress
        </span>
        {summary.publishedAt ? (
          <span className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5 text-[12px] font-semibold text-white/56">
            Updated {formatDate(summary.publishedAt)}
          </span>
        ) : null}
      </div>
    </MobileCard>
  );
}

function AiPolicyLensCard({ analysis }: { analysis: AiBillAnalysis }) {
  return (
    <MobileCard variant="rust" className="overflow-hidden px-5 py-5">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-5">
        <div className="min-w-0">
          <div className="text-[12px] font-semibold uppercase tracking-[0.1em] text-white/48">Plain-language view</div>
          <h2 className="mt-2 text-[24px] font-medium leading-tight">What it could mean for you</h2>
          <p className="mt-2 text-[13px] leading-5 text-white/54">A quick read on how this bill could affect your household, community, wallet, or rights.</p>
        </div>
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-[#ffb12b]/24 bg-[#ffb12b]/10 text-[#ffb12b] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_18px_rgba(255,177,43,0.16)]">
          <Sparkles className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
        </span>
      </div>
      <ScrollableTextBox className="text-[15px] text-white/68">
        {analysis.context}
      </ScrollableTextBox>
      <div className="mt-5 grid gap-4">
        <AiPointGroup title="Possible benefits" tone="pro" points={analysis.pros} />
        <AiPointGroup title="Possible drawbacks" tone="con" points={analysis.cons} />
      </div>
    </MobileCard>
  );
}

function AiPointGroup({ points, title, tone }: { points: string[]; title: string; tone: "pro" | "con" }) {
  const positive = tone === "pro";

  return (
    <div className="rounded-[1.15rem] border border-white/10 bg-[linear-gradient(180deg,rgba(29,83,145,0.22)_0%,rgba(7,23,50,0.68)_100%)] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_12px_24px_rgba(2,10,28,0.24)]">
      <div className={`flex items-center gap-2 text-[15px] font-semibold ${positive ? "text-[#43ed74]" : "text-[#ffb12b]"}`}>
        {positive ? <CheckCircle2 className="h-4 w-4" strokeWidth={2} aria-hidden="true" /> : <CircleAlert className="h-4 w-4" strokeWidth={2} aria-hidden="true" />}
        {title}
      </div>
      <div className="mt-3 space-y-3">
        {points.map((point) => (
          <div key={point} className="grid grid-cols-[8px_minmax(0,1fr)] gap-3 text-[14px] leading-5 text-white/62">
            <span className={`mt-2 h-1.5 w-1.5 rounded-full ${positive ? "bg-[#43ed74]" : "bg-[#ffb12b]"}`} />
            <span>{point}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScrollableTextBox({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <MobileGlassScrollFrame heightClassName="max-h-32" className={`px-4 py-4 leading-6 ${className}`}>
      <p className="whitespace-pre-line">{children}</p>
    </MobileGlassScrollFrame>
  );
}

function VoteBreakdownCard({
  billId,
  status,
  voteEvent
}: {
  billId: string;
  status: string;
  voteEvent?: BillVoteEvent;
}) {
  const hasTotals = voteEvent ? hasRecordedVoteTotals(voteEvent) : false;

  return (
    <MobileCard variant="rust" className="px-6 py-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[12px] font-semibold uppercase tracking-[0.1em] text-white/48">{getOverviewVoteLabel(status, voteEvent)}</div>
          <h2 className="mt-2 text-[23px] font-medium leading-tight">Vote results</h2>
        </div>
        <Link href={voteEvent ? `/bills/${billId}?tab=votes` : tabHref(billId, "votes")} className={mobileViewAllClass}>
          All votes
        </Link>
      </div>
      {voteEvent && hasTotals ? (
        <>
          <div className="mt-4 rounded-xl border border-white/10 bg-[#071a38]/65 px-4 py-3">
            <div className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#ffb12b]">
              {voteEvent.vote.chamber} Roll Call {voteEvent.vote.rollCall}
            </div>
            <p className="mt-2 line-clamp-2 text-[15px] leading-snug text-white/68">{voteEvent.vote.question}</p>
            <div className="mt-2 text-[12px] leading-snug text-white/50">
              {voteEvent.impact} / {formatDate(voteEvent.vote.voteDate)}
            </div>
          </div>
          <VoteSpreadPanel className="mt-5" totals={voteEvent.totals} yesLabel="For" noLabel="Against" />
        </>
      ) : (
        <div className="mt-5 rounded-xl border border-dashed border-white/12 bg-white/[0.035] px-4 py-4 text-[14px] leading-snug text-white/56">
          {voteEvent ? "A roll-call vote is linked, but member totals are still pending from the official source." : getNoRecordedVoteMessage(status)}
        </div>
      )}
    </MobileCard>
  );
}

function VotesTab({
  overviewVoteId,
  status,
  voteEvents
}: {
  overviewVoteId?: string;
  status: string;
  voteEvents: BillVoteEvent[];
}) {
  if (!voteEvents.length) {
    return (
      <MobileCard variant="rust" className="px-6 py-6">
        <h2 className="text-[23px] font-medium">Votes</h2>
        <p className="mt-3 text-[15px] leading-6 text-white/58">{getNoRecordedVoteMessage(status)}</p>
      </MobileCard>
    );
  }

  return (
    <>
      <MobileCard variant="rust" className="px-5 py-5">
        <div className="text-[12px] font-semibold uppercase tracking-[0.1em] text-white/48">Votes</div>
        <h2 className="mt-2 text-[24px] font-medium leading-tight">How the votes fit</h2>
        <p className="mt-3 text-[14px] leading-snug text-white/56">
          The overview shows the vote most tied to this bill&apos;s current status. This tab shows linked votes and roll calls found in official actions.
        </p>
      </MobileCard>

      {voteEvents.map((event, index) => {
        const totals = event.totals;
        const positions = event.positions;
        const isOverviewVote = event.vote.id === overviewVoteId;
        const hasTotals = hasRecordedVoteTotals(event);
        const hasSyncedVote = event.sourceType === "linked-vote";
        const detailHrefIsExternal = event.detailHref?.startsWith("http");

        return (
          <MobileCard key={event.vote.id} variant="rust" className="px-6 py-6">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-5">
              <div className="min-w-0">
                <div className="text-[13px] font-medium uppercase tracking-wide text-white/50">
                  Step {index + 1} / {event.voteLabel}
                </div>
                <h2 className="mt-2 text-[22px] font-medium leading-tight">{event.vote.question}</h2>
                <p className="mt-2 text-[15px] leading-snug text-white/58">{formatDate(event.vote.voteDate)}</p>
              </div>
              <span className="shrink-0 rounded-full bg-[#2be68d]/10 px-3 py-2 text-[15px] font-medium leading-none text-[#2be68d]">{event.vote.result}</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-[#ffb12b]/28 bg-[#ffb12b]/10 px-3 py-1.5 text-[12px] font-semibold text-[#ffb12b]">{event.kind}</span>
              {event.sourceAction ? (
                <span className="rounded-full border border-[#79a8ff]/24 bg-[#79a8ff]/10 px-3 py-1.5 text-[12px] font-semibold text-[#9fbeff]">From official action</span>
              ) : null}
              {isOverviewVote ? (
                <span className="rounded-full border border-[#43ed74]/24 bg-[#43ed74]/10 px-3 py-1.5 text-[12px] font-semibold text-[#43ed74]">Shown on overview</span>
              ) : null}
            </div>
            <div className="mt-4 rounded-xl border border-white/10 bg-[#071a38]/65 px-4 py-3 text-[14px] leading-snug text-white/58">
              {event.impact}
            </div>
            {event.sourceAction ? (
              <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/42">
                  Official action / {formatActionTimestamp(event.sourceAction)}
                </div>
                <p className="mt-2 text-[14px] leading-snug text-white/62">{event.sourceAction.action}</p>
              </div>
            ) : null}
            {hasTotals ? (
              <>
                <div className={`mt-5 grid text-center ${hasSyncedVote ? "grid-cols-3" : "grid-cols-2"}`}>
                  <VoteStat value={String(totals.yes)} label="Yes" tone="text-[#58e883]" />
                  <VoteStat value={String(totals.no)} label="No" tone="text-[#ff503d]" />
                  {hasSyncedVote ? <VoteStat value={String(totals.notVoting)} label="Not Voting" tone="text-white/60" /> : null}
                </div>
                {hasSyncedVote ? (
                  <BillVoteMemberBreakdown chamber={event.vote.chamber} positions={positions} />
                ) : (
                  <div className="mt-5 rounded-xl border border-dashed border-white/12 bg-white/[0.035] px-4 py-4 text-[14px] leading-snug text-white/56">
                    Member votes will appear once this roll call is available as a full vote record.
                  </div>
                )}
              </>
            ) : (
              <div className="mt-5 rounded-xl border border-dashed border-white/12 bg-white/[0.035] px-4 py-4 text-[14px] leading-snug text-white/56">
                {event.sourceAction ? "This roll-call vote was found in the official actions. Totals and member votes are still pending from the official source." : "Vote totals are not available for this linked vote yet."}
              </div>
            )}
            {event.detailHref ? (
              <Link
                href={event.detailHref}
                target={detailHrefIsExternal ? "_blank" : undefined}
                rel={detailHrefIsExternal ? "noreferrer" : undefined}
                className="mt-5 flex h-12 items-center justify-center rounded-xl border border-rust/45 bg-rust/10 text-[17px] font-medium text-[#ffb12b]"
              >
                {event.detailLabel}
                <ChevronRight className="ml-2 h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
              </Link>
            ) : null}
          </MobileCard>
        );
      })}
    </>
  );
}

function TimelineTab({
  bill,
  billActions,
  billVideos,
  progressSteps,
  status
}: {
  bill: Bill;
  billActions: BillAction[];
  billVideos: BillVideo[];
  progressSteps: ProgressStep[];
  status: string;
}) {
  const currentStepIndex = getCurrentProgressStepIndex(progressSteps);
  const timelineStatus = progressSteps[currentStepIndex]?.label ?? status;

  return (
    <>
      <MobileCard variant="rust" className="overflow-hidden px-5 py-5">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-5">
          <div>
            <div className="text-[12px] font-semibold uppercase tracking-[0.1em] text-white/48">Timeline</div>
            <h2 className="mt-2 text-[24px] font-medium leading-tight">{timelineStatus}</h2>
          </div>
          <span className="shrink-0 rounded-full border border-[#ffb12b]/35 bg-[#ffb12b]/10 px-3 py-1.5 text-[12px] font-semibold leading-none text-[#ffb12b]">
            {billActions.length} {billActions.length === 1 ? "update" : "updates"}
          </span>
        </div>
        {billActions.length ? (
          <MobileGlassScrollFrame heightClassName="max-h-[520px]" className="space-y-3" ariaLabel="Bill timeline updates">
            {billActions.map((action) => (
              <BillActionRow key={action.id} action={action} />
            ))}
          </MobileGlassScrollFrame>
        ) : (
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-4 text-[15px] text-white/52">
            No official updates linked yet.
          </div>
        )}
      </MobileCard>

      <MobileCard variant="rust" className="px-5 py-5">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
          <div className="min-w-0">
            <div className="text-[12px] font-semibold uppercase tracking-[0.1em] text-white/48">Latest update</div>
            <h2 className="mt-2 text-[22px] font-medium leading-tight">Latest update</h2>
          </div>
          <span className="grid h-11 w-11 place-items-center rounded-2xl border border-[#ffb12b]/24 bg-[#ffb12b]/10 text-[#ffb12b] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_18px_rgba(255,177,43,0.14)]">
            <CalendarDays className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
          </span>
        </div>
        <div className="mt-4 rounded-xl border border-white/10 bg-[#071a38]/65 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          <p className="text-[16px] leading-snug text-white/72">{bill.latestActionText}</p>
          <div className="mt-3 flex items-center justify-between gap-3 text-[13px] text-white/50">
            <span>{formatDate(bill.latestActionDate)}</span>
            <span className="rounded-full border border-[#ffb12b]/24 bg-[#ffb12b]/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.07em] text-[#ffb12b]">
              {timelineStatus}
            </span>
          </div>
        </div>
      </MobileCard>

      <VideoCard billVideos={billVideos} compact />
    </>
  );
}

function actionKindTone(kind: BillAction["kind"]) {
  if (kind === "Vote") return "border-[#79a8ff]/28 bg-[#79a8ff]/10 text-[#9fbeff]";
  if (kind === "Chamber Transfer") return "border-[#ffb12b]/30 bg-[#ffb12b]/10 text-[#ffb12b]";
  if (kind === "Committee") return "border-[#43ed74]/24 bg-[#43ed74]/10 text-[#7cf29a]";
  if (kind === "Enacted") return "border-[#43ed74]/30 bg-[#43ed74]/12 text-[#7cf29a]";
  if (kind === "Procedural") return "border-white/12 bg-white/[0.045] text-white/54";
  return "border-white/12 bg-white/[0.04] text-white/60";
}

function formatActionTimestamp(action: BillAction) {
  return action.time ? `${formatDate(action.date)} / ${action.time}` : formatDate(action.date);
}

function BillActionRow({ action }: { action: BillAction }) {
  const detailHref = action.linkedVoteId ? `/votes/${action.linkedVoteId}` : action.sourceUrl;
  const detailLabel = action.linkedVoteId ? "Vote" : "Source";

  return (
    <article className="snap-start rounded-[1.05rem] border border-white/10 bg-[linear-gradient(180deg,rgba(29,83,145,0.18)_0%,rgba(7,23,50,0.72)_100%)] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_10px_22px_rgba(2,10,28,0.2)]">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-white/10 bg-white/[0.045] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.07em] text-white/62">
              {formatActionTimestamp(action)}
            </span>
            {action.chamber ? (
              <span className="rounded-full border border-white/10 bg-white/[0.035] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.07em] text-white/48">
                {action.chamber}
              </span>
            ) : null}
            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.07em] ${actionKindTone(action.kind)}`}>
              {action.kind}
            </span>
          </div>
          <p className="mt-3 text-[14px] leading-5 text-white/72">{action.action}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] font-medium text-white/42">
            <span>{action.sourceLabel}</span>
            {action.rollCall ? <span>Roll Call {action.rollCall}</span> : null}
            {action.timePrecision === "date" ? <span>Date only</span> : null}
          </div>
        </div>
        {detailHref ? (
          <Link
            href={detailHref}
            target={action.linkedVoteId ? undefined : "_blank"}
            rel={action.linkedVoteId ? undefined : "noreferrer"}
            className="grid h-10 min-w-10 place-items-center rounded-xl border border-[#ffb12b]/24 bg-[#ffb12b]/10 px-3 text-[12px] font-semibold text-[#ffb12b] transition hover:bg-[#ffb12b]/14"
          >
            {detailLabel}
          </Link>
        ) : null}
      </div>
    </article>
  );
}

function KeyDetailsCard({
  bill,
  cosponsors,
  introducedDate,
  sponsor,
  status
}: {
  bill: Bill;
  cosponsors: Member[];
  introducedDate?: string | null;
  sponsor?: Member;
  status: string;
}) {
  const committeeDetail = resolveCommitteeDetail(bill, status);

  return (
    <MobileCard variant="rust" className="overflow-hidden px-5 py-5">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-5">
        <div>
          <div className="text-[12px] font-semibold uppercase tracking-[0.1em] text-white/48">Bill basics</div>
          <h2 className="mt-2 text-[24px] font-medium leading-tight">At a glance</h2>
        </div>
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-[#ffb12b]/24 bg-[#ffb12b]/10 text-[#ffb12b] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_18px_rgba(255,177,43,0.16)]">
          <FileCheck2 className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
        </span>
      </div>
      <div className="mt-5 grid gap-3">
        <DetailRow
          image={sponsor?.photoUrl}
          label="Sponsor"
          value={sponsor?.fullName ?? (bill.sponsorBioguideId ? "Sponsor profile pending" : "No sponsor listed")}
          href={sponsor ? `/members/${sponsor.bioguideId}` : undefined}
        />
        <CosponsorsRow cosponsors={cosponsors} />
        <DetailRow icon={<CalendarDays />} label="Introduced" value={introducedDate ? formatDate(introducedDate) : "Date pending"} />
        <DetailRow icon={<BriefcaseBusiness />} label={committeeDetail.label} value={committeeDetail.value} href={committeeDetail.href} />
      </div>
    </MobileCard>
  );
}

function resolveCommitteeDetail(bill: Bill, status: string) {
  if (bill.committeeName) return { href: "/search?type=bills", label: "Committee", value: bill.committeeName };
  if (status === "Enacted") return { label: "Status", value: "Enacted into law" };
  if (status === "Passed") return { label: "Status", value: "Passed chamber" };
  return { href: "/search?type=bills", label: "Committee", value: "Committee not listed yet" };
}

function CosponsorsRow({ cosponsors }: { cosponsors: Member[] }) {
  return (
    <div className="grid grid-cols-[44px_minmax(0,1fr)] items-center gap-3 rounded-[1.15rem] border border-white/10 bg-[linear-gradient(180deg,rgba(29,83,145,0.22)_0%,rgba(7,23,50,0.68)_100%)] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_12px_24px_rgba(2,10,28,0.22)]">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/[0.035] text-[#ffb12b]">
        <UsersRound className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-white/46">Cosponsors</div>
        {cosponsors.length ? (
          <MobileGlassScrollFrame axis="horizontal" ariaLabel="Cosponsors" frameClassName="mt-1" className="flex gap-2">
            {cosponsors.map((member) => (
              <Link
                key={member.bioguideId}
                href={`/members/${member.bioguideId}`}
                className="grid h-8 min-w-[170px] grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-2 transition hover:bg-white/[0.07]"
              >
                <Image src={member.photoUrl ?? "/capitol-ledger-logo.png"} alt="" width={24} height={24} className="h-6 w-6 rounded-lg border border-white/12 object-cover" />
                <span className="truncate text-[12px] font-semibold leading-none text-white">{member.fullName}</span>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-white/42" aria-hidden="true" />
              </Link>
            ))}
          </MobileGlassScrollFrame>
        ) : (
          <div className="mt-1 truncate text-[16px] font-semibold leading-tight text-white">No cosponsors listed</div>
        )}
      </div>
    </div>
  );
}

function SourceMapCard({ sourceMatches }: { sourceMatches: BillSourceMatch[] }) {
  return (
    <MobileCard variant="rust" className="overflow-hidden px-5 py-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-[12px] font-semibold uppercase tracking-[0.1em] text-white/48">Sources</div>
          <h2 className="mt-2 text-[24px] font-medium leading-tight">Official sources</h2>
          <p className="mt-2 text-[13px] leading-5 text-white/54">Official links used for this bill, votes, hearings, video, and sponsor records.</p>
        </div>
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-[#43ed74]/24 bg-[#43ed74]/10 text-[#43ed74] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_18px_rgba(67,237,116,0.14)]">
          <ShieldCheck className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
        </span>
      </div>
      <MobileGlassScrollFrame heightClassName="h-[248px]" className="flex snap-y snap-mandatory flex-col gap-3">
        {sourceMatches.map((match) => (
          <SourceMatchRow key={match.id} match={match} />
        ))}
      </MobileGlassScrollFrame>
      {sourceMatches.length > 1 ? (
        <div className="mt-4 flex items-center justify-between text-[12px] font-medium text-white/42">
          <span>Scroll sources</span>
          <span>{sourceMatches.length} sources</span>
        </div>
      ) : null}
    </MobileCard>
  );
}

function VideoCard({ billVideos, compact = false }: { billVideos: BillVideo[]; compact?: boolean }) {
  const visibleVideos = billVideos.slice(0, compact ? 2 : billVideos.length);

  return (
    <MobileCard variant="rust" className="overflow-hidden px-5 py-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-white/48">
            <PlayCircle className="h-4 w-4 text-[#ffb12b]" strokeWidth={1.9} aria-hidden="true" />
            Official video
          </div>
          <h2 className="mt-2 text-[23px] font-medium leading-tight">Statements and video</h2>
        </div>
        <span className="shrink-0 rounded-full border border-[#ffb12b]/35 bg-[#ffb12b]/10 px-3 py-1.5 text-[12px] font-semibold leading-none text-[#ffb12b]">
          {billVideos.length} {billVideos.length === 1 ? "link" : "links"}
        </span>
      </div>
      <div className="mt-5 space-y-3">
        {visibleVideos.length ? visibleVideos.map((video) => <VideoRow key={video.id} video={video} />) : <div className="rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-4 text-[15px] text-white/52">No official statements or video linked yet.</div>}
      </div>
    </MobileCard>
  );
}

function VoteStat({ value, label, tone }: { value: string; label: string; tone: string }) {
  return (
    <div className="border-r border-white/8 last:border-r-0">
      <div className={`text-[34px] font-medium leading-none ${tone}`}>{value}</div>
      <div className="mt-2 text-[18px] text-white/67">{label}</div>
    </div>
  );
}

function DetailRow({
  icon,
  image,
  label,
  value,
  href
}: {
  icon?: ReactElement;
  image?: string;
  label: string;
  value: string;
  href?: string;
}) {
  const content = (
    <div className="grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 rounded-[1.15rem] border border-white/10 bg-[linear-gradient(180deg,rgba(29,83,145,0.22)_0%,rgba(7,23,50,0.68)_100%)] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_12px_24px_rgba(2,10,28,0.22)]">
      <div className="text-white/62">
        {image ? (
          <Image src={image} alt="" width={44} height={44} className="h-11 w-11 rounded-2xl border border-white/12 object-cover shadow-[0_10px_18px_rgba(0,0,0,0.22)]" />
        ) : (
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/[0.035] text-[#ffb12b] [&>svg]:h-5 [&>svg]:w-5 [&>svg]:stroke-[1.8]">{icon}</span>
        )}
      </div>
      <div className="min-w-0">
        <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-white/46">{label}</div>
        <div className="mt-1 truncate text-[16px] font-semibold leading-tight text-white">{value}</div>
      </div>
      {href ? <ChevronRight className="h-5 w-5 shrink-0 text-white/60" aria-hidden="true" /> : <span />}
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

function SourceMatchRow({ match }: { match: BillSourceMatch }) {
  return (
    <GamificationEventAnchor
      href={match.url}
      event="open-official-source"
      targetId={match.id}
      className="block h-[248px] shrink-0 snap-start rounded-[1.15rem] border border-white/10 bg-[linear-gradient(180deg,rgba(29,83,145,0.24)_0%,rgba(7,23,50,0.7)_100%)] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_12px_24px_rgba(2,10,28,0.26)] transition hover:brightness-110"
    >
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-[#ffb12b]/24 bg-[#ffb12b]/10 text-[#ffb12b] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_18px_rgba(255,177,43,0.14)]">
          <Link2 className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-rust/25 bg-rust/10 px-2 py-0.5 text-[11px] font-semibold text-[#ffb12b]">
              {match.matchKind}
            </span>
            <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${match.confidence === "high" ? "border-[#43ed74]/24 bg-[#43ed74]/10 text-[#43ed74]" : "border-white/12 bg-white/6 text-white/54"}`}>
              {match.confidence} confidence
            </span>
          </div>
          <div className="mt-2 text-[16px] font-semibold leading-snug text-white">{match.label}</div>
          <p className="mt-2 text-[13px] leading-5 text-white/54">{match.reason}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] font-semibold text-white/58">
            <ExternalLink className="h-4 w-4 text-[#ffb12b]" strokeWidth={1.8} aria-hidden="true" />
            {match.source}
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-white/50">{match.sourceKind}</span>
            {match.verifiedAt ? <span className="text-[#43ed74]">Verified {formatDate(match.verifiedAt)}</span> : null}
          </div>
        </div>
      </div>
    </GamificationEventAnchor>
  );
}

function VideoRow({ video }: { video: BillVideo }) {
  const destinationLabel = video.platform === "youtube" ? "Watch on YouTube" : `Open ${video.source}`;
  const statusLabel = video.reviewStatus ? video.reviewStatus.replace("-", " ") : "Official source";

  return (
    <GamificationEventAnchor
      href={video.videoUrl}
      event="watch-speech-video"
      targetId={video.id}
      className="block rounded-[1.15rem] border border-white/10 bg-[linear-gradient(180deg,rgba(29,83,145,0.26)_0%,rgba(7,23,50,0.72)_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_12px_24px_rgba(2,10,28,0.32)] transition hover:brightness-110"
    >
      <div className="grid grid-cols-[52px_minmax(0,1fr)] gap-4">
        <span className="relative grid h-[52px] w-[52px] shrink-0 place-items-center rounded-2xl border border-[#ffb12b]/24 bg-[#ffb12b]/10 text-[#ffb12b] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_18px_rgba(255,177,43,0.16)]">
          <PlayCircle className="h-7 w-7" strokeWidth={1.7} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#ffb12b]">
            <MessageSquareText className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
            {video.type}
            <span className="h-1 w-1 rounded-full bg-white/30" />
            <span className="text-white/46">{formatDate(video.publishedAt)}</span>
          </div>
          <div className="mt-2 text-[17px] font-semibold leading-snug text-white">{video.title}</div>
          <p className="mt-2 line-clamp-2 text-[13px] leading-5 text-white/54">{video.summary}</p>
          <div className="mt-3 grid gap-2 rounded-xl border border-white/8 bg-[#071a38]/65 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-white/48">
              <span>{video.speaker}</span>
              <span>{video.role}</span>
              <span>{video.duration}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[13px] font-semibold text-white/72">
              <ExternalLink className="h-4 w-4 text-[#ffb12b]" strokeWidth={1.8} aria-hidden="true" />
              <span>{destinationLabel}</span>
              {video.sourceKind ? (
                <span className="rounded-full border border-[#ffb12b]/26 bg-[#ffb12b]/10 px-2 py-0.5 text-[11px] text-[#ffbf45]">
                  {video.sourceKind}
                </span>
              ) : null}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {video.verifiedAt ? (
              <span className="rounded-full border border-emerald-400/22 bg-emerald-400/10 px-2 py-0.5 text-[11px] text-[#59ee83]">
                Verified {formatDate(video.verifiedAt)}
              </span>
            ) : null}
            {video.matchConfidence ? (
              <span className="rounded-full border border-[#ffb12b]/22 bg-[#ffb12b]/10 px-2 py-0.5 text-[11px] text-[#ffbf45]">
                {video.matchConfidence} match
              </span>
            ) : null}
            <span className="rounded-full border border-white/10 bg-white/[0.035] px-2 py-0.5 text-[11px] text-white/46">
              {statusLabel}
            </span>
          </div>
        </div>
      </div>
    </GamificationEventAnchor>
  );
}
