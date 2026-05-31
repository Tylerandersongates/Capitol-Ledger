import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ExternalLink } from "lucide-react";
import { GamificationEventAnchor } from "@/components/gamification-actions";
import type { Member } from "@/types/capitol";
import { partyInitial } from "@/lib/utils";

export function MemberCard({ member }: { member: Member }) {
  return (
    <article className="glass-card rounded-lg p-4">
      <div className="flex gap-4">
        <Image
          src={member.photoUrl ?? "/capitol-ledger-logo.png"}
          alt=""
          width={80}
          height={80}
          className="h-20 w-20 shrink-0 rounded-md border border-brass/20 bg-paper object-cover"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-brass/15 bg-brass/10 px-2 py-1 text-xs font-semibold text-brass">
              {partyInitial(member.party)}-{member.state}
              {member.district ? `-${member.district}` : ""}
            </span>
            <span className="rounded-md bg-civic/15 px-2 py-1 text-xs font-semibold text-aurora">{member.chamber}</span>
          </div>
          <h3 className="mt-2 text-lg font-semibold leading-tight text-white">{member.fullName}</h3>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-stone-600">{member.description}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Link
          href={`/members/${member.bioguideId}`}
          className="focus-ring inline-flex h-10 items-center gap-2 rounded-md bg-gradient-to-r from-brass to-rust px-3 text-sm font-semibold text-ink shadow-glow"
        >
          Profile
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
        <GamificationEventAnchor
          href={member.sourceUrl}
          event="open-official-source"
          targetId={`${member.bioguideId}-source`}
          className="focus-ring inline-flex h-10 items-center gap-2 rounded-md border border-brass/20 bg-white/5 px-3 text-sm font-medium text-blue-100 hover:bg-white/10"
        >
          Source
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
        </GamificationEventAnchor>
      </div>
    </article>
  );
}
