import { MobileShell } from "@/components/mobile-shell";
import { BillVoteMemberBreakdown } from "@/components/bill-vote-member-breakdown";
import { GamificationEventAnchor, RecordGamificationEvent } from "@/components/gamification-actions";
import { MobileBottomNav, MobileCard, mobileIconButtonClass } from "@/components/mobile-ui";
import { VoteSpreadPanel } from "@/components/vote-spread-panel";
import { VoteSavedOfficialPositions } from "@/components/vote-saved-official-positions";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Bell,
  ChevronRight,
  ExternalLink,
  FileText,
  Home,
  Link2,
  Search,
  ShieldCheck,
  Settings,
  UsersRound
} from "lucide-react";
import { getBill, getVote, getVoteMemberPositions, getVoteTotals } from "@/lib/data";
import { formatDate } from "@/lib/utils";

type VotePageProps = {
  params: {
    voteId: string;
  };
};

export default function VoteDetailPage({ params }: VotePageProps) {
  const vote = getVote(params.voteId);
  if (!vote) notFound();

  const bill = vote.billId ? getBill(vote.billId) : undefined;
  const totals = getVoteTotals(vote);
  const memberPositions = getVoteMemberPositions(vote.id);
  const displayRollCall = `${vote.chamber} Roll Call ${vote.rollCall}`;

  return (
    <MobileShell
      minHeight="min-h-[1080px]"
      contentClassName="px-8 pb-5 pt-8"
      statusBarClassName="flex items-center justify-between text-[17px] font-semibold"
    >
      <RecordGamificationEvent event="review-vote" targetId={vote.id} />
      <header className="mt-10 flex items-center justify-between">
        <Link href="/dashboard" className={mobileIconButtonClass} aria-label="Back to dashboard">
          <ArrowLeft className="h-6 w-6" strokeWidth={2.1} aria-hidden="true" />
        </Link>
        <GamificationEventAnchor href={vote.sourceUrl} event="open-official-source" targetId={`${vote.id}-header-source`} className={mobileIconButtonClass} aria-label="Open official vote source">
          <ExternalLink className="h-6 w-6" strokeWidth={1.9} aria-hidden="true" />
        </GamificationEventAnchor>
      </header>

      <section className="mt-9">
        <div className="text-[18px] uppercase tracking-wide text-white/54">Vote Record</div>
        <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-5">
          <div className="min-w-0">
            <h1 className="text-[31px] font-medium leading-none text-white">Roll Call {vote.rollCall}</h1>
            <p className="mt-3 text-[18px] text-white/52">{vote.chamber} · {formatDate(vote.voteDate)}</p>
          </div>
          <span className="shrink-0 rounded-full bg-[#2be68d]/10 px-3 py-2 text-right text-[16px] font-medium leading-none text-[#2be68d]">
            {vote.result}
          </span>
        </div>
        <h2 className="mt-6 text-[23px] font-medium leading-tight text-white">{vote.question}</h2>
      </section>

      <main className="mt-7 space-y-4 pb-8">
        <MobileCard variant="dashboard" className="px-5 py-5">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-5">
            <div className="min-w-0">
              <h2 className="max-w-[19rem] text-[23px] font-medium leading-tight">Vote Breakdown</h2>
              <p className="mt-2 text-[18px] text-white/52">{displayRollCall}</p>
            </div>
            <span className="shrink-0 rounded-full bg-white/8 px-3 py-2 text-[16px] font-medium leading-none text-white/60">
              {totals.yes + totals.no + totals.present + totals.notVoting}
            </span>
          </div>
          <VoteSpreadPanel className="mt-5" totals={totals} />
        </MobileCard>

        <MobileCard variant="dashboard" className="px-5 py-5">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-5">
            <div className="min-w-0">
              <div className="text-[13px] font-medium uppercase tracking-wide text-white/50">Linked Legislation</div>
              <h2 className="mt-2 text-[21px] font-medium leading-tight">{bill?.shortTitle ?? "No bill linked"}</h2>
              <p className="mt-2 text-[15px] leading-snug text-white/58">{vote.explanation}</p>
            </div>
            <FileText className="h-7 w-7 shrink-0 text-[#ffb12b]" strokeWidth={1.8} aria-hidden="true" />
          </div>
          {bill ? (
            <Link href={`/bills/${bill.id}`} className="mt-5 flex h-12 items-center justify-center rounded-xl border border-rust/45 bg-rust/10 text-[17px] font-medium text-[#ffb12b]">
              View Bill
              <ChevronRight className="ml-2 h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
            </Link>
          ) : null}
        </MobileCard>

        <VoteSavedOfficialPositions memberPositions={memberPositions} />

        <MobileCard variant="dashboard" className="px-5 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[13px] font-medium uppercase tracking-wide text-white/50">All Member Votes</div>
              <h2 className="mt-2 text-[21px] font-medium leading-tight">Member positions</h2>
              <p className="mt-2 text-[14px] leading-snug text-white/52">{memberPositions.length} recorded member positions</p>
            </div>
            <UsersRound className="h-7 w-7 shrink-0 text-[#ffb12b]" strokeWidth={1.8} aria-hidden="true" />
          </div>
          <BillVoteMemberBreakdown chamber={vote.chamber} positions={memberPositions} showPinnedSection={false} />
        </MobileCard>

        <MobileCard variant="dashboard" className="px-5 py-5">
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#43ed74]/12 text-[#43ed74]">
              <ShieldCheck className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="text-[21px] font-medium leading-none">Official Source</h2>
              <p className="mt-3 text-[15px] leading-snug text-white/58">Source-linked vote record from the official {vote.chamber} roll-call ledger.</p>
              <GamificationEventAnchor href={vote.sourceUrl} event="open-official-source" targetId={`${vote.id}-source-card`} className="mt-4 inline-flex items-center gap-2 text-[16px] font-medium text-[#ffb12b]">
                Open source
                <Link2 className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
              </GamificationEventAnchor>
            </div>
          </div>
        </MobileCard>
      </main>

      <MobileBottomNav
        indicatorClassName="mx-auto mt-4 h-1.5 w-36 rounded-full bg-white"
        items={[
          { href: "/dashboard", icon: <Home />, label: "Home" },
          { href: "/search?type=bills", icon: <FileText />, label: "Bills" },
          { active: true, href: "/search?type=votes", icon: <Search />, label: "Search" },
          { href: "/alerts", icon: <Bell />, label: "Alerts" },
          { href: "/settings", icon: <Settings />, label: "Settings" }
        ]}
      />
    </MobileShell>
  );
}
