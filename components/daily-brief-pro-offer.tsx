import Link from "next/link";
import { ArrowRight, Check, ChevronDown, Crown } from "lucide-react";
import { PlanActionButton, PlanPrice, PlanTrialDisclosure } from "@/components/subscription-controls";
import { subscriptionPlans } from "@/lib/subscription-plans";
import type { AccountSubscriptionSnapshot } from "@/types/capitol";

const benefits = [
  { title: "Your watchlist, explained", detail: "What changed with the bills and officials you follow." },
  { title: "Context for your district", detail: "A written brief shaped by your district and saved interests." },
  { title: "What to watch next", detail: "Recommendations with sources and clear reasons for each pick." }
];
const purchaseActionClass = "mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#ffb12b] px-4 py-3 text-center text-[16px] font-semibold text-[#071225] transition hover:brightness-110 disabled:opacity-50";

export function DailyBriefProOffer({ initialSubscription = null }: { initialSubscription?: AccountSubscriptionSnapshot | null }) {
  return (
    <details id="personalized-brief" open className="group scroll-mt-6 overflow-hidden rounded-[1.35rem] border border-[#ffb12b]/30 bg-[linear-gradient(145deg,rgba(255,177,43,0.08),rgba(7,26,56,0.8)_55%)] px-5 py-5 text-white">
      <summary className="flex min-h-12 cursor-pointer list-none items-start gap-3 [&::-webkit-details-marker]:hidden">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[#ffb12b]/25 bg-[#ffb12b]/10 text-[#ffb12b]">
          <Crown className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="text-[14px] font-medium text-[#ffb12b]">{subscriptionPlans.pro.name}</span>
          <span className="mt-1 block text-[23px] font-medium leading-tight">Make the brief personal</span>
        </span>
        <ChevronDown className="mt-3 h-5 w-5 shrink-0 text-white/60 transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>

      <div className="mt-5 border-t border-white/10 pt-5">
        <p className="text-[16px] leading-relaxed text-white/65">Go beyond the headlines with a written brief built around what you follow.</p>
        <ul className="mt-5 space-y-4">
          {benefits.map((benefit) => (
            <li key={benefit.title} className="flex items-start gap-3">
              <Check className="mt-0.5 h-5 w-5 shrink-0 text-[#ffb12b]" aria-hidden="true" />
              <div>
                <h3 className="text-[16px] font-medium">{benefit.title}</h3>
                <p className="mt-1 text-[16px] leading-relaxed text-white/60">{benefit.detail}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-5 rounded-2xl border border-white/10 bg-[#020914]/40 px-4 py-4">
          <p className="text-[14px] font-medium text-white/60">Pro subscription</p>
          <PlanPrice plan="pro" initialSubscription={initialSubscription} defaultCycle="monthly" className="mt-2 flex flex-wrap items-baseline gap-2" priceClassName="text-[32px] font-semibold leading-none text-[#ffb12b]" unitClassName="text-[16px] text-white/60" />
          <div className="[&>div]:whitespace-normal [&>div]:text-[14px] [&>div]:leading-relaxed">
            <PlanTrialDisclosure plan="pro" initialSubscription={initialSubscription} defaultCycle="monthly" />
          </div>
          <p className="mt-3 text-[14px] leading-relaxed text-white/55">Trial eligibility and final purchase terms are confirmed by Apple.</p>
        </div>

        {initialSubscription ? (
          <PlanActionButton plan="pro" inactiveLabel="Get Pro" initialSubscription={initialSubscription} defaultCycle="monthly" className={purchaseActionClass} />
        ) : (
          <Link href="/sign-in?returnTo=%2Fbrief%23personalized-brief" className={purchaseActionClass}>
            Sign in to get Pro <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </Link>
        )}
        <Link href="/upgrade#plans" className="mt-2 flex min-h-11 items-center justify-center text-[14px] font-medium text-[#ffb12b] underline decoration-[#ffb12b]/40 underline-offset-4">Compare plans &amp; restore purchases</Link>
        <p className="mt-3 text-center text-[14px] leading-relaxed text-white/60">The Daily Brief video, transcript, and sources stay free.</p>
      </div>
    </details>
  );
}
