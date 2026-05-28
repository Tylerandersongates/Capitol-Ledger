import { ExternalLink } from "lucide-react";
import { GamificationEventAnchor } from "@/components/gamification-actions";
import type { MemberVote, Vote } from "@/types/capitol";
import { formatDate, positionTone } from "@/lib/utils";

type VoteRecord = MemberVote & {
  vote?: Vote;
};

export function VoteTable({ records }: { records: VoteRecord[] }) {
  if (records.length === 0) {
    return <p className="rounded-lg border border-dashed border-brass/20 bg-white/5 p-6 text-sm text-stone-600">No votes in demo data.</p>;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-brass/15 bg-white/5">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-brass/10 text-sm">
          <thead className="bg-white/7 text-left text-xs font-semibold uppercase text-blue-100/70">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Question</th>
              <th className="px-4 py-3">Result</th>
              <th className="px-4 py-3">Vote</th>
              <th className="px-4 py-3">Source</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {records.map((record) => {
              if (!record.vote) return null;
              return (
                <tr key={`${record.voteId}-${record.memberBioguideId}`}>
                  <td className="whitespace-nowrap px-4 py-4 text-stone-600">{formatDate(record.vote.voteDate)}</td>
                  <td className="min-w-72 px-4 py-4">
                    <div className="font-medium text-white">{record.vote.question}</div>
                    <div className="mt-1 text-xs leading-5 text-stone-600">{record.vote.explanation}</div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-stone-700">{record.vote.result}</td>
                  <td className="whitespace-nowrap px-4 py-4">
                    <span className={`rounded-md px-2 py-1 text-xs font-semibold ${positionTone(record.position)}`}>
                      {record.position}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-4">
                    <GamificationEventAnchor
                      href={record.vote.sourceUrl}
                      event="open-official-source"
                      targetId={`${record.vote.id}-table-source`}
                      className="inline-flex items-center gap-1 text-sm font-medium text-civic hover:underline"
                    >
                      Open
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    </GamificationEventAnchor>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
