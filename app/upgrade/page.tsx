import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bell,
  Check,
  ChevronRight,
  Crown,
  FileText,
  Home,
  LockKeyhole,
  Search,
  ShieldCheck,
  Sparkles,
  Settings,
  UserRound,
  UsersRound
} from "lucide-react";
import { MobileShell } from "@/components/mobile-shell";
import { MobileBottomNav, MobileCard, mobileIconButtonClass, mobileProfileShortcutClass, mobileViewAllClass } from "@/components/mobile-ui";
import {
  BillingCycleToggle,
  PlanActionButton,
  PlanPrice,
  TeamSeatSelector,
  TeamWorkspacePreview
} from "@/components/subscription-controls";
import { MobileGlassScrollFrame } from "@/components/mobile-glass-scroll-frame";
import { getCurrentSession } from "@/lib/auth";
import { getEffectiveSubscriptionForAccountUser } from "@/lib/effective-account-subscription";
import { getCurrentAccountSubscription } from "@/lib/server-account-subscription";
import { isPlanFeatureEnabled, planComparisonRows, subscriptionPlans } from "@/lib/subscription-plans";
import { readTeamAccessSummaryForUser, type TeamAccessSummary } from "@/lib/team-access";
import { teamPausedProEntitlementId } from "@/lib/team-subscription-constants";
import type { AccountSubscriptionSnapshot, SubscriptionPlanId } from "@/types/capitol";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const upgradeDefaultCycle: AccountSubscriptionSnapshot["cycle"] = "annual";

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
const stripeLiveMode = process.env.STRIPE_LIVE_MODE === "true";
const showStripeSandboxNotice = stripePublishableKey.startsWith("pk_test_") && !stripeLiveMode;

const premiumEyebrowClass = "text-[12px] font-semibold uppercase tracking-[0.08em] text-white/46";
const premiumCardTitleClass = "text-[22px] font-medium leading-tight text-white";
const premiumCardDescriptionClass = "mt-2 text-[13px] leading-snug text-white/54";
const premiumPanelClass = "rounded-2xl border border-white/10 bg-[#071a38]/62 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]";
const premiumHeaderIconClass =
  "grid h-12 w-12 place-items-center rounded-2xl border border-white/14 bg-white/8 text-[#ffb12b] shadow-[0_12px_28px_rgba(1,8,24,0.3)] [&>svg]:h-6 [&>svg]:w-6 [&>svg]:stroke-[1.8]";
const premiumHeaderGreenIconClass =
  "grid h-12 w-12 place-items-center rounded-2xl border border-white/14 bg-[#43ed74]/12 text-[#43ed74] shadow-[0_12px_28px_rgba(1,8,24,0.3)] [&>svg]:h-6 [&>svg]:w-6 [&>svg]:stroke-[1.8]";

