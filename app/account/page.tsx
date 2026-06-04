import { MobileShell } from "@/components/mobile-shell";
import { AccountDistrictDisplay, AccountDistrictSettingRow, NotificationPreferencesEditor } from "@/components/account-profile-controls";
import { DemoSignOutButton } from "@/components/demo-auth-controls";
import { GamificationSync } from "@/components/gamification-sync";
import { AccountGamificationStats } from "@/components/gamification-live-stats";
import { MobileBottomNav, MobileCard, mobileViewAllClass } from "@/components/mobile-ui";
import { PartyAffiliationDisplay, PartyAffiliationSelector } from "@/components/party-affiliation-control";
import { PolicyInterestsEditor, SavedLedgerSummary } from "@/components/saved-ledger-controls";
import { SubscriptionBadge } from "@/components/subscription-controls";
import { getCurrentSession } from "@/lib/auth";
import { issueSignals } from "@/lib/issue-signals";
import Link from "next/link";
import type { ReactElement, ReactNode } from "react";
import {
  Bell,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  FileText,
  Home,
  LockKeyhole,
  LogOut,
  MessageSquarePlus,
  Search,
  ShieldCheck,
  UserRound
} from "lucide-react";

const settingRows = [
  {
    label: "Beta Testing",
    value: "Checklist and feedback",
    href: "/beta",
    icon: <MessageSquarePlus />
  },
  {
    label: "Privacy & Data",
    value: "Export, local data, and account privacy",
    href: "/account#data-handling",
    icon: <ShieldCheck />
  },
  {
    label: "Subscription",
    value: "Manage active plan",
    href: "/upgrade",
    icon: <CreditCard />
  },
  {
    label: "Weekly Brief",
    value: "Delivery and history",
    href: "/brief",
    icon: <CalendarClock />
  }
];

const premiumEyebrowClass = "text-[12px] font-semibold uppercase tracking-[0.08em] text-white/46";
const premiumCardTitleClass = "text-[22px] font-medium leading-tight text-white";
const premiumCardDescriptionClass = "mt-2 text-[13px] leading-snug text-white/54";
const premiumPanelClass = "rounded-2xl border border-white/10 bg-[#071a38]/62 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]";
const premiumHeaderIconClass =
  "grid h-12 w-12 place-items-center rounded-2xl border border-white/14 bg-white/8 text-[#ffb12b] shadow-[0_12px_28px_rgba(1,8,24,0.3)] [&>svg]:h-6 [&>svg]:w-6 [&>svg]:stroke-[1.8]";
const premiumHeaderGreenIconClass =
  "grid h-12 w-12 place-items-center rounded-2xl border border-white/14 bg-[#43ed74]/12 text-[#43ed74] shadow-[0_12px_28px_rgba(1,8,24,0.3)] [&>svg]:h-6 [&>svg]:w-6 [&>svg]:stroke-[1.8]";
const premiumScrollPanelClass = `${premiumPanelClass} max-h-[250px] overflow-y-auto overscroll-contain p-2 pb-3 pr-1`;

