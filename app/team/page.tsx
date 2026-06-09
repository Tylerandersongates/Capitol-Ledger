import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Bell,
  FileText,
  Home,
  ListChecks,
  Map,
  ShieldCheck,
  UserPlus,
  Settings,
  UserRound,
  UsersRound
} from "lucide-react";
import { MobileShell } from "@/components/mobile-shell";
import { MobileBottomNav, MobileCard, mobileIconButtonClass, mobileViewAllClass } from "@/components/mobile-ui";
import { getAllBills, getBill, getBillStatus, getMember, getRecentUpdates } from "@/lib/data";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const premiumEyebrowClass = "text-[12px] font-semibold uppercase tracking-[0.1em] text-white/48";
const premiumPanelClass =
  "rounded-[1.15rem] border border-white/10 bg-[linear-gradient(180deg,rgba(29,83,145,0.22)_0%,rgba(7,23,50,0.68)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_12px_24px_rgba(2,10,28,0.22)]";
const premiumIconTileClass =
  "grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-[#ffb12b]/24 bg-[#ffb12b]/10 text-[#ffb12b] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_18px_rgba(255,177,43,0.16)]";

const teamMetrics = [
  { label: "Seats", value: "4" },
  { label: "Watchlists", value: "12" },
  { label: "Shared alerts", value: "38" }
];

const accountabilitySignals = [
  { label: "Coverage", value: "78%", tone: "text-[#43ed74]" },
  { label: "Action items", value: "6", tone: "text-[#ffb12b]" },
  { label: "Priority votes", value: "4", tone: "text-[#69a8ff]" }
];

const focusAreas = [
  "Affordability",
  "Border security",
  "Jobs",
  "Healthcare",
  "Infrastructure",
  "Education"
];

const teamRoles = [
  {
    description: "Billing owner, invite manager, and workspace settings.",
    label: "Owner",
    value: "1"
  },
  {
    description: "Builds watchlists, prepares briefs, and tags alerts.",
    label: "Analyst",
    value: "2"
  },
  {
    description: "Reads shared reports, alerts, and accountability scores.",
    label: "Viewer",
    value: "1"
  }
];