export default async function UpgradePage() {
  const [initialPersonalSubscription, session] = await Promise.all([getCurrentAccountSubscription(), getCurrentSession()]);
  const teamAccess = session?.user ? await readTeamAccessSummaryForUser(session.user, initialPersonalSubscription).catch(() => null) : null;
  if (session?.user && teamAccess) {
    await getEffectiveSubscriptionForAccountUser(session.user, initialPersonalSubscription).catch(() => initialPersonalSubscription);
  }
  const initialSubscription =
    session?.user && teamAccess ? await getCurrentAccountSubscription().catch(() => initialPersonalSubscription) : initialPersonalSubscription;

  return (
    <MobileShell
      minHeight="min-h-[1080px]"
      contentClassName="px-8 pb-5 pt-8"
      statusBarClassName="flex items-center justify-between text-[17px] font-semibold"
    >
      <header className="relative mt-10 flex items-center justify-center">
        <Link href="/dashboard" className={`absolute left-0 ${mobileIconButtonClass}`} aria-label="Back to dashboard">
          <ArrowLeft className="h-7 w-7" strokeWidth={2.2} aria-hidden="true" />
        </Link>
        <h1 className="text-[30px] font-medium leading-none text-white">Upgrade</h1>
        <Link href="/profile" className={`absolute right-0 ${mobileProfileShortcutClass}`} aria-label="Open profile">
          <UserRound strokeWidth={1.9} aria-hidden="true" />
          <span className="text-[10px] font-semibold leading-none text-white/72">Profile</span>
        </Link>
      </header>

      <main className="mt-7 space-y-4 pb-8">
        <MobileCard variant="rust" className="overflow-hidden px-5 py-5">
          <PremiumUpgradeHeader
            aside={<span className={premiumHeaderIconClass}><Crown /></span>}
            description="Choose Pro for personal tracking, or Team when several people need the same workspace."
            eyebrow="Plans"
            title="Choose a plan"
          />
          <div className="mt-5 grid grid-cols-3 gap-2">
            <ValuePill label="Alerts" value="Faster" />
            <ValuePill label="Sources" value="Linked" />
            <ValuePill label="Briefs" value="Weekly" />
          </div>
          <Link href="#plans" className={`${mobileViewAllClass} mt-5 flex h-11 items-center justify-center`}>
            View plans
          </Link>
        </MobileCard>

        {teamAccess ? <TeamAccessStatusCard access={teamAccess} subscription={initialSubscription} /> : null}

        <div id="plans">
          <MobileCard variant="rust" className="overflow-hidden px-5 py-5">
            <PremiumUpgradeHeader
              description="Choose monthly or annual billing before picking a plan."
              eyebrow="Billing"
              icon={<Sparkles />}
              title="Billing cycle"
            />
            <div className="mt-5">
              <BillingCycleToggle initialSubscription={initialSubscription} defaultCycle={upgradeDefaultCycle} />
            </div>
          </MobileCard>
        </div>

        {showStripeSandboxNotice ? (
          <MobileCard variant="rust" className="overflow-hidden px-5 py-5">
            <PremiumUpgradeHeader
              description="Checkout is in test mode. Use card 4242 4242 4242 4242 with any future expiration, CVC, and ZIP code."
              eyebrow="Test checkout"
              icon={<ShieldCheck />}
              title="No real payment needed"
            />
          </MobileCard>
        ) : null}

        <section className="space-y-3" aria-label="Subscription plans">
          <PlanTierCard
            badge="Best Value"
            featured
            icon={<Crown />}
            inactiveLabel="Upgrade to Pro"
            initialSubscription={initialSubscription}
            defaultCycle={upgradeDefaultCycle}
            plan="pro"
          />
          <PlanTierCard
            icon={<ShieldCheck />}
            inactiveLabel="Use Free"
            initialSubscription={initialSubscription}
            defaultCycle={upgradeDefaultCycle}
            plan="free"
          />
          <PlanTierCard
            badge="Team plan"
            icon={<Sparkles />}
            inactiveLabel="Start Team"
            initialSubscription={initialSubscription}
            defaultCycle={upgradeDefaultCycle}
            plan="team"
          />
        </section>

        <MobileCard variant="rust" className="overflow-hidden px-5 py-5">
          <TeamWorkspacePreview />
        </MobileCard>

        <MobileCard variant="rust" className="overflow-hidden px-5 py-5">
          <details className="group">
            <summary className="flex cursor-pointer list-none items-start justify-between gap-4 [&::-webkit-details-marker]:hidden">
              <span className="min-w-0">
                <span className={premiumEyebrowClass}>Plan comparison</span>
                <span className={`${premiumCardTitleClass} mt-2 block`}>Compare plans</span>
                <span className={premiumCardDescriptionClass}>See the main differences between Free, Pro, and Team.</span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <span className={premiumHeaderIconClass}>
                  <LockKeyhole />
                </span>
                <ChevronRight className="h-5 w-5 text-white/42 transition group-open:rotate-90" strokeWidth={1.8} aria-hidden="true" />
              </span>
            </summary>
            <MobileGlassScrollFrame className="p-3 pb-4">
              <div className="grid grid-cols-[1fr_44px_44px_44px] gap-2 pb-2 text-center text-[10px] font-semibold uppercase tracking-[0.08em] text-white/42">
                <span className="text-left">Feature</span>
                <span>Free</span>
                <span>Pro</span>
                <span>Team</span>
              </div>
              <div className="divide-y divide-white/8">
                {planComparisonRows.map(({ featureId, label }) => (
                  <div key={label} className="grid grid-cols-[1fr_44px_44px_44px] items-center gap-2 py-3">
                    <span className="text-[13px] leading-snug text-white/64">{label}</span>
                    <PlanCheck enabled={isPlanFeatureEnabled("free", featureId)} />
                    <PlanCheck enabled={isPlanFeatureEnabled("pro", featureId)} />
                    <PlanCheck enabled={isPlanFeatureEnabled("team", featureId)} />
                  </div>
                ))}
              </div>
            </MobileGlassScrollFrame>
          </details>
        </MobileCard>
      </main>

      <MobileBottomNav
        items={[
          { href: "/dashboard", icon: <Home />, label: "Home" },
          { href: "/search?type=bills", icon: <FileText />, label: "Bills" },
          { href: "/search", icon: <Search />, label: "Search" },
          { href: "/alerts", icon: <Bell />, label: "Alerts" },
          { active: true, href: "/settings", icon: <Settings />, label: "Settings" }
        ]}
      />
    </MobileShell>
  );
}