export default async function AccountPage() {
  const session = await getCurrentSession();
  const authenticated = Boolean(session);
  const profileDisplayName = session?.user.name?.trim() || (session?.mode === "production" ? "Capitol Ledger Citizen" : "Demo Citizen");

  return (
    <MobileShell
      minHeight="min-h-[1080px]"
      contentClassName="px-8 pb-5 pt-8"
      statusBarClassName="flex items-center justify-between text-[17px] font-semibold"
    >
      <GamificationSync />
      <header className="mt-12">
        <div className={premiumEyebrowClass}>Account Center</div>
        <h1 className="mt-2 text-[30px] font-medium leading-none text-white">Profile</h1>
        <p className="mt-3 max-w-[335px] text-[14px] leading-snug text-white/54">Manage your local civic profile, saved ledger, and alert signals.</p>
      </header>

      <main className="mt-7 space-y-4 pb-8">
              {!authenticated ? (
                <MobileCard variant="rust" className="overflow-hidden px-5 py-5">
                  <PremiumAccountHeader
                    aside={
                      <Link href="/sign-in?returnTo=%2Faccount" className={`${mobileViewAllClass} shrink-0 px-4 py-2 text-[13px]`}>
                        Sign in
                      </Link>
                    }
                    description="Sign in to keep your profile synced and access account-backed features."
                    eyebrow="Local Profile"
                    title="Browser profile mode"
                  />
                </MobileCard>
              ) : null}

              <MobileCard variant="rust" className="overflow-hidden px-5 py-5">
                <div className="grid grid-cols-[72px_minmax(0,1fr)] items-center gap-4">
                  <div className="grid justify-items-center gap-2">
                    <div className="relative grid h-[72px] w-[72px] shrink-0 place-items-center rounded-full border-2 border-[#ffb12b]/70 bg-[#ffb12b]/10 shadow-[0_0_24px_rgba(255,177,43,0.16)]">
                      <UserRound className="h-9 w-9 text-[#ffcf54]" strokeWidth={1.7} aria-hidden="true" />
                      <span className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full border border-[#061126] bg-[#43ed74]" aria-label={authenticated ? "Account profile synced" : "Local profile ready"}>
                        <CheckCircle2 className="h-4 w-4 text-[#061126]" strokeWidth={2.2} aria-hidden="true" />
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full border border-[#43ed74]/18 bg-[#43ed74]/8 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-[#74f49a]">
                      <CheckCircle2 className="h-3 w-3 shrink-0" strokeWidth={2} aria-hidden="true" />
                      {authenticated ? "Synced" : "Ready"}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className={premiumEyebrowClass}>Citizen Profile</div>
                    <h2 className={`${premiumCardTitleClass} mt-2`}>{profileDisplayName}</h2>
                    <AccountDistrictDisplay />
                    <div className="mt-3 flex flex-wrap items-center gap-2 [&>*]:mt-0 [&>*]:px-2.5 [&>*]:py-1 [&>*]:text-[11px]">
                      <PartyAffiliationDisplay />
                      <SubscriptionBadge />
                    </div>
                  </div>
                </div>
                <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-2.5 text-[12px] leading-snug text-white/50">
                  The avatar is a placeholder for the citizen account. Photo upload can come later; the green check means the profile has enough setup data to personalize district, alerts, and saved records.
                </div>
                <div className={`mt-5 ${premiumPanelClass} p-3`}>
                  <AccountGamificationStats className="grid grid-cols-3 gap-3" />
                </div>
              </MobileCard>

              <MobileCard variant="rust" className="overflow-hidden px-5 py-5">
                <PremiumAccountHeader
                  description="Free saved watchlist for officials, bills, alerts, and issue interests. Pro uses it for briefs and exportable reports; Team will add shared watchlists."
                  eyebrow="Saved Ledger"
                  icon={<ShieldCheck />}
                  iconTone="green"
                  title="Tracked civic watchlist"
                />
                <div className="mt-5">
                  <SavedLedgerSummary />
                </div>
              </MobileCard>

              <MobileCard variant="rust" className="overflow-hidden px-5 py-5">
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 [&::-webkit-details-marker]:hidden">
                    <span className="min-w-0">
                      <span className={premiumEyebrowClass}>Controls</span>
                      <span className={`${premiumCardTitleClass} mt-2 block`}>Account Settings</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2 text-[13px] font-medium text-white/46">
                      <span className="group-open:hidden">Expand</span>
                      <span className="hidden group-open:inline">Collapse</span>
                      <ChevronRight className="h-5 w-5 transition group-open:rotate-90" strokeWidth={1.8} aria-hidden="true" />
                    </span>
                  </summary>
                  <div className={`mt-5 divide-y divide-white/8 ${premiumScrollPanelClass}`}>
                    <PartyAffiliationSelector />
                    <AccountDistrictSettingRow />
                    <details className="group/notification py-4">
                      <summary className="grid cursor-pointer list-none grid-cols-[34px_1fr_auto] items-center gap-3 [&::-webkit-details-marker]:hidden">
                        <span className="text-[#ffb12b]">
                          <Bell className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[16px] font-semibold text-white">Notifications</span>
                          <span className="mt-1 block text-[13px] leading-snug text-white/52">Votes, district alerts, weekly brief</span>
                        </span>
                        <ChevronRight className="h-5 w-5 text-white/42 transition group-open/notification:rotate-90" strokeWidth={1.8} aria-hidden="true" />
                      </summary>
                      <div className="mt-3 pl-[46px]">
                        <NotificationPreferencesEditor compact dense />
                      </div>
                    </details>
                    {settingRows.map((row) => (
                      <SettingRow key={row.label} {...row} />
                    ))}
                    {authenticated ? (
                      <DemoSignOutButton
                        className="grid w-full grid-cols-[34px_1fr_auto] items-center gap-3 py-4 text-left transition disabled:opacity-60"
                      >
                        <span className="text-[#ffb12b]">
                          <LogOut className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[16px] font-semibold text-white">Sign out</span>
                          <span className="mt-1 block truncate text-[13px] text-white/52">Return to login screen</span>
                        </span>
                        <ChevronRight className="h-5 w-5 text-white/42" strokeWidth={1.8} aria-hidden="true" />
                      </DemoSignOutButton>
                    ) : (
                      <Link href="/sign-in?returnTo=%2Faccount" className="grid grid-cols-[34px_1fr_auto] items-center gap-3 py-4">
                        <span className="text-[#ffb12b]">
                          <UserRound className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[16px] font-semibold text-white">Sign in</span>
                          <span className="mt-1 block truncate text-[13px] text-white/52">Enable account sync and protected features</span>
                        </span>
                        <ChevronRight className="h-5 w-5 text-white/42" strokeWidth={1.8} aria-hidden="true" />
                      </Link>
                    )}
                  </div>
                </details>
              </MobileCard>

              <MobileCard variant="rust" className="overflow-hidden px-5 py-5">
                <PolicyInterestsEditor interests={[...issueSignals]} />
              </MobileCard>

              <div id="data-handling" className="scroll-mt-8">
                <MobileCard variant="rust" className="overflow-hidden px-5 py-5">
                  <PremiumAccountHeader
                    description="Your district, interests, and alert preferences stay private and are used only to personalize civic intelligence."
                    eyebrow="Data Handling"
                    icon={<LockKeyhole />}
                    iconTone="green"
                    title="Privacy Protected"
                  />
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-white/12 bg-white/5 px-3 py-3 text-center text-[13px] font-medium text-white/56">Data export planned</div>
                    <div className="rounded-xl border border-rust/30 bg-rust/10 px-3 py-3 text-center text-[13px] font-medium text-[#ffb12b]/82">Security controls planned</div>
                  </div>
                </MobileCard>
              </div>
      </main>

      <MobileBottomNav
        indicatorClassName="mx-auto mt-4 h-1.5 w-36 rounded-full bg-white"
        items={[
          { href: "/dashboard", icon: <Home />, label: "Home" },
          { href: "/search?type=bills", icon: <FileText />, label: "Bills" },
          { href: "/search", icon: <Search />, label: "Search" },
          { href: "/alerts", icon: <Bell />, label: "Alerts" },
          { active: true, href: "/account", icon: <UserRound />, label: "Profile" }
        ]}
      />
    </MobileShell>
  );
}

function PremiumAccountHeader({
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

function SettingRow({
  href,
  icon,
  label,
  value
}: {
  href: string;
  icon: ReactElement;
  label: string;
  value: string;
}) {
  return (
    <Link href={href} className="grid grid-cols-[34px_1fr_auto] items-center gap-3 py-4">
      <span className="text-[#ffb12b] [&>svg]:h-6 [&>svg]:w-6 [&>svg]:stroke-[1.8]">{icon}</span>
      <span className="min-w-0">
        <span className="block text-[16px] font-semibold text-white">{label}</span>
        <span className="mt-1 block truncate text-[13px] text-white/52">{value}</span>
      </span>
      <ChevronRight className="h-5 w-5 text-white/42" strokeWidth={1.8} aria-hidden="true" />
    </Link>
  );
}
