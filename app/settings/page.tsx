import {
  AccountDistrictSettingRow,
  NotificationPreferencesEditor
} from "@/components/account-profile-controls";
import { AccountDeletionControl } from "@/components/account-deletion-control";
import { DemoSignOutButton } from "@/components/demo-auth-controls";
import { MobileGlassScrollFrame } from "@/components/mobile-glass-scroll-frame";
import { MobileShell } from "@/components/mobile-shell";
import { MobileBottomNav, MobileCard, mobileIconButtonClass, mobileProfileShortcutClass } from "@/components/mobile-ui";
import { PartyAffiliationSelector } from "@/components/party-affiliation-control";
import { SettingsAccountSyncStatus } from "@/components/settings-account-sync-status";
import { getCurrentSession } from "@/lib/auth";
import Link from "next/link";
import type { ReactElement, ReactNode } from "react";
import {
  Bell,
  CalendarClock,
  ChevronRight,
  CreditCard,
  FileText,
  Home,
  LifeBuoy,
  LockKeyhole,
  LogOut,
  MessageSquarePlus,
  Search,
  Settings,
  ShieldCheck,
  Trash2,
  UserRound
} from "lucide-react";

const settingRows = [
  {
    label: "Report an issue",
    value: "Live app testing",
    href: "/feedback?source=live-testing",
    icon: <MessageSquarePlus />
  },
  {
    label: "Privacy",
    value: "Privacy and data",
    href: "/privacy",
    icon: <ShieldCheck />
  },
  {
    label: "Support",
    value: "Help and requests",
    href: "/support",
    icon: <LifeBuoy />
  },
  {
    label: "Plan",
    value: "Plan & purchases",
    href: "/upgrade",
    icon: <CreditCard />
  },
  {
    label: "Daily brief",
    value: "Recent briefs",
    href: "/brief",
    icon: <CalendarClock />
  },
  {
    label: "Delete account",
    value: "Permanent account deletion",
    href: "#delete-account",
    icon: <Trash2 />
  }
];

const premiumEyebrowClass = "text-[12px] font-semibold uppercase tracking-[0.08em] text-white/46";
const premiumCardTitleClass = "text-[22px] font-medium leading-tight text-white";
const premiumCardDescriptionClass = "mt-2 text-[13px] leading-snug text-white/54";
const premiumHeaderIconClass =
  "grid h-12 w-12 place-items-center rounded-2xl border border-white/14 bg-white/8 text-[#ffb12b] shadow-[0_12px_28px_rgba(1,8,24,0.3)] [&>svg]:h-6 [&>svg]:w-6 [&>svg]:stroke-[1.8]";
const premiumHeaderGreenIconClass =
  "grid h-12 w-12 place-items-center rounded-2xl border border-white/14 bg-[#43ed74]/12 text-[#43ed74] shadow-[0_12px_28px_rgba(1,8,24,0.3)] [&>svg]:h-6 [&>svg]:w-6 [&>svg]:stroke-[1.8]";

export default async function SettingsPage() {
  const session = await getCurrentSession();
  const authenticated = Boolean(session);
  const hasProductionAccount = session?.mode === "production";

  return (
    <MobileShell
      minHeight="min-h-[980px]"
      contentClassName="px-8 pb-5 pt-8"
      statusBarClassName="flex items-center justify-between text-[17px] font-semibold"
    >
      <header className="mt-12 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className={premiumEyebrowClass}>Your account</div>
          <h1 className="mt-2 text-[30px] font-medium leading-none text-white">Settings</h1>
          <p className="mt-3 max-w-[335px] text-[14px] leading-snug text-white/54">
            Manage your profile, alerts, plan, privacy, and sign-in.
          </p>
        </div>
        <Link href="/profile" className={mobileProfileShortcutClass} aria-label="Open profile">
          <UserRound strokeWidth={1.8} aria-hidden="true" />
          <span className="text-[10px] font-semibold leading-none text-white/72">Profile</span>
        </Link>
      </header>

      <main className="mt-7 space-y-4 pb-8">
        <SettingsAccountSyncStatus authenticated={authenticated} userEmail={session?.user.email} />

        <MobileCard variant="rust" className="overflow-hidden px-5 py-5">
          <PremiumSettingsHeader
            description="Update the basics used to personalize your dashboard and alerts."
            eyebrow="Preferences"
            icon={<Settings />}
            title="Account"
          />
          <MobileGlassScrollFrame className="divide-y divide-white/8">
            <PartyAffiliationSelector />
            <AccountDistrictSettingRow />
            <details className="group/notification py-4">
              <summary className="grid cursor-pointer list-none grid-cols-[34px_1fr_auto] items-center gap-3 [&::-webkit-details-marker]:hidden">
                <span className="text-[#ffb12b]">
                  <Bell className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[16px] font-semibold text-white">Notifications</span>
                  <span className="mt-1 block text-[13px] leading-snug text-white/52">Votes, local updates, daily brief</span>
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
              <DemoSignOutButton className="grid w-full grid-cols-[34px_1fr_auto] items-center gap-3 py-4 text-left transition disabled:opacity-60">
                <span className="text-[#ffb12b]">
                  <LogOut className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[16px] font-semibold text-white">Sign out</span>
                  <span className="mt-1 block truncate text-[13px] text-white/52">End this session</span>
                </span>
                <ChevronRight className="h-5 w-5 text-white/42" strokeWidth={1.8} aria-hidden="true" />
              </DemoSignOutButton>
            ) : (
              <Link href="/sign-in?returnTo=%2Fsettings" className="grid grid-cols-[34px_1fr_auto] items-center gap-3 py-4">
                <span className="text-[#ffb12b]">
                  <UserRound className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[16px] font-semibold text-white">Sign in</span>
                  <span className="mt-1 block truncate text-[13px] text-white/52">Save settings to your account</span>
                </span>
                <ChevronRight className="h-5 w-5 text-white/42" strokeWidth={1.8} aria-hidden="true" />
              </Link>
            )}
          </MobileGlassScrollFrame>
        </MobileCard>

        <div id="data-handling" className="scroll-mt-8">
          <MobileCard variant="rust" className="overflow-hidden px-5 py-5">
            <PremiumSettingsHeader
              description="Your district, topics, and alert choices stay private and are used only to personalize the app."
              eyebrow="Privacy"
              icon={<LockKeyhole />}
              iconTone="green"
              title="Your data"
            />
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Link href="/privacy" className="rounded-xl border border-white/12 bg-white/5 px-3 py-3 text-center text-[13px] font-medium text-white/70 transition hover:bg-white/8">
                Privacy policy
              </Link>
              <Link href="/support" className="rounded-xl border border-rust/30 bg-rust/10 px-3 py-3 text-center text-[13px] font-medium text-[#ffb12b]/86 transition hover:bg-rust/15">
                Support requests
              </Link>
            </div>
            <AccountDeletionControl authenticated={hasProductionAccount} />
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
          { active: true, href: "/settings", icon: <Settings />, label: "Settings" }
        ]}
      />
    </MobileShell>
  );
}

function PremiumSettingsHeader({
  description,
  eyebrow,
  icon,
  iconTone = "gold",
  title
}: {
  description?: ReactNode;
  eyebrow: string;
  icon: ReactNode;
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
      <span className={iconTone === "green" ? premiumHeaderGreenIconClass : premiumHeaderIconClass}>{icon}</span>
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
