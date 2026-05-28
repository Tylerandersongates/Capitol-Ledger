import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";
import { GamificationEventAnchor } from "@/components/gamification-actions";
import type { Bill, Member } from "@/types/capitol";
import { formatDate } from "@/lib/utils";

type BillCardProps = {
  bill: Bill;
  sponsor?: Member;
};

export function BillCard({ bill, sponsor }: BillCardProps) {
  return (
    <article className="glass-card rounded-lg p-4">
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
        <span className="rounded-md bg-brass px-2 py-1 text-ink">{bill.displayNumber}</span>
        <span className="rounded-md bg-civic/15 px-2 py-1 text-aurora">{bill.policyArea}</span>
        <span className="rounded-md bg-rust/15 px-2 py-1 text-brass">{formatDate(bill.latestActionDate)}</span>
      </div>
      <h3 className="mt-3 text-lg font-semibold leading-tight text-white">{bill.shortTitle}</h3>
      <p className="mt-2 text-sm leading-6 text-stone-600">{bill.summary}</p>
      <p className="mt-3 text-sm text-stone-700">
        Sponsor: <span className="font-medium text-white">{sponsor?.fullName ?? "Unknown"}</span>
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Link
          href={`/bills/${bill.id}`}
          className="focus-ring inline-flex h-10 items-center gap-2 rounded-md bg-gradient-to-r from-civic to-aurora px-3 text-sm font-semibold text-white shadow-glow"
        >
          Bill detail
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
        <GamificationEventAnchor
          href={bill.sourceUrl}
          event="open-official-source"
          targetId={`${bill.id}-source`}
          className="focus-ring inline-flex h-10 items-center gap-2 rounded-md border border-brass/20 bg-white/5 px-3 text-sm font-medium text-blue-100 hover:bg-white/10"
        >
          Source
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
        </GamificationEventAnchor>
      </div>
    </article>
  );
}
