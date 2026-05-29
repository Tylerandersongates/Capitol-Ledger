import { MobileShell } from "@/components/mobile-shell";
import { MobileBottomNav, MobileCard, mobileIconButtonClass } from "@/components/mobile-ui";
import { SaveTargetButton } from "@/components/saved-ledger-controls";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Bell, FileText, Home, Search, UserRound } from "lucide-react";
import { getAllMembers, getCosponsoredBills, getMember, getMemberVotes, getSponsoredBills } from "@/lib/data";

type MemberPageProps = {
  params: {
    bioguideId: string;
  };
};

const stateNames: Record<string, string> = {
  AK: "Alaska",
  CA: "California",
  NY: "New York",
  TX: "Texas",
  VT: "Vermont"
};

export default function MemberPage({ params }: MemberPageProps) {
  const member = getMember(params.bioguideId);
  if (!member) notFound();

  const memberVotes = getMemberVotes(member.bioguideId);
  const sponsoredBills = getSponsoredBills(member.bioguideId);
  const cosponsoredBills = getCosponsoredBills(member.bioguideId);
  const chamberMembers = getAllMembers().filter((candidate) => candidate.chamber === member.chamber);
  const chamberRank = Math.max(1, chamberMembers.findIndex((candidate) => candidate.bioguideId === member.bioguideId) + 1);
  const accountabilityScore = Math.min(98, 72 + memberVotes.length * 3 + sponsoredBills.length * 4 + cosponsoredBills.length * 2);
  const transparencyRows = [
    ["Voting Record", Math.min(96, 80 + memberVotes.length * 4)],
    ["Public Engagement", Math.min(92, 68 + cosponsoredBills.length * 7)],
    ["Sponsored Bills", Math.min(94, 70 + sponsoredBills.length * 10)],
    ["Ethics & Compliance", 91]
  ] as const;
  const role = member.chamber === "Senate" ? "Senator" : "Representative";
  const displayName = member.fullName.replace(/^Sen\.\s+|^Rep\.\s+/, "");
  const state = stateNames[member.state] ?? member.state;
  const districtLabel = member.district ? `${state} District ${member.district}` : state;
  const nextElection = member.chamber === "Senate" ? "Nov 5, 2026" : "Nov 3, 2026";
  const seniority = member.term;

  return (
    <MobileShell
      minHeight="min-h-[932px]"
      contentClassName="px-8 pb-5 pt-8"
      statusBarClassName="flex items-center justify-between text-[17px] font-semibold"
    >
            <header className="mt-10 flex items-center justify-between">
              <Link href="/dashboard" className={mobileIconButtonClass} aria-label="Back to dashboard">
                <ArrowLeft className="h-7 w-7" strokeWidth={2.2} aria-hidden="true" />
              </Link>
              <div className="flex items-center gap-4">
                <SaveTargetButton
                  targetType="member"
                  targetId={member.bioguideId}
                  label="Save profile"
                  className={mobileIconButtonClass}
                  iconClassName="h-7 w-7"
                />
              </div>
            </header>

            <section className="mt-8 grid grid-cols-[150px_1fr] items-center gap-6">
              <img
                src={member.photoUrl}
                alt=""
                className="h-36 w-36 rounded-full border-2 border-[#ffb12b] object-cover shadow-[0_0_38px_rgba(255,177,43,0.15)]"
              />
              <div>
                <div className="text-[20px] font-medium text-[#ffb12b]">{role}</div>
                <h1 className="mt-3 text-[30px] font-medium leading-tight text-white">{displayName}</h1>
                <p className="mt-3 text-[20px] leading-snug text-white/68">
                  United States {role}
                  <br />
                  from {districtLabel}
                </p>
                <span className="mt-4 inline-flex rounded-xl bg-civic/35 px-4 py-2 text-[15px] text-blue-100">
                  {member.party}
                </span>
              </div>
            </section>

            <MobileCard variant="dashboard" className="mt-9 grid grid-cols-3 px-6 py-5">
              <ProfileStat label="State" value={state} />
              <ProfileStat label="Seniority" value={seniority} bordered />
              <ProfileStat label="Next Election" value={nextElection} bordered />
            </MobileCard>

            <nav className="mt-8 flex items-center justify-between gap-4 border-b border-white/10 text-center text-[18px]">
              {["Overview", "Votes", "Bills", "Committees", "Finance"].map((tab, index) => (
                <span key={tab} className={`whitespace-nowrap pb-5 ${index === 0 ? "border-b-2 border-[#ffb12b] font-medium text-[#ffb12b]" : "text-white/62"}`}>
                  {tab}
                </span>
              ))}
            </nav>

            <MobileCard variant="rust" className="mt-7 grid grid-cols-[1fr_0.9fr] overflow-hidden px-6 py-6">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="whitespace-nowrap text-[21px] font-medium leading-tight">Accountability Score</h2>
                  <span className="grid h-5 w-5 place-items-center rounded-full border border-white/55 text-xs text-white/70">i</span>
                </div>
                <div className="mt-8 text-[48px] font-semibold leading-none text-[#ffb12b]">{accountabilityScore}%</div>
                <div className="mt-3 text-[22px] font-medium text-[#65ec68]">Very Good</div>
                <div className="mt-8 text-[18px] text-white/70">Ranking</div>
                <div className="mt-1 text-[22px]">
                  <span className="text-[#ffb12b]">{chamberRank}</span> / {chamberMembers.length}
                </div>
                <div className="mt-2 text-[17px] text-white/62">in the {member.chamber}</div>
              </div>
              <div className="orbital-mark relative grid min-h-[220px] place-items-center">
                <div className="absolute h-56 w-56 rounded-full border border-rust/20" />
                <div className="absolute h-44 w-44 rounded-full border border-rust/25" />
                <div className="absolute h-32 w-32 rounded-full border border-rust/25" />
                <div className="relative grid h-40 w-40 place-items-center rounded-full bg-[conic-gradient(#ffcf54_0_77%,rgba(255,255,255,0.08)_77%_100%)] shadow-[0_0_34px_rgba(255,177,43,0.35)]">
                  <div className="grid h-32 w-32 place-items-center rounded-full bg-[#06152b]">
                    <img src="/capitol-ledger-logo.png" alt="" className="h-20 w-20 rounded-full object-cover" />
                  </div>
                </div>
              </div>
            </MobileCard>

            <MobileCard variant="rust" className="mt-5 px-6 py-6">
              <h2 className="text-[23px] font-medium">Transparency Breakdown</h2>
              <div className="mt-6 space-y-5">
                {transparencyRows.map(([label, value]) => (
                  <div key={label} className="grid grid-cols-[1fr_1.35fr_48px] items-center gap-4">
                    <div className="text-[17px] text-white/70">{label}</div>
                    <div className="h-2.5 rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#a96a09] via-[#ffb12b] to-[#ffcf54] shadow-[0_0_16px_rgba(255,177,43,0.35)]"
                        style={{ width: `${value}%` }}
                      />
                    </div>
                    <div className="text-right text-[17px] font-semibold text-white">{value}%</div>
                  </div>
                ))}
              </div>
            </MobileCard>

            <MobileBottomNav
              className="sticky bottom-0 -mx-8 mt-auto border-t border-white/8 bg-[#031126]/96 px-8 pb-3 pt-4 backdrop-blur-xl"
              indicatorClassName="mx-auto mt-4 h-1.5 w-36 rounded-full bg-white/70"
              items={[
                { active: true, href: "/dashboard", icon: <Home />, label: "Home" },
                { href: "/search?type=bills", icon: <FileText />, label: "Track" },
                { highlighted: true, href: "/search?type=members", icon: <Search />, label: "Search" },
                { href: "/alerts", icon: <Bell />, label: "Alerts" },
                { href: "/account", icon: <UserRound />, label: "Profile" }
              ]}
            />
    </MobileShell>
  );
}

function ProfileStat({ label, value, bordered = false }: { label: string; value: string; bordered?: boolean }) {
  return (
    <div className={`${bordered ? "border-l border-rust/40 pl-7" : ""}`}>
      <div className="text-[17px] text-white/64">{label}</div>
      <div className="mt-2 text-[18px] font-semibold text-white">{value}</div>
    </div>
  );
}