function TeamAccessStatusCard({
  access,
  subscription
}: {
  access: TeamAccessSummary;
  subscription: AccountSubscriptionSnapshot | null;
}) {
  const roleLabel = formatTeamRoleLabel(access.role);
  const proPausedForTeam = subscription?.providerEntitlementId === teamPausedProEntitlementId;
  const personalPlanLabel = proPausedForTeam ? "Pro paused" : subscription ? subscriptionPlans[subscription.plan].name : "Personal";
  const description = access.isBillingOwner
    ? `Your ${personalPlanLabel} billing owns this workspace, and owner access does not use a team seat.`
    : proPausedForTeam
      ? `Your personal Pro billing is paused while this Team seat gives you ${roleLabel} access.`
      : `Your personal plan remains ${personalPlanLabel}. Your Team seat gives you ${roleLabel} access to this workspace.`;

  return (
    <MobileCard variant="rust" className="overflow-hidden px-5 py-5">
      <PremiumUpgradeHeader
        aside={<span className={premiumHeaderGreenIconClass}><UsersRound /></span>}
        description={description}
        eyebrow="Team Access"
        title={`${access.workspace.name} is active`}
      />
      <div className="mt-5 grid grid-cols-3 gap-2">
        <ValuePill label="Role" value={access.isBillingOwner ? "Owner" : roleLabel} />
        <ValuePill label="Seats" value={`${access.workspace.occupiedSeats}/${access.workspace.seatCount}`} />
        <ValuePill label="Open" value={String(access.workspace.openSeats)} />
      </div>
      <Link href="/team" className={`${mobileViewAllClass} mt-5 flex h-11 items-center justify-center`}>
        Open Team page
      </Link>
    </MobileCard>
  );
}

function formatTeamRoleLabel(role: TeamAccessSummary["role"]) {
  if (role === "owner") return "Owner";
  if (role === "admin") return "Admin";
  if (role === "viewer") return "Viewer";
  return "Analyst";
}

function PremiumUpgradeHeader({
  aside,
  description,
  eyebrow,
  icon,
  iconTone = "gold",
  title
}: {
  aside?: ReactNode;
  description?: ReactNode;
  eyebrow: string;
  icon?: ReactNode;
  iconTone?: "gold" | "green";
  title: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
      <div className="min-w-0">
        <div className={premiumEyebrowClass}>{eyebrow}</div>
        <h2 className={`${premiumCardTitleClass} mt-2`}>{title}</h2>
        {description ? <p className={premiumCardDescriptionClass}>{description}</p> : null}
      </div>
      {aside ? <div className="shrink-0">{aside}</div> : icon ? <span className={iconTone === "green" ? premiumHeaderGreenIconClass : premiumHeaderIconClass}>{icon}</span> : null}
    </div>
  );
}

