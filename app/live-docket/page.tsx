import Link from "next/link";
import {
  ArrowLeft,
  Bell,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  FileText,
  Home,
  Landmark,
  Search,
  Settings,
  TimerReset
} from "lucide-react";
import { MobileShell } from "@/components/mobile-shell";
import { MobileBottomNav, MobileCard, mobileIconButtonClass } from "@/components/mobile-ui";
import { getBillSponsor, getBillStatus, getDashboardDataWithLiveData } from "@/lib/data";
import { formatDate } from "@/lib/utils";
import type { Bill } from "@/types/capitol";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type LiveDocketStatusFilter = "passed" | "in-committee" | "in-progress";

type LiveDocketPageProps = {
  searchParams: Promise<{
    status?: string;
  }>;
};

const panelClass =
  "rounded-[1.15rem] border border-white/10 bg-[linear-gradient(180deg,rgba(29,83,145,0.22)_0%,rgba(7,23,50,0.68)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_12px_24px_rgba(2,10,28,0.22)]";
const metricClass =
  "rounded-xl border border-white/10 bg-[linear-gradient(180deg,rgba(25,73,130,0.28)_0%,rgba(6,22,49,0.72)_100%)] px-3 py-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.09),0_10px_24px_rgba(1,8,24,0.3)]";

export default async function LiveDocketPage(props: LiveDocketPageProps) {
  const searchParams = await props.searchParams;
  const data = await getDashboardDataWithLiveData();
  const activeStatus = normalizeLiveDocketStatus(searchParams.status);
  const allBills = [...data.favoriteTargets.bills].sort((a, b) => Date.parse(b.latestActionDate) - Date.parse(a.latestActionDate));
  const visibleBills = allBills.filter((bill) => matchesLiveDocketStatus(bill, activeStatus));
  const activeLabel = activeStatus ? liveDocketStatusLabel(activeStatus) : "All Active";
  const inProgressCount = data.statusCounts.inProgress || Math.max(0, data.billsInAction - data.statusCounts.passed - data.statusCounts.inCommittee);
  const statusTabs = [
    { count: data.billsInAction, href: "/live-docket", icon: FileText, label: "All", value: undefined },
    { count: data.statusCounts.passed, href: "/live-docket?status=passed", icon: CheckCircle2, label: "Passed", value: "passed" },
    { count: data.statusCounts.inCommittee, href: "/live-docket?status=in-committee", icon: Landmark, label: "Committee", value: "in-committee" },
    { count: inProgressCount, href: "/live-docket?status=in-progress", icon: TimerReset, label: "In Progress", value: "in-progress" }
  ] satisfies Array<{
    count: number;
    href: string;
    icon: typeof FileText;
    label: string;
    value?: LiveDocketStatusFilter;
  }>;

  return (
    <MobileShell
      ambientClassName="bg-[radial-gradient(circle_at_18%_8%,rgba(43,122,203,0.13),transparent_32%),radial-gradient(circle_at_84%_8%,rgba(255,177,43,0.08),transparent_28%),linear-gradient(180deg,rgba(2,10,24,0.16)_0%,rgba(2,9,23,0.58)_54%,rgba(1,6,18,0.82)_100%)]"
      backgroundClassName="bg-[linear-gradient(180deg,#071a34_0%,#041229_30%,#020b1d_68%,#010817_100%)]"
      contentClassName="px-8 pb-5 pt-8"
      minHeight="min-h-[1080px]"
      statusBarClassName="flex items-center justify-between px-3 text-[17px] font-semibold"
    >
      <header className="mt-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className={mobileIconButtonClass} aria-label="Back to dashboard">
            <ArrowLeft className="h-7 w-7" strokeWidth={2.2} aria-hidden="true" />
          </Link>
          <div>
            <div className="text-[12px] font-semibold uppercase tracking-[0.1em] text-white/48">Live Docket</div>
            <h1 className="mt-2 text-[30px] font-medium leading-none text-white">Today in Congress</h1>
          </div>
        </div>
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-[#ffb12b]/24 bg-[#ffb12b]/10 text-[#ffb12b] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_18px_rgba(255,177,43,0.16)]">
          <FileText className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
        </span>
      </header>

      <main className="mt-7 space-y-5 pb-8">
        <MobileCard variant="dashboard" className="relative overflow-hidden px-5 py-5">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(56,146,255,0.18),transparent_34%),radial-gradient(circle_at_86%_8%,rgba(255,177,43,0.1),transparent_30%)]" />
          <div className="relative z-10">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[#ffb12b]">{activeLabel}</div>
                <h2 className="mt-2 text-[24px] font-semibold leading-tight text-white">
                  {visibleBills.length} bills moving through the ledger
                </h2>
              </div>
              <span className="rounded-full border border-[#2be68d]/30 bg-[#2be68d]/10 px-2.5 py-1 text-[11px] font-medium text-[#2be68d]">Live</span>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2">
              <DocketMetric label="Bills" value={visibleBills.length} />
              <DocketMetric label="Passed" value={data.statusCounts.passed} />
              <DocketMetric label="Committee" value={data.statusCounts.inCommittee} />
            </div>

            <div className="mt-4 flex items-center gap-2 text-[12px] font-medium text-white/44">
              <CalendarClock className="h-4 w-4 text-[#ffb12b]" strokeWidth={1.8} aria-hidden="true" />
              Updated {formatDate(data.generatedAt)}
            </div>
          </div>
        </MobileCard>

        <nav className="grid grid-cols-2 gap-2" aria-label="Live docket status filters">
          {statusTabs.map((tab) => (
            <DocketStatusLink
              key={tab.href}
              active={activeStatus === tab.value || (!activeStatus && !tab.value)}
              count={tab.count}
              href={tab.href}
              icon={tab.icon}
              label={tab.label}
            />
          ))}
        </nav>

        {visibleBills.length ? (
          <div
            aria-label="Today in Congress live docket bills"
            className="h-[430px] overflow-y-auto overscroll-contain rounded-[1.35rem] border border-white/10 bg-[#03152f]/55 p-1 pr-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),inset_0_0_28px_rgba(43,141,255,0.08),0_16px_34px_rgba(1,8,24,0.26)] [scrollbar-color:rgba(255,177,43,0.68)_rgba(255,255,255,0.06)] [scrollbar-width:thin] sm:h-[500px]"
            role="region"
          >
            <div className="space-y-3 pb-1">
              {visibleBills.map((bill) => (
                <LiveDocketBillRow key={bill.id} bill={bill} />
              ))}
            </div>
          </div>
        ) : (
          <div className={`${panelClass} p-5 text-[14px] leading-snug text-white/56`}>No bills match this live docket status.</div>
        )}
      </main>

      <MobileBottomNav
        items={[
          { href: "/dashboard", icon: <Home />, label: "Home" },
          { active: true, href: "/live-docket", icon: <FileText />, label: "Bills" },
          { href: "/search", icon: <Search />, label: "Search" },
          { href: "/alerts", icon: <Bell />, label: "Alerts" },
          { href: "/settings", icon: <Settings />, label: "Settings" }
        ]}
      />
    </MobileShell>
  );
}

function DocketMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className={metricClass}>
      <div className="text-[22px] font-semibold leading-none text-[#ffb12b]">{value}</div>
      <div className="mt-2 text-[11px] font-medium uppercase tracking-[0.08em] text-white/48">{label}</div>
    </div>
  );
}

function DocketStatusLink({
  active,
  count,
  href,
  icon: Icon,
  label
}: {
  active?: boolean;
  count: number;
  href: string;
  icon: typeof FileText;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={`flex h-16 items-center justify-between gap-3 rounded-[1.15rem] border px-4 transition ${
        active
          ? "border-[#ffb12b]/45 bg-[#ffb12b]/12 text-[#ffb12b] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
          : "border-white/10 bg-white/[0.04] text-white/64 hover:bg-white/[0.07] hover:text-white/82"
      }`}
    >
      <span className="flex min-w-0 items-center gap-2">
        <Icon className="h-4 w-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
        <span className="truncate text-[13px] font-semibold">{label}</span>
      </span>
      <span className="shrink-0 text-[18px] font-semibold leading-none">{count}</span>
    </Link>
  );
}

function LiveDocketBillRow({ bill }: { bill: Bill }) {
  const sponsor = getBillSponsor(bill);
  const status = getBillStatus(bill);
  const tone = getStatusTone(status);

  return (
    <Link href={`/bills/${bill.id}`} className={`block p-4 transition hover:brightness-110 ${panelClass}`}>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="truncate text-[12px] font-semibold uppercase tracking-[0.08em] text-[#ffb12b]">{bill.displayNumber}</div>
            <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${tone}`}>{status}</span>
          </div>
          <div className="mt-1 line-clamp-2 text-[16px] font-medium leading-snug text-white">{bill.shortTitle}</div>
          <div className="mt-2 text-[13px] leading-snug text-white/52">
            {sponsor?.fullName ?? "Congress"} - {bill.policyArea}
          </div>
        </div>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.045] text-white/58">
          <ChevronRight className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
        </span>
      </div>
      <div className="mt-3 rounded-xl border border-white/8 bg-[#071a38]/55 px-3 py-2">
        <div className="flex items-center gap-2 text-[12px] font-medium text-white/46">
          <CircleDot className="h-3.5 w-3.5 text-[#ffb12b]" strokeWidth={2} aria-hidden="true" />
          {formatDate(bill.latestActionDate)}
        </div>
        <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-white/58">{bill.latestActionText}</p>
      </div>
    </Link>
  );
}

function normalizeLiveDocketStatus(value?: string): LiveDocketStatusFilter | undefined {
  if (value === "passed" || value === "in-committee" || value === "in-progress") return value;
  return undefined;
}

function matchesLiveDocketStatus(bill: Bill, filter?: LiveDocketStatusFilter) {
  if (!filter) return true;
  const status = getBillStatus(bill);

  if (filter === "passed") return status === "Passed" || status === "Enacted";
  if (filter === "in-committee") return status === "In Committee";
  return status === "In Progress" || status === "On Floor";
}

function liveDocketStatusLabel(status: LiveDocketStatusFilter) {
  if (status === "passed") return "Passed";
  if (status === "in-committee") return "In Committee";
  return "In Progress";
}

function getStatusTone(status: string) {
  if (status === "Passed" || status === "Enacted") return "border-[#2be68d]/28 bg-[#2be68d]/10 text-[#2be68d]";
  if (status === "In Committee") return "border-[#ffb12b]/28 bg-[#ffb12b]/10 text-[#ffb12b]";
  if (status === "On Floor") return "border-[#ba8dff]/28 bg-[#ba8dff]/10 text-[#c4a2ff]";
  return "border-[#56a8ff]/28 bg-[#56a8ff]/10 text-[#74dbff]";
}
