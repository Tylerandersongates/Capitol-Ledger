import { MobileShell } from "@/components/mobile-shell";
import { AccountDistrictDisplay, AccountDistrictSettingRow, NotificationPreferencesEditor } from "@/components/account-profile-controls";
import { DemoSignOutButton } from "@/components/demo-auth-controls";
import { GamificationSync } from "@/components/gamification-sync";
import { AccountGamificationStats } from "@/components/gamification-live-stats";
import { MobileBottomNav, MobileCard } from "@/components/mobile-ui";
import { PartyAffiliationDisplay, PartyAffiliationSelector } from "@/components/party-affiliation-control";
import { PolicyInterestsEditor, SavedLedgerSummary } from "@/components/saved-ledger-controls";
import { AccountSubscriptionSummary, SubscriptionBadge, SubscriptionDemoSwitcher } from "@/components/subscription-controls";
import { WeeklyBriefDeliveryCard } from "@/components/weekly-brief-delivery";
import { requireAccountSession } from "@/lib/route-guards";
import Link from "next/link";
import type { ReactElement } from "react";
import {
  Bell,
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
  SlidersHorizontal,
  UserRound
} from "lucide-react";

const policyInterests = ["Healthcare", "Education", "Infrastructure", "Veterans Affairs", "Environment", "Public Safety"];

const settingRows = [
  {
    label: "Notifications",
    value: "Votes, bills, representatives",
    href: "/alerts",
    icon: <Bell />
  },
  {
    label: "Beta Testing",
    value: "Checklist and feedback",
    href: "/beta",
    icon: <MessageSquarePlus />
  },
  {
    label: "Privacy",
    value: "Nonpartisan data controls",
    href: "/account",
    icon: <ShieldCheck />
  },
  {
    label: "Subscription",
    value: "Manage active plan",
    href: "/upgrade",
    icon: <CreditCard />
  }
];

export default async function AccountPage() {
  await requireAccountSession("/account");

  return (
    <MobileShell
      minHeight="min-h-[1080px]"
      contentClassName="px-8 pb-5 pt-8"
      backgroundClassName="bg-[radial-gradient(circle_at_22%_10%,rgba(34,141,255,0.24),transparent_32%),radial-gradient(circle_at_82%_24%,rgba(246,216,75,0.13),transparent_27%),linear-gradient(155deg,#061a33_0%,#020916_54%,#06182d_100%)]"
      statusBarClassName="flex items-center justify-between text-[17px] font-semibold"
    >
            <GamificationSync />
            <header className="mt-12">
              <div>
                <div className="text-[18px] uppercase tracking-wide text-white/54">Account</div>
                <h1 className="mt-1 text-[28px] font-medium leading-none text-white">Profile</h1>
              </div>
            </header>

            <main className="mt-7 space-y-4 pb-8">
              <MobileCard variant="dashboard" className="overflow-hidden px-5 py-5">
                <div className="grid grid-cols-[76px_minmax(0,1fr)] items-center gap-4">
                  <div className="relative grid h-[76px] w-[76px] shrink-0 place-items-center rounded-full border-2 border-[#ffb12b]/80 bg-[#ffb12b]/10 shadow-[0_0_26px_rgba(255,177,43,0.16)]">
                    <UserRound className="h-10 w-10 text-[#ffcf54]" strokeWidth={1.7} aria-hidden="true" />
                    <span className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full border border-[#061126] bg-[#43ed74]">
                      <CheckCircle2 className="h-4 w-4 text-[#061126]" strokeWidth={2.2} aria-hidden="true" />
                    </span>
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-[23px] font-medium leading-tight">Demo Citizen</h2>
                    <AccountDistrictDisplay />
                    <PartyAffiliationDisplay />
                    <SubscriptionBadge />
                  </div>
                </div>
                <AccountGamificationStats />
              </MobileCard>

              <MobileCard variant="dashboard" className="px-5 py-5">
                <AccountSubscriptionSummary />
              </MobileCard>

              <MobileCard variant="dashboard" className="px-5 py-5">
                <SubscriptionDemoSwitcher />
              </MobileCard>

              <MobileCard variant="dashboard" className="px-5 py-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[13px] font-medium uppercase tracking-wide text-white/50">Saved Ledger</div>
                    <h2 className="mt-2 text-[21px] font-medium leading-none">Your tracked civic records</h2>
                  </div>
                  <ShieldCheck className="h-7 w-7 text-[#43ed74]" strokeWidth={1.8} aria-hidden="true" />
                </div>
                <div className="mt-5">
                  <SavedLedgerSummary />
                </div>
              </MobileCard>

              <MobileCard variant="dashboard" className="px-5 py-5">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="h-5 w-5 text-[#ffb12b]" strokeWidth={1.8} aria-hidden="true" />
                  <h2 className="text-[21px] font-medium leading-none">Account Settings</h2>
                </div>
                <div className="mt-5 divide-y divide-white/8">
                  <PartyAffiliationSelector />
                  <AccountDistrictSettingRow />
                  {settingRows.map((row) => (
                    <SettingRow key={row.label} {...row} />
                  ))}
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
                </div>
              </MobileCard>

              <MobileCard variant="dashboard" className="px-5 py-5">
                <PolicyInterestsEditor interests={policyInterests} />
              </MobileCard>

              <MobileCard variant="dashboard" className="px-5 py-5">
                <div className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-[#ffb12b]" strokeWidth={1.8} aria-hidden="true" />
                  <h2 className="text-[21px] font-medium leading-none">Alert Preferences</h2>
                </div>
                <NotificationPreferencesEditor />
              </MobileCard>

              <MobileCard variant="dashboard" className="px-5 py-5">
                <WeeklyBriefDeliveryCard />
              </MobileCard>

              <MobileCard variant="dashboard" className="px-5 py-5">
                <div className="flex items-start gap-4">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#43ed74]/12 text-[#43ed74]">
                    <LockKeyhole className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
                  </div>
                  <div>
                    <h2 className="text-[21px] font-medium leading-none">Privacy Protected</h2>
                    <p className="mt-3 text-[15px] leading-snug text-white/60">
                      Your district, interests, and alert preferences stay private and are used only to personalize civic intelligence.
                    </p>
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-white/12 bg-white/5 px-3 py-3 text-center text-[13px] font-medium text-white/56">Data export planned</div>
                  <div className="rounded-xl border border-rust/30 bg-rust/10 px-3 py-3 text-center text-[13px] font-medium text-[#ffb12b]/82">Security controls planned</div>
                </div>
              </MobileCard>
            </main>

            <MobileBottomNav
              className="sticky bottom-0 -mx-8 mt-auto border-t border-white/8 bg-[#031126]/96 px-8 pb-3 pt-4 backdrop-blur-xl"
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