export default function TeamWorkspacePage() {
  const watchlistBills = getAllBills()
    .slice(0, 3)
    .map((bill) => ({
      href: `/bills/${bill.id}`,
      id: bill.id,
      meta: bill.committeeName ?? bill.policyArea,
      status: getBillStatus(bill),
      title: bill.shortTitle,
      value: bill.displayNumber
    }));

  const alertQueue = getRecentUpdates()
    .slice(0, 4)
    .map((event) => {
      const bill = event.targetType === "bill" ? getBill(event.targetId) : undefined;
      const member = event.targetType === "member" ? getMember(event.targetId) : undefined;
      const href = bill ? `/bills/${bill.id}` : member ? `/members/${member.bioguideId}` : "/search";

      return {
        body: event.body,
        date: formatDate(event.occurredAt),
        href,
        id: event.id,
        label: bill?.displayNumber ?? member?.fullName ?? "Civic record",
        title: event.title
      };
    });

  return (
    <MobileShell
      ambientClassName="bg-[radial-gradient(circle_at_18%_8%,rgba(43,122,203,0.16),transparent_32%),radial-gradient(circle_at_82%_10%,rgba(255,177,43,0.12),transparent_28%),linear-gradient(180deg,rgba(2,10,24,0.16)_0%,rgba(2,9,23,0.58)_54%,rgba(1,6,18,0.82)_100%)]"
      backgroundClassName="bg-[linear-gradient(180deg,#071a34_0%,#041229_30%,#020b1d_68%,#010817_100%)]"
      minHeight="min-h-[1180px]"
      contentClassName="px-8 pb-5 pt-8"
      statusBarClassName="flex items-center justify-between px-3 text-[17px] font-semibold"
    >
      <header className="mt-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/upgrade" className={mobileIconButtonClass} aria-label="Back to upgrade">
            <ArrowLeft className="h-7 w-7" strokeWidth={2.2} aria-hidden="true" />
          </Link>
          <div>
            <div className={premiumEyebrowClass}>Team Preview</div>
            <h1 className="mt-2 text-[30px] font-medium leading-none text-white">Team Workspace</h1>
          </div>
        </div>
        <span className={premiumIconTileClass}>
          <UsersRound className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
        </span>
      </header>

      <main className="mt-7 space-y-5 pb-8">
        <MobileCard variant="rust" className="overflow-hidden px-5 py-5">
          <div className="flex items-start gap-4">
            <Image src="/capitol-ledger-logo.png" alt="" width={58} height={58} className="h-[58px] w-[58px] rounded-full object-cover" />
            <div className="min-w-0 flex-1">
              <div className={premiumEyebrowClass}>Civic Team Workspace</div>
              <h2 className="mt-2 text-[26px] font-medium leading-tight text-white">Shared government watchlist</h2>
              <p className="mt-3 text-[15px] leading-snug text-white/60">
                A shared view for campaigns, nonprofits, local offices, and civic groups tracking bills, officials, issues, and alerts together.
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2">
            {teamMetrics.map((metric) => (
              <MetricTile key={metric.label} {...metric} />
            ))}
          </div>

          <div className="mt-5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-[#ffb12b]/20 bg-[#ffb12b]/8 px-4 py-3">
            <div className="min-w-0">
              <div className="text-[13px] font-semibold text-[#ffb12b]">Preview workspace</div>
              <div className="mt-1 text-[12px] leading-snug text-white/52">Invite flow, seat billing, and real shared records are planned next.</div>
            </div>
            <Link href="/upgrade" className="shrink-0 rounded-full border border-[#ffb12b]/24 bg-[#ffb12b]/10 px-3 py-2 text-[12px] font-semibold text-[#ffb12b]">
              Plan
            </Link>
          </div>
        </MobileCard>

        <MobileCard variant="rust" className="px-5 py-5">
          <SectionHeader
            icon={<ShieldCheck />}
            eyebrow="Accountability"
            title="Team accountability scorecard"
            description="A preview of how an organization could monitor attention, priority votes, and unresolved civic actions."
          />
          <div className="mt-5 grid grid-cols-3 gap-2">
            {accountabilitySignals.map((signal) => (
              <div key={signal.label} className={`${premiumPanelClass} px-3 py-3 text-center`}>
                <div className={`text-[21px] font-semibold leading-none ${signal.tone}`}>{signal.value}</div>
                <div className="mt-2 text-[10px] leading-tight text-white/46">{signal.label}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
            <div className="flex items-center justify-between gap-3 text-[13px] font-semibold text-white/70">
              <span>Workspace readiness</span>
              <span className="text-[#ffb12b]">82%</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-[82%] rounded-full bg-gradient-to-r from-[#c57b0b] via-[#ffb12b] to-[#ffd45c]" />
            </div>
          </div>
        </MobileCard>

        <MobileCard variant="rust" className="px-5 py-5">
          <div className="flex items-center justify-between gap-3">
            <SectionHeader
              compact
              icon={<ListChecks />}
              eyebrow="Shared Watchlist"
              title="Priority legislation"
              description="Team-owned bill tracking for shared briefings and alerts."
            />
            <Link href="/search?type=bills" className={mobileViewAllClass}>Bills</Link>
          </div>
          <div className="mt-5 divide-y divide-white/8">
            {watchlistBills.map((bill) => (
              <Link key={bill.id} href={bill.href} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-4">
                <span className="min-w-0">
                  <span className="block text-[16px] font-semibold text-white">{bill.value}</span>
                  <span className="mt-1 block truncate text-[14px] text-white/66">{bill.title}</span>
                  <span className="mt-1 block text-[12px] text-white/42">{bill.meta}</span>
                </span>
                <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5 text-[12px] font-semibold text-[#ffb12b]">
                  {bill.status}
                </span>
              </Link>
            ))}
          </div>
        </MobileCard>

        <MobileCard variant="rust" className="px-5 py-5">
          <div className="flex items-center justify-between gap-3">
            <SectionHeader
              compact
              icon={<Bell />}
              eyebrow="Shared Alert Queue"
              title="Needs review"
              description="Alerts the whole workspace can triage."
            />
            <Link href="/alerts" className={mobileViewAllClass}>Alerts</Link>
          </div>
          <div className="mt-5 space-y-3">
            {alertQueue.map((alert) => (
              <Link key={alert.id} href={alert.href} className={`${premiumPanelClass} block px-4 py-3`}>
                <div className="flex items-center justify-between gap-3">
                  <span className="min-w-0 text-[14px] font-semibold text-white">{alert.title}</span>
                  <span className="shrink-0 text-[11px] font-semibold text-white/42">{alert.date}</span>
                </div>
                <div className="mt-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#ffb12b]">{alert.label}</div>
                <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-white/54">{alert.body}</p>
              </Link>
            ))}
          </div>
        </MobileCard>

        <MobileCard variant="rust" className="px-5 py-5">
          <SectionHeader
            icon={<UsersRound />}
            eyebrow="Workspace Roles"
            title="Clear team permissions"
            description="Simple roles keep collaboration useful before we add full organization management."
          />
          <div className="mt-5 grid gap-3">
            {teamRoles.map((role) => (
              <div key={role.label} className="grid grid-cols-[42px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.045] text-[#ffb12b]">
                  <UserRound className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[14px] font-semibold text-white">{role.label}</span>
                  <span className="mt-1 block text-[12px] leading-snug text-white/48">{role.description}</span>
                </span>
                <span className="text-[18px] font-semibold text-[#ffb12b]">{role.value}</span>
              </div>
            ))}
          </div>
        </MobileCard>

        <MobileCard variant="rust" className="px-5 py-5">
          <SectionHeader
            icon={<UserPlus />}
            eyebrow="Invite Teammates"
            title="Invite flow coming next"
            description="This page defines the Team workspace experience first. The next build can add invitations, seat management, and shared workspace storage."
          />
          <div className="mt-5 grid grid-cols-2 gap-2">
            {focusAreas.map((area) => (
              <span key={area} className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-2 text-center text-[12px] font-semibold text-white/58">
                {area}
              </span>
            ))}
          </div>
        </MobileCard>
      </main>

      <MobileBottomNav
        items={[
          { href: "/dashboard", icon: <Home />, label: "Home" },
          { href: "/search?type=bills", icon: <FileText />, label: "Bills" },
          { active: true, href: "/map", icon: <Map />, label: "Map" },
          { href: "/alerts", icon: <Bell />, label: "Alerts" },
          { href: "/settings", icon: <Settings />, label: "Settings" }
        ]}
      />
    </MobileShell>
  );
}

function SectionHeader({
  compact = false,
  description,
  eyebrow,
  icon,
  title
}: {
  compact?: boolean;
  description: string;
  eyebrow: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <div className={`grid ${compact ? "grid-cols-[minmax(0,1fr)]" : "grid-cols-[minmax(0,1fr)_auto]"} items-start gap-4`}>
      <div className="min-w-0">
        <div className={premiumEyebrowClass}>{eyebrow}</div>
        <h2 className={`${compact ? "text-[20px]" : "text-[22px]"} mt-2 font-medium leading-tight text-white`}>{title}</h2>
        <p className="mt-2 text-[13px] leading-snug text-white/54">{description}</p>
      </div>
      {compact ? null : <span className={premiumIconTileClass}>{icon}</span>}
    </div>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className={`${premiumPanelClass} px-3 py-3 text-center`}>
      <div className="truncate text-[21px] font-semibold leading-none text-[#ffb12b]">{value}</div>
      <div className="mt-2 truncate text-[10px] leading-tight text-white/46">{label}</div>
    </div>
  );
}
