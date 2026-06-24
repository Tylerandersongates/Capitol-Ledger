import { MobileShell } from "@/components/mobile-shell";
import { BillStanceDetailRow } from "@/components/bill-stance-controls";
import { GamificationEventLink } from "@/components/gamification-actions";
import { HistoryBackButton } from "@/components/history-back-button";
import { MobileBottomNav, MobileCard, mobileIconButtonClass } from "@/components/mobile-ui";
import { MarkAlertRead } from "@/components/mark-alert-read";
import { SaveAlertButton } from "@/components/saved-ledger-controls";
import Image from "next/image";
import Link from "next/link";
import type { ReactElement } from "react";
import {
  ArrowLeft,
  Bell,
  CalendarDays,
  CheckCircle2,
  FileText,
  Home,
  Landmark,
  UserCircle,
  Settings
} from "lucide-react";
import { getAllMembers, getDashboardData } from "@/lib/data";
import { formatDate } from "@/lib/utils";

export default function AlertDetailPage() {
  const dashboardData = getDashboardData();
  const vote = dashboardData.recentVote?.vote;
  const bill = dashboardData.recentVote?.bill ?? dashboardData.trackedBill;
  const members = getAllMembers();
  const preferredChamber = vote?.chamber === "House" || vote?.chamber === "Senate" ? vote.chamber : "House";
  const districtMember = members.find((member) => member.state === "TX" && member.chamber === preferredChamber) ?? members.find((member) => member.state === "TX") ?? members[0];
  const districtMemberRole = districtMember?.chamber === "Senate" ? "Senator" : "Representative";
  const districtMemberHref = districtMember ? `/members/${districtMember.bioguideId}#contact` : "/search?type=members";
  const chamber = vote?.chamber === "House" ? "House of Representatives" : vote?.chamber ?? "Congress";
  const alertDetails = [
    { label: "Bill", value: bill?.displayNumber ?? "Tracked bill", icon: <FileText /> },
    { label: "Chamber", value: chamber, icon: <Landmark /> },
    { label: "Vote date", value: vote ? formatDate(vote.voteDate) : "Date pending", icon: <CalendarDays /> },
    { label: `Your ${districtMemberRole}`, value: districtMember?.fullName.replace(/^Sen\.\s+|^Rep\.\s+/, "") ?? districtMemberRole, icon: <UserCircle /> }
  ];

  return (
    <MobileShell
      minHeight="min-h-[932px]"
      contentClassName="px-8 pb-5 pt-8"
      statusBarClassName="flex items-center justify-between px-3 text-[17px] font-semibold"
    >
            <MarkAlertRead alertId="system-vote-reminder" />
            <header className="relative mt-10 flex items-center justify-center">
              <HistoryBackButton className={`absolute left-0 ${mobileIconButtonClass}`}>
                <ArrowLeft className="h-7 w-7" strokeWidth={2.2} aria-hidden="true" />
              </HistoryBackButton>
              <h1 className="text-[22px] font-medium leading-none text-white">Alert details</h1>
              <SaveAlertButton alertId={vote?.id ?? bill?.id ?? "demo-alert"} />
            </header>

            <main className="mt-7 pb-5">
              <section className="relative h-[250px] overflow-hidden">
                <div className="absolute left-1/2 top-[118px] h-[300px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-rust/20" />
                <div className="absolute left-1/2 top-[118px] h-[250px] w-[430px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-rust/20" />
                <div className="absolute left-1/2 top-[118px] h-[194px] w-[330px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-rust/25" />
                <div className="absolute left-1/2 top-[118px] h-[138px] w-[236px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-rust/24" />
                <div className="absolute inset-x-7 top-[118px] h-px bg-gradient-to-r from-transparent via-rust/45 to-transparent" />
                <div className="absolute bottom-2 right-6 h-28 w-28 opacity-20">
                  <Image src="/capitol-ledger-logo.png" alt="" fill sizes="112px" className="rounded-full object-cover" />
                </div>
                <div className="absolute left-1/2 top-[118px] grid h-40 w-40 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[#ffb12b]/10 shadow-[0_0_60px_rgba(255,177,43,0.35)]">
                  <Bell className="h-32 w-32 fill-[#ffbf39] stroke-[#ffe07a] drop-shadow-[0_0_18px_rgba(255,177,43,0.78)]" strokeWidth={1.2} aria-hidden="true" />
                </div>
              </section>

              <div className="-mt-2">
                <span className="rounded-md bg-white/12 px-3 py-1 text-[13px] font-semibold uppercase tracking-[0.12em] text-white/72">Vote reminder</span>
                <h2 className="mt-3 text-[28px] font-medium leading-none text-white">{vote ? "Vote recorded" : "Bill update"}</h2>
                <p className="mt-3 max-w-[420px] text-[18px] leading-snug text-white/64">
                  {bill?.displayNumber ?? "A tracked bill"} - {bill?.shortTitle ?? "A tracked bill"} {vote ? `recorded a ${vote.result.toLowerCase()} vote in the ${vote.chamber}.` : "has a new legislative update."}
                </p>
              </div>

              <MobileCard variant="compact" className="mt-5 px-5 py-3">
	                <div className="divide-y divide-white/8">
	                  {alertDetails.slice(0, 3).map((detail) => (
	                    <DetailRow key={detail.label} {...detail} />
	                  ))}
	                  {bill ? <BillStanceDetailRow billId={bill.id} /> : null}
	                  {alertDetails.slice(3).map((detail) => (
	                    <DetailRow key={detail.label} {...detail} />
	                  ))}
	                </div>
              </MobileCard>

              <div className="mt-4 space-y-3">
                <GamificationEventLink href={districtMemberHref} event="contact-representative" targetId={districtMember?.bioguideId ?? "vote-reminder-action"} className="flex h-12 items-center justify-center rounded-xl bg-gradient-to-r from-[#ffdf63] via-[#ffb12b] to-[#ff8a00] text-[17px] font-semibold text-[#071225] shadow-[0_0_24px_rgba(255,177,43,0.22)]">
                  Contact {districtMemberRole}
                </GamificationEventLink>
                <Link href="/petitions" className="flex h-12 items-center justify-center rounded-xl border border-[#c08dff]/52 bg-[#c08dff]/14 text-[17px] font-semibold text-[#d5b8ff]">
                  Sign petition
                </Link>
                <Link href={bill ? `/bills/${bill.id}` : "/search?type=bills"} className="flex h-12 items-center justify-center rounded-xl border border-rust/80 bg-transparent text-[17px] font-semibold text-[#ffb12b]">
                  View bill
                </Link>
              </div>
            </main>

            <MobileBottomNav
              items={[
                { href: "/dashboard", icon: <Home />, label: "Home" },
                { href: "/search?type=bills", icon: <FileText />, label: "Bills" },
                { href: "/search", icon: <CheckCircle2 />, label: "Track" },
                { active: true, href: "/alerts", icon: <Bell />, label: "Alerts" },
                { href: "/settings", icon: <Settings />, label: "Settings" }
              ]}
            />
    </MobileShell>
  );
}

function DetailRow({
  icon,
  label,
  tone = "text-white",
  value
}: {
  icon: ReactElement;
  label: string;
  tone?: string;
  value: string;
}) {
  return (
    <div className="grid grid-cols-[28px_1fr_auto] items-center gap-3 py-3">
      <span className="text-white/56 [&>svg]:h-5 [&>svg]:w-5 [&>svg]:stroke-[1.7]">{icon}</span>
      <span className="text-[15px] text-white/63">{label}</span>
      <span className={`max-w-[225px] truncate text-right text-[15px] font-semibold ${tone}`}>{value}</span>
    </div>
  );
}
