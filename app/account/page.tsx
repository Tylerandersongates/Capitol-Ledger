import { MobileShell } from "@/components/mobile-shell";
import { AccountDistrictDisplay } from "@/components/account-profile-controls";
import { GamificationSync } from "@/components/gamification-sync";
import { AccountGamificationStats } from "@/components/gamification-live-stats";
import { MobileBottomNav, MobileCard } from "@/components/mobile-ui";
import { PartyAffiliationDisplay } from "@/components/party-affiliation-control";
import { PolicyInterestsEditor, SavedLedgerSummary } from "@/components/saved-ledger-controls";
import { SubscriptionBadge } from "@/components/subscription-controls";
import { getAccountLedger } from "@/lib/account-ledger";
import { getAccountPersistenceUserId, readLedgerFromDatabase, readProfileFromDatabase } from "@/lib/account-database";
import { issueSignals } from "@/lib/issue-signals";
import { requireAccountSession } from "@/lib/route-guards";
import { getSubscriptionForAccountUser } from "@/lib/server-account-subscription";
import type { ReactNode } from "react";
import {
  Bell,
  CheckCircle2,
  FileText,
  Home,
  Search,
  ShieldCheck,
  Settings,
  UserRound
} from "lucide-react";

const premiumEyebrowClass = "text-[12px] font-semibold uppercase tracking-[0.08em] text-white/46";
const premiumCardTitleClass = "text-[22px] font-medium leading-tight text-white";
const premiumCardDescriptionClass = "mt-2 text-[13px] leading-snug text-white/54";
const premiumPanelClass = "rounded-2xl border border-white/10 bg-[#071a38]/62 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]";
const premiumHeaderIconClass =
  "grid h-12 w-12 place-items-center rounded-2xl border border-white/14 bg-white/8 text-[#ffb12b] shadow-[0_12px_28px_rgba(1,8,24,0.3)] [&>svg]:h-6 [&>svg]:w-6 [&>svg]:stroke-[1.8]";
const premiumHeaderGreenIconClass =
  "grid h-12 w-12 place-items-center rounded-2xl border border-white/14 bg-[#43ed74]/12 text-[#43ed74] shadow-[0_12px_28px_rgba(1,8,24,0.3)] [&>svg]:h-6 [&>svg]:w-6 [&>svg]:stroke-[1.8]";

export default async function AccountPage() {
  const session = await requireAccountSession("/account");
  const profileDisplayName = session?.user.name?.trim() || (session?.mode === "production" ? "Capitol Ledger Citizen" : "Demo Citizen");
  const accountUserId = await getAccountPersistenceUserId(session.user).catch(() => session.user.id);
  const [initialLedger, initialProfile, initialSubscription] = await Promise.all([
    readLedgerFromDatabase(accountUserId).catch(() => null),
    readProfileFromDatabase(accountUserId).catch(() => null),
    getSubscriptionForAccountUser(session.user).catch(() => null)
  ]);
  const accountLedger = initialLedger ?? getAccountLedger(accountUserId);
  const initialAlertCount = initialProfile
    ? [
        initialProfile.notificationPreferences.districtAlerts,
        initialProfile.notificationPreferences.voteReminders,
        initialProfile.notificationPreferences.weeklyBrief
      ].filter(Boolean).length
    : undefined;

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
              <MobileCard variant="rust" className="overflow-hidden px-5 py-5">
                <div className="grid grid-cols-[72px_minmax(0,1fr)] items-center gap-4">
                  <div className="grid justify-items-center gap-2">
                    <div className="relative grid h-[72px] w-[72px] shrink-0 place-items-center rounded-full border-2 border-[#ffb12b]/70 bg-[#ffb12b]/10 shadow-[0_0_24px_rgba(255,177,43,0.16)]">
                      <UserRound className="h-9 w-9 text-[#ffcf54]" strokeWidth={1.7} aria-hidden="true" />
                      <span className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full border border-[#061126] bg-[#43ed74]" aria-label="Account profile synced">
                        <CheckCircle2 className="h-4 w-4 text-[#061126]" strokeWidth={2.2} aria-hidden="true" />
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full border border-[#43ed74]/18 bg-[#43ed74]/8 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-[#74f49a]">
                      <CheckCircle2 className="h-3 w-3 shrink-0" strokeWidth={2} aria-hidden="true" />
                      Synced
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className={premiumEyebrowClass}>Citizen Profile</div>
                    <h2 className={`${premiumCardTitleClass} mt-2`}>{profileDisplayName}</h2>
                    <AccountDistrictDisplay />
                    <div className="mt-3 grid max-w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-1.5 [&>*]:mt-0 [&>*]:min-w-0 [&>*]:px-2 [&>*]:py-1 [&>*]:text-[10px]">
                      <PartyAffiliationDisplay />
                      <SubscriptionBadge initialSubscription={initialSubscription} />
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
                  <SavedLedgerSummary initialAlertCount={initialAlertCount} initialLedger={accountLedger} />
                </div>
              </MobileCard>

              <MobileCard variant="rust" className="overflow-hidden px-5 py-5">
                <PolicyInterestsEditor initialSelectedInterests={accountLedger.issueInterests} interests={[...issueSignals]} />
              </MobileCard>
      </main>

      <MobileBottomNav
        indicatorClassName="mx-auto mt-4 h-1.5 w-36 rounded-full bg-white"
        items={[
          { href: "/dashboard", icon: <Home />, label: "Home" },
          { href: "/search?type=bills", icon: <FileText />, label: "Bills" },
          { href: "/search", icon: <Search />, label: "Search" },
          { href: "/alerts", icon: <Bell />, label: "Alerts" },
          { href: "/settings", icon: <Settings />, label: "Settings" }
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