function ValuePill({ label, value }: { label: string; value: string }) {
  return (
    <div className={`${premiumPanelClass} px-2 py-3 text-center`}>
      <div className="truncate text-[16px] font-semibold leading-none text-[#ffb12b]">{value}</div>
      <div className="mt-2 truncate text-[10px] leading-tight text-white/46">{label}</div>
    </div>
  );
}

function PlanTierCard({
  badge,
  defaultCycle,
  featured = false,
  icon,
  inactiveLabel,
  initialSubscription,
  plan
}: {
  badge?: string;
  defaultCycle?: AccountSubscriptionSnapshot["cycle"];
  featured?: boolean;
  icon: ReactNode;
  inactiveLabel: string;
  initialSubscription?: AccountSubscriptionSnapshot | null;
  plan: SubscriptionPlanId;
}) {
  const planDetails = subscriptionPlans[plan];
  const actionClassName = featured
    ? "mt-5 flex h-11 w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#ffdf63] via-[#ffb12b] to-[#ff8a00] text-[14px] font-semibold text-[#071225] shadow-[0_0_24px_rgba(255,177,43,0.22)] transition disabled:opacity-45"
    : "mt-5 flex h-11 w-full items-center justify-center rounded-xl border border-white/12 bg-white/[0.045] text-[14px] font-semibold text-white/72 transition disabled:opacity-45";

  return (
    <div id={plan === "team" ? "team-plan" : undefined} className="scroll-mt-6">
      <MobileCard
        variant="rust"
        className={`relative overflow-hidden px-5 py-5 ${featured ? "border-[#ffb12b]/55 shadow-[0_0_34px_rgba(255,177,43,0.16)]" : ""}`}
      >
      {badge ? <div className={`absolute right-5 top-5 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${featured ? "bg-[#ffb12b] text-[#061126]" : "border border-white/10 bg-white/[0.045] text-white/52"}`}>{badge}</div> : null}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
        <div className="min-w-0 pr-14">
          <div className={premiumEyebrowClass}>{featured ? "Recommended" : "Plan"}</div>
          <h2 className={`${premiumCardTitleClass} mt-2`}>{planDetails.name}</h2>
          <p className={premiumCardDescriptionClass}>{planDetails.description}.</p>
        </div>
        <span className={featured ? premiumHeaderIconClass : plan === "free" ? premiumHeaderGreenIconClass : premiumHeaderIconClass}>{icon}</span>
      </div>
      <PlanPrice
        plan={plan}
        initialSubscription={initialSubscription}
        defaultCycle={defaultCycle}
        className="mt-4 flex items-end gap-2"
        priceClassName={`${featured ? "text-[36px]" : "text-[30px]"} font-semibold leading-none ${plan === "free" ? "text-white" : "text-[#ffb12b]"}`}
        unitClassName="pb-1 text-[12px] text-white/50"
      />
      {plan === "team" ? <TeamSeatSelector className="mt-4" compact initialSubscription={initialSubscription} defaultCycle={defaultCycle} /> : null}
      <FeatureList items={planDetails.highlights} />
      <PlanActionButton plan={plan} inactiveLabel={inactiveLabel} initialSubscription={initialSubscription} defaultCycle={defaultCycle} className={actionClassName} />
      </MobileCard>
    </div>
  );
}

function FeatureList({ items }: { items: string[] }) {
  return (
    <div className="mt-4 grid gap-2">
      {items.map((item) => (
        <div key={item} className="flex items-center gap-2 text-[13px] leading-snug text-white/68">
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-[#ffb12b]/55 text-[#ffb12b]">
            <Check className="h-3.5 w-3.5" strokeWidth={2.1} aria-hidden="true" />
          </span>
          {item}
        </div>
      ))}
    </div>
  );
}

function PlanCheck({ enabled }: { enabled: boolean }) {
  return (
    <span className={`mx-auto grid h-6 w-6 place-items-center rounded-full ${enabled ? "border border-[#ffb12b]/65 text-[#ffb12b]" : "bg-white/8 text-white/24"}`}>
      {enabled ? <Check className="h-4 w-4" strokeWidth={2.1} aria-hidden="true" /> : "-"}
    </span>
  );
}
