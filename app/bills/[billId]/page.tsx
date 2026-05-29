import { MobileShell } from "@/components/mobile-shell";
import { GamificationEventAnchor } from "@/components/gamification-actions";
import { MobileBottomNav, MobileCard, mobileIconButtonClass, mobileViewAllClass } from "@/components/mobile-ui";
import { SaveTargetButton } from "@/components/saved-ledger-controls";
import { PlanFeatureGate } from "@/components/subscription-controls";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactElement, ReactNode } from "react";
import {
  ArrowLeft,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  ExternalLink,
  FileCheck2,
  FileClock,
  FilePenLine,
  FileText,
  Home,
  Link2,
  MessageSquareText,
  PlayCircle,
  Search,
  ShieldCheck,
  Share2,
  Sparkles,
  UserRound,
  Vote as VoteIcon,
  type LucideIcon
} from "lucide-react";
import {
  getBillDetailWithLiveData,
  getBillSummary,
  getBillStatus,
  getVoteTotals
} from "@/lib/data";
import { formatDate } from "@/lib/utils";
import type { BillSummaryResolution, VoteMemberPositionRecord } from "@/lib/data";
import type { Bill, BillSourceMatch, BillVideo, Member, Vote, VotePosition } from "@/types/capitol";

type BillPageProps = {
  params: {
    billId: string;
  };
  searchParams?: {
    tab?: string;
  };
};

type BillTab = "overview" | "votes" | "timeline" | "details";
type ProgressStep = {
  date: string;
  icon: LucideIcon;
  label: string;
};

type AiBillAnalysis = {
  cons: string[];
  context: string;
  pros: string[];
};

const billTabs: Array<{ label: string; value: BillTab }> = [
  { label: "Overview", value: "overview" },
  { label: "Votes", value: "votes" },
  { label: "Timeline", value: "timeline" },
  { label: "Details", value: "details" }
];

export const dynamic = "force-dynamic";

function normalizeTab(tab?: string): BillTab {
  return tab === "votes" || tab === "timeline" || tab === "details" ? tab : "overview";
}

function tabHref(billId: string, tab: BillTab) {
  return tab === "overview" ? `/bills/${billId}` : `/bills/${billId}?tab=${tab}`;
}

function buildAiBillAnalysis(bill: Bill, summaryText?: string): AiBillAnalysis {
  const text = [bill.policyArea, bill.title, bill.shortTitle, bill.summary, summaryText, bill.latestActionText, bill.committeeName]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const statusLine = getPersonalStatusLine(bill);
  const billName = bill.shortTitle || bill.title;

  if (matchesAny(text, ["child", "childcare", "family", "families", "care", "health", "provider"])) {
    return {
      context: `${billName} could reach people through household budgets, family care decisions, and the local providers families rely on. ${statusLine}`,
      pros: [
        "If you pay for child care or help relatives who do, the upside could be lower bills, more available slots, or fewer hard choices between work and care.",
        "Public reporting on access and costs could make it easier to see whether your area is being left behind instead of guessing from waitlists and word of mouth.",
        "Support for workforce stability could help providers keep staff, which can mean fewer sudden closures and less disruption for parents."
      ],
      cons: [
        "You may see little benefit if eligibility rules, income limits, state rollout, or waitlists leave your household outside the program.",
        "If funding is too small or temporary, families could get paperwork and promises while prices keep rising.",
        "Providers may face more reporting work, and that can pull staff time away from care unless the program is simple to use."
      ]
    };
  }

  if (matchesAny(text, ["transparency", "public record", "machine-readable", "data", "records", "accountability", "government operations"])) {
    return {
      context: `${billName} matters if you have ever tried to figure out what Congress did, who changed a bill, or whether your representative followed through. ${statusLine}`,
      pros: [
        "You could spend less time digging through scattered government sites and more time seeing what changed, who voted, and what it means for your district.",
        "Cleaner public records can help local reporters, watchdogs, and civic apps catch mistakes faster, which protects voters and taxpayers.",
        "If an official promises action on an issue you care about, better records make it easier to compare the promise with the vote."
      ],
      cons: [
        "If the data is incomplete or hard to explain, it can look transparent while still leaving regular people confused.",
        "Congressional offices may need money and staff time to comply, and that can compete with other constituent service work.",
        "More public data still needs privacy and security guardrails so transparency does not expose details that should stay protected."
      ]
    };
  }

  if (matchesAny(text, ["border", "homeland", "security", "infrastructure review", "review act"])) {
    return {
      context: `${billName} could affect people through public safety, travel, local construction, property impacts, trade, and taxpayer spending. ${statusLine}`,
      pros: [
        "If you live near affected infrastructure, clearer reviews could mean more predictable timelines, safer projects, and fewer surprise disruptions.",
        "Cost and timeline reporting can help taxpayers see whether major security projects are actually delivering what was promised.",
        "Local businesses and communities may be able to plan better when project delays, spending, and next steps are easier to see."
      ],
      cons: [
        "Reviews can slow projects if they add paperwork without fixing the bottlenecks that caused delays in the first place.",
        "Border and security projects can affect property, commutes, civil liberties, and local economies very differently depending on where you live.",
        "The bill may identify cost overruns without guaranteeing they get fixed, so taxpayers could still carry the burden."
      ]
    };
  }

  if (matchesAny(text, ["transportation", "public works", "port", "ports", "supply chain", "resilience", "maritime"])) {
    return {
      context: `${billName} may sound distant at first, but infrastructure bills can show up later in prices, jobs, shipping delays, emergency response, and local taxes. ${statusLine}`,
      pros: [
        "Stronger ports and transportation planning could reduce supply-chain disruptions that eventually hit store shelves and household prices.",
        "Local workers and contractors could benefit if planning money turns into real projects in affected communities.",
        "Better resilience planning can matter during storms, emergencies, or shipping interruptions when everyday services depend on working infrastructure."
      ],
      cons: [
        "Large infrastructure plans can take years, so families may pay or wait long before seeing a visible benefit.",
        "Permitting, environmental review, and local opposition can delay projects and make costs climb.",
        "If funding is spread too thin, communities may get studies and planning documents instead of finished improvements."
      ]
    };
  }

  if (matchesAny(text, ["education", "school", "student", "teacher", "college", "learning"])) {
    return {
      context: `${billName} could affect families through schools, student costs, classroom resources, and local education choices. ${statusLine}`,
      pros: [
        "If you have children in school or are paying for training or college, the upside could be more support, clearer rules, or lower pressure on family budgets.",
        "More reporting can help parents and students see whether money is reaching classrooms instead of disappearing into layers of administration.",
        "Local districts may get better guidance or funding if the bill targets gaps that already affect your community."
      ],
      cons: [
        "Benefits can depend heavily on state and district decisions, so families in different ZIP codes may feel very different results.",
        "New rules can create paperwork for schools and teachers if the bill does not keep implementation simple.",
        "If funding is limited or temporary, schools may start programs that families come to rely on and then lose later."
      ]
    };
  }

  if (matchesAny(text, ["veteran", "veterans", "military", "servicemember", "va benefits", "health care for veterans"])) {
    return {
      context: `${billName} matters for veterans, military families, caregivers, and communities that depend on timely benefits and services. ${statusLine}`,
      pros: [
        "Veterans and caregivers could see faster access, clearer eligibility, or better tracking of benefits that already affect daily life.",
        "If the bill improves reporting, families may have an easier time proving where delays or service gaps are happening.",
        "Community providers could coordinate better with federal programs if the bill creates clearer responsibilities."
      ],
      cons: [
        "If eligibility is narrow, some veterans may hear about a new benefit but still be left out.",
        "More oversight does not automatically mean faster appointments, claims, or payments unless agencies are staffed to act.",
        "Families may still face confusing handoffs between federal, state, and local systems."
      ]
    };
  }

  if (matchesAny(text, ["energy", "climate", "environment", "water", "emissions", "utility", "conservation"])) {
    return {
      context: `${billName} could show up through utility bills, local jobs, land use, air or water quality, and how fast communities adapt to risk. ${statusLine}`,
      pros: [
        "If the bill supports cleaner or more reliable systems, your household could eventually benefit through healthier neighborhoods or steadier service.",
        "Local workers may see new projects or training if funding reaches communities instead of staying in planning mode.",
        "Better environmental data can help residents prove whether their area is carrying more risk than others."
      ],
      cons: [
        "Costs can show up before benefits through rates, taxes, compliance expenses, or higher prices passed to consumers.",
        "Projects can create local conflict if communities feel decisions are being made over them instead of with them.",
        "If timelines are vague, households may hear big promises while daily problems like bills or pollution stay the same."
      ]
    };
  }

  if (matchesAny(text, ["tax", "taxes", "budget", "appropriation", "spending", "deficit", "revenue", "fiscal"])) {
    return {
      context: `${billName} matters because budget choices eventually decide who pays, which services are funded, and what gets delayed. ${statusLine}`,
      pros: [
        "If money is targeted well, your community could see better services without having to fight for attention every year.",
        "Clear spending rules can make it easier for taxpayers to see whether funds are reaching the promised people or places.",
        "A well-designed fiscal plan can reduce uncertainty for families, small businesses, and local governments."
      ],
      cons: [
        "The cost may come back to households through taxes, fees, reduced services, or future budget pressure.",
        "If oversight is weak, money can be spent without proving that people actually benefited.",
        "Short-term funding can create programs that disappear just as families or local agencies begin depending on them."
      ]
    };
  }

  if (matchesAny(text, ["housing", "rent", "mortgage", "homeless", "zoning", "labor", "worker", "wage", "employment"])) {
    return {
      context: `${billName} could affect everyday stability through rent, jobs, wages, workplace rules, or the cost of staying in your community. ${statusLine}`,
      pros: [
        "If the bill reaches people directly, it could ease pressure on rent, paychecks, benefits, or the ability to keep steady work.",
        "Better standards can help workers or tenants understand what they are owed and where to go when rules are ignored.",
        "Local programs may become easier to compare if the bill requires clearer reporting on outcomes."
      ],
      cons: [
        "Costs may be passed along through prices, rents, hiring decisions, or reduced local services if the bill is not funded carefully.",
        "People most affected may still miss out if eligibility rules are complicated or enforcement is weak.",
        "A bill can sound protective but still leave gaps for part-time workers, contractors, renters, or people between systems."
      ]
    };
  }

  if (matchesAny(text, ["crime", "police", "public safety", "justice", "court", "firearm", "emergency", "disaster"])) {
    return {
      context: `${billName} could affect safety, trust in institutions, emergency response, and how rules are enforced where you live. ${statusLine}`,
      pros: [
        "If it improves response or accountability, you may see clearer standards for agencies that directly affect safety and rights.",
        "Local communities could get better tools or funding for problems they are already dealing with.",
        "Transparent reporting can help residents see whether enforcement is fair and whether outcomes are improving."
      ],
      cons: [
        "More enforcement power can affect communities unevenly if guardrails and civil-rights protections are weak.",
        "New rules may not improve safety if local agencies do not have staffing, training, or trust from residents.",
        "Funding choices can pull money toward one safety approach while leaving prevention, mental health, or community services behind."
      ]
    };
  }

  return {
    context: `${billName} matters if it touches your work, school, bills, health, safety, rights, or local services. ${statusLine}`,
    pros: [
      "The upside is clearer rules and a public record you can use to judge whether elected officials delivered.",
      "If the bill targets a problem your household already feels, it could bring attention, funding, or coordination to that issue.",
      "Better reporting can help you compare what lawmakers say with what the program actually does."
    ],
    cons: [
      "The benefit may miss you if eligibility, geography, timing, or agency rules do not line up with your real life.",
      "New programs can create costs that show up later through taxes, fees, paperwork, or stretched public budgets.",
      "The final impact may change as amendments, funding decisions, and agency rules are written."
    ]
  };
}

function matchesAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

function getPersonalStatusLine(bill: Bill) {
  const action = bill.latestActionText.toLowerCase();

  if (action.includes("committee") || action.includes("hearing") || action.includes("referred")) {
    return "Because it is still moving through committee, nothing changes for you today, but this is where details can decide who qualifies, who pays, and how fast anything reaches people.";
  }

  if (action.includes("passed") || action.includes("reported") || action.includes("calendar")) {
    return "Because it has moved further along, the practical question is what survives the next vote and whether the rollout is clear enough to matter outside Washington.";
  }

  return "Because the bill is still in the legislative process, the real-life impact depends on amendments, funding, and implementation rules.";
}

function buildVoteDots(totals: { yes: number; no: number; notVoting: number }) {
  const total = Math.max(1, totals.yes + totals.no + totals.notVoting);
  const yesEnd = Math.round((totals.yes / total) * 100);
  const noEnd = yesEnd + Math.round((totals.no / total) * 100);

  return Array.from({ length: 100 }).map((_, index) => {
    const columns = 25;
    const rows = 4;
    const col = Math.floor(index / rows);
    const row = index % rows;
    const progress = col / (columns - 1);
    const arcLift = Math.sin(progress * Math.PI) * 46;
    const color = index < yesEnd ? "#39d884" : index < noEnd ? "#ff503d" : "#9ca5b1";

    return {
      x: 13 + col * 3.25,
      y: 72 - arcLift + row * 6.2,
      color
    };
  });
}

export default async function BillPage({ params, searchParams }: BillPageProps) {
  const detail = await getBillDetailWithLiveData(params.billId);
  if (!detail) notFound();

  const { bill, billVideos, billVotes, sourceMatches, sponsor, voteMemberPositionsByVoteId } = detail;
  const billSummary = await getBillSummary(bill);
  const billVote = billVotes[0];
  const voteTotals = getVoteTotals(billVote);
  const voteDots = buildVoteDots(voteTotals);
  const status = getBillStatus(bill);
  const activeTab = normalizeTab(searchParams?.tab);
  const displayNumber = bill.displayNumber.replace(". ", ".");
  const introducedDate = bill.introducedDate ?? bill.latestActionDate;
  const committeeDate = bill.latestActionDate;
  const progressSteps: ProgressStep[] = [
    { label: "Introduced", date: formatDate(introducedDate), icon: FileCheck2 },
    { label: "Referred to Committee", date: formatDate(committeeDate), icon: FileText },
    { label: status === "In Committee" ? "Committee Hearing" : bill.latestActionText, date: formatDate(bill.latestActionDate), icon: FileClock },
    { label: "Marked Up", date: "", icon: FilePenLine },
    { label: "Passed", date: "", icon: FileCheck2 }
  ];

  return (
    <MobileShell
      minHeight="min-h-[1080px]"
      contentClassName="px-8 pb-5 pt-8"
      statusBarClassName="flex items-center justify-between text-[17px] font-semibold"
    >
      <header className="mt-10 flex items-center justify-between">
        <Link href="/dashboard" className={mobileIconButtonClass} aria-label="Back to dashboard">
          <ArrowLeft className="h-7 w-7" strokeWidth={2.2} aria-hidden="true" />
        </Link>
        <div className="flex items-center gap-5">
          <SaveTargetButton targetType="bill" targetId={bill.id} label="Save bill" />
          <GamificationEventAnchor
            href={bill.sourceUrl}
            event="open-official-source"
            targetId={`${bill.id}-header-source`}
            className={mobileIconButtonClass}
            aria-label="Open official bill source"
          >
            <Share2 className="h-7 w-7" strokeWidth={1.9} aria-hidden="true" />
          </GamificationEventAnchor>
        </div>
      </header>

      <section className="mt-10">
        <div className="flex items-center gap-4">
          <h1 className="text-[44px] font-semibold leading-none text-white">{displayNumber}</h1>
          <span className="rounded-full border border-emerald-400/35 bg-emerald-400/13 px-4 py-2 text-[18px] font-medium text-[#59ee83]">
            {status}
          </span>
        </div>
        <h2 className="mt-5 text-[23px] font-medium leading-tight text-white">{bill.shortTitle}</h2>
      </section>

      <nav className="mt-10 flex items-center justify-between border-b border-white/10 text-center text-[19px]">
        {billTabs.map((tab) => {
          const active = activeTab === tab.value;
          return (
            <Link key={tab.value} href={tabHref(bill.id, tab.value)} className={`min-w-20 pb-5 ${active ? "border-b-2 border-[#ffb12b] font-medium text-[#ffb12b]" : "text-white/58"}`}>
              {tab.label}
            </Link>
          );
        })}
      </nav>

      <main className="mt-7 space-y-5 pb-8">
        {activeTab === "overview" ? (
          <>
            <ProgressSummaryCard billId={bill.id} progressSteps={progressSteps} />
            <VoteBreakdownCard billId={bill.id} vote={billVote} voteDots={voteDots} voteTotals={voteTotals} />
            <KeyDetailsCard bill={bill} introducedDate={introducedDate} sponsor={sponsor} />
          </>
        ) : null}

        {activeTab === "votes" ? <VotesTab billVotes={billVotes} voteMemberPositionsByVoteId={voteMemberPositionsByVoteId} /> : null}

        {activeTab === "timeline" ? <TimelineTab bill={bill} billVideos={billVideos} progressSteps={progressSteps} status={status} /> : null}

        {activeTab === "details" ? (
          <>
            <BillSummaryCard bill={bill} status={status} summary={billSummary} />
            <PlanFeatureGate feature="aiPolicyLens">
              <AiPolicyLensCard analysis={buildAiBillAnalysis(bill, billSummary.text)} />
            </PlanFeatureGate>
            <KeyDetailsCard bill={bill} introducedDate={introducedDate} sponsor={sponsor} />
            <PlanFeatureGate feature="sourceMap">
              <SourceMapCard sourceMatches={sourceMatches} />
            </PlanFeatureGate>
            <PlanFeatureGate feature="speechVideo">
              <VideoCard billVideos={billVideos} />
            </PlanFeatureGate>
          </>
        ) : null}
      </main>

      <MobileBottomNav
        className="sticky bottom-0 -mx-8 mt-auto border-t border-white/8 bg-[#031126]/96 px-8 pb-3 pt-4 backdrop-blur-xl"
        indicatorClassName="mx-auto mt-4 h-1.5 w-36 rounded-full bg-white/70"
        items={[
          { href: "/dashboard", icon: <Home />, label: "Home" },
          { active: true, href: "/search?type=bills", icon: <FileText />, label: "Bills" },
          { href: "/search", icon: <Search />, label: "Search" },
          { badge: "3", href: "/alerts", icon: <Bell />, label: "Alerts" },
          { href: "/account", icon: <UserRound />, label: "Profile" }
        ]}
      />
    </MobileShell>
  );
}

function ProgressSummaryCard({ billId, progressSteps }: { billId: string; progressSteps: ProgressStep[] }) {
  return (
    <MobileCard variant="rust" className="px-6 pb-10 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-[23px] font-medium">Bill Progress</h2>
        <Link href={tabHref(billId, "timeline")} className={mobileViewAllClass}>
          View Timeline
        </Link>
      </div>
      <div className="mt-9 px-2">
        <div className="relative h-12">
          <div className="absolute left-3 right-3 top-[1.375rem] h-[3px] bg-white/13" />
          <div className="absolute left-3 top-[1.375rem] h-[3px] w-[46%] bg-[#ffb12b]" />
          {progressSteps.map((step, index) => {
            const active = index < 3;
            const Icon = step.icon;
            const left = `${index * 25}%`;
            return (
              <div key={step.label} className="absolute top-0 -translate-x-1/2" style={{ left }}>
                <span className={`grid h-11 w-11 place-items-center rounded-full ${active ? "border-2 border-[#ffb12b] bg-[#07172d] text-[#ffb12b] shadow-[0_0_20px_rgba(255,177,43,0.35)]" : "border-2 border-white/13 bg-[#07172d] text-white/25"}`}>
                  <Icon className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
                </span>
              </div>
            );
          })}
        </div>
        <div className="mt-5 grid min-h-[4.25rem] grid-cols-5 items-start text-center text-[14px] leading-tight">
          {progressSteps.map((step, index) => (
            <div key={`${step.label}-label`} className={`px-1 ${index === 2 ? "font-medium text-[#ffb12b]" : "text-white/76"}`}>
              {index === 1 || index === 2 ? (
                <>
                  <span className="block">{step.label}</span>
                  <span className="mt-1 block text-[13px] font-normal text-white/63">{step.date}</span>
                </>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </MobileCard>
  );
}

function BillSummaryCard({ bill, status, summary }: { bill: Bill; status: string; summary: BillSummaryResolution }) {
  const sourceTone =
    summary.source === "official"
      ? "border-emerald-400/24 bg-emerald-400/10 text-[#59ee83]"
      : summary.source === "stored"
        ? "border-rust/30 bg-rust/10 text-[#ffb12b]"
        : "border-white/10 bg-white/5 text-white/56";

  return (
    <MobileCard variant="rust" className="px-6 py-6">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-5">
        <div className="min-w-0">
          <div className="text-[13px] font-medium uppercase tracking-wide text-white/50">Bill Summary</div>
          <h2 className="mt-2 text-[23px] font-medium leading-tight">{bill.shortTitle}</h2>
          <div className={`mt-3 inline-flex rounded-full border px-3 py-1.5 text-[12px] font-medium ${sourceTone}`}>
            {summary.label}
          </div>
        </div>
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#ffb12b]/12 text-[#ffb12b]">
          <FileText className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
        </span>
      </div>
      <ScrollableTextBox className="text-[16px] text-white/64">
        {summary.text}
      </ScrollableTextBox>
      <div className="mt-5 flex flex-wrap gap-2">
        <span className="rounded-full border border-rust/30 bg-rust/10 px-3 py-1.5 text-[12px] font-medium text-[#ffb12b]">
          {bill.policyArea}
        </span>
        <span className="rounded-full border border-emerald-400/24 bg-emerald-400/10 px-3 py-1.5 text-[12px] font-medium text-[#59ee83]">
          {status}
        </span>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[12px] font-medium text-white/56">
          {bill.congress}th Congress
        </span>
        {summary.publishedAt ? (
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[12px] font-medium text-white/56">
            Updated {formatDate(summary.publishedAt)}
          </span>
        ) : null}
      </div>
    </MobileCard>
  );
}

function AiPolicyLensCard({ analysis }: { analysis: AiBillAnalysis }) {
  return (
    <MobileCard variant="rust" className="px-6 py-6">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-5">
        <div className="min-w-0">
          <div className="text-[13px] font-medium uppercase tracking-wide text-white/50">AI Policy Lens</div>
          <h2 className="mt-2 text-[23px] font-medium leading-tight">Personal Impact</h2>
          <p className="mt-2 text-[13px] leading-5 text-white/50">An easy read on how this bill could show up in your household, community, wallet, or rights.</p>
        </div>
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#ffb12b]/12 text-[#ffb12b]">
          <Sparkles className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
        </span>
      </div>
      <ScrollableTextBox className="text-[15px] text-white/68">
        {analysis.context}
      </ScrollableTextBox>
      <div className="mt-5 grid gap-4">
        <AiPointGroup title="How It Could Help You" tone="pro" points={analysis.pros} />
        <AiPointGroup title="What Could Work Against You" tone="con" points={analysis.cons} />
      </div>
    </MobileCard>
  );
}

function AiPointGroup({ points, title, tone }: { points: string[]; title: string; tone: "pro" | "con" }) {
  const positive = tone === "pro";

  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4">
      <div className={`flex items-center gap-2 text-[15px] font-semibold ${positive ? "text-[#43ed74]" : "text-[#ffb12b]"}`}>
        {positive ? <CheckCircle2 className="h-4 w-4" strokeWidth={2} aria-hidden="true" /> : <CircleAlert className="h-4 w-4" strokeWidth={2} aria-hidden="true" />}
        {title}
      </div>
      <div className="mt-3 space-y-3">
        {points.map((point) => (
          <div key={point} className="grid grid-cols-[8px_minmax(0,1fr)] gap-3 text-[14px] leading-5 text-white/62">
            <span className={`mt-2 h-1.5 w-1.5 rounded-full ${positive ? "bg-[#43ed74]" : "bg-[#ffb12b]"}`} />
            <span>{point}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScrollableTextBox({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`mt-5 max-h-32 overflow-y-auto overscroll-contain rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4 leading-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}>
      <p className="whitespace-pre-line">{children}</p>
    </div>
  );
}

function VoteBreakdownCard({
  billId,
  vote,
  voteDots,
  voteTotals
}: {
  billId: string;
  vote?: Vote;
  voteDots: Array<{ color: string; x: number; y: number }>;
  voteTotals: { yes: number; no: number; present: number; notVoting: number };
}) {
  return (
    <MobileCard variant="rust" className="px-6 py-6">
      <div className="flex items-center justify-between">
        <h2 className="text-[23px] font-medium">Vote Breakdown</h2>
        <Link href={vote ? `/votes/${vote.id}` : tabHref(billId, "votes")} className={mobileViewAllClass}>
          View All
        </Link>
      </div>
      <div className="relative mx-0 mt-6 h-36 w-full" aria-hidden="true">
        {voteDots.map((dot, index) => (
          <span
            key={index}
            className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ left: `${dot.x}%`, top: `${dot.y}%`, backgroundColor: dot.color }}
          />
        ))}
      </div>
      <div className="-mt-1 grid grid-cols-3 text-center">
        <VoteStat value={String(voteTotals.yes)} label="For" tone="text-[#58e883]" />
        <VoteStat value={String(voteTotals.no)} label="Against" tone="text-[#ff503d]" />
        <VoteStat value={String(voteTotals.notVoting)} label="Not Voting" tone="text-white/60" />
      </div>
    </MobileCard>
  );
}

function VotesTab({
  billVotes,
  voteMemberPositionsByVoteId
}: {
  billVotes: Vote[];
  voteMemberPositionsByVoteId: Record<string, VoteMemberPositionRecord[]>;
}) {
  if (!billVotes.length) {
    return (
      <MobileCard variant="rust" className="px-6 py-6">
        <h2 className="text-[23px] font-medium">Recorded Votes</h2>
        <p className="mt-3 text-[15px] leading-6 text-white/58">No recorded votes are linked to this bill yet.</p>
      </MobileCard>
    );
  }

  return (
    <>
      {billVotes.map((vote) => {
        const totals = getVoteTotals(vote);
        const positions = voteMemberPositionsByVoteId[vote.id] ?? [];
        return (
          <MobileCard key={vote.id} variant="rust" className="px-6 py-6">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-5">
              <div className="min-w-0">
                <div className="text-[13px] font-medium uppercase tracking-wide text-white/50">{vote.chamber} Roll Call {vote.rollCall}</div>
                <h2 className="mt-2 text-[22px] font-medium leading-tight">{vote.question}</h2>
                <p className="mt-2 text-[15px] leading-snug text-white/58">{formatDate(vote.voteDate)}</p>
              </div>
              <span className="shrink-0 rounded-full bg-[#2be68d]/10 px-3 py-2 text-[15px] font-medium leading-none text-[#2be68d]">{vote.result}</span>
            </div>
            <div className="mt-5 grid grid-cols-3 text-center">
              <VoteStat value={String(totals.yes)} label="Yea" tone="text-[#58e883]" />
              <VoteStat value={String(totals.no)} label="Nay" tone="text-[#ff503d]" />
              <VoteStat value={String(totals.notVoting)} label="Not Voting" tone="text-white/60" />
            </div>
            <div className="mt-5 divide-y divide-white/8">
              {positions.slice(0, 3).map((record) => record.member ? <MemberVoteRow key={record.member.bioguideId} member={record.member} position={record.position} /> : null)}
            </div>
            <Link href={`/votes/${vote.id}`} className="mt-5 flex h-12 items-center justify-center rounded-xl border border-rust/45 bg-rust/10 text-[17px] font-medium text-[#ffb12b]">
              Open Vote Detail
              <ChevronRight className="ml-2 h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
            </Link>
          </MobileCard>
        );
      })}
    </>
  );
}

function TimelineTab({
  bill,
  billVideos,
  progressSteps,
  status
}: {
  bill: Bill;
  billVideos: BillVideo[];
  progressSteps: ProgressStep[];
  status: string;
}) {
  return (
    <>
      <MobileCard variant="rust" className="px-6 py-6">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-5">
          <div>
            <div className="text-[13px] font-medium uppercase tracking-wide text-white/50">Legislative Timeline</div>
            <h2 className="mt-2 text-[23px] font-medium leading-tight">{status}</h2>
          </div>
          <FileClock className="h-8 w-8 text-[#ffb12b]" strokeWidth={1.8} aria-hidden="true" />
        </div>
        <div className="mt-6 space-y-5">
          {progressSteps.map((step, index) => (
            <TimelineRow key={step.label} active={index < 3} step={step} />
          ))}
        </div>
      </MobileCard>

      <MobileCard variant="rust" className="px-6 py-6">
        <h2 className="text-[23px] font-medium leading-tight">Latest Action</h2>
        <p className="mt-3 text-[17px] leading-snug text-white/68">{bill.latestActionText}</p>
        <div className="mt-4 flex items-center gap-2 text-[14px] text-white/50">
          <CalendarDays className="h-4 w-4 text-[#ffb12b]" strokeWidth={1.8} aria-hidden="true" />
          {formatDate(bill.latestActionDate)}
        </div>
      </MobileCard>

      <VideoCard billVideos={billVideos} compact />
    </>
  );
}

function KeyDetailsCard({
  bill,
  introducedDate,
  sponsor
}: {
  bill: Bill;
  introducedDate: string;
  sponsor?: Member;
}) {
  return (
    <MobileCard variant="rust" className="px-6 py-6">
      <h2 className="text-[23px] font-medium">Key Details</h2>
      <div className="mt-5 divide-y divide-white/8">
        <DetailRow
          image={sponsor?.photoUrl}
          label="Sponsor"
          value={sponsor?.fullName ?? "Congress"}
          href={sponsor ? `/members/${sponsor.bioguideId}` : undefined}
        />
        <DetailRow icon={<CalendarDays />} label="Introduced" value={formatDate(introducedDate)} />
        <DetailRow icon={<BriefcaseBusiness />} label="Committee" value={bill.committeeName ?? "Committee pending"} href="/search?type=bills" />
      </div>
    </MobileCard>
  );
}

function SourceMapCard({ sourceMatches }: { sourceMatches: BillSourceMatch[] }) {
  return (
    <MobileCard variant="rust" className="px-6 py-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-[23px] font-medium">Official Source Map</h2>
          <p className="mt-2 text-[13px] leading-5 text-white/52">Matched evidence trail for bill record, votes, hearings, floor video, and sponsor records.</p>
        </div>
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#43ed74]/12 text-[#43ed74]">
          <ShieldCheck className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
        </span>
      </div>
      <div className="mt-5 flex h-[248px] snap-y snap-mandatory flex-col gap-3 overflow-y-auto overscroll-contain pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {sourceMatches.map((match) => (
          <SourceMatchRow key={match.id} match={match} />
        ))}
      </div>
      {sourceMatches.length > 1 ? (
        <div className="mt-4 flex items-center justify-between text-[12px] font-medium text-white/42">
          <span>Scroll sources</span>
          <span>{sourceMatches.length} linked records</span>
        </div>
      ) : null}
    </MobileCard>
  );
}

function VideoCard({ billVideos, compact = false }: { billVideos: BillVideo[]; compact?: boolean }) {
  return (
    <MobileCard variant="rust" className="px-6 py-6">
      <div className="flex items-center justify-between">
        <h2 className="text-[23px] font-medium">Speeches & Video</h2>
        <span className="rounded-full border border-rust/30 bg-rust/10 px-3 py-1 text-[12px] font-semibold text-[#ffb12b]">
          {billVideos.length} links
        </span>
      </div>
      <div className="mt-5 divide-y divide-white/8">
        {billVideos.length ? billVideos.slice(0, compact ? 2 : billVideos.length).map((video) => <VideoRow key={video.id} video={video} />) : <div className="py-4 text-[15px] text-white/52">No linked speeches or video yet.</div>}
      </div>
    </MobileCard>
  );
}

function VoteStat({ value, label, tone }: { value: string; label: string; tone: string }) {
  return (
    <div className="border-r border-white/8 last:border-r-0">
      <div className={`text-[34px] font-medium leading-none ${tone}`}>{value}</div>
      <div className="mt-2 text-[18px] text-white/67">{label}</div>
    </div>
  );
}

function TimelineRow({ active, step }: { active: boolean; step: ProgressStep }) {
  const Icon = step.icon;
  return (
    <div className="grid grid-cols-[44px_minmax(0,1fr)] gap-4">
      <span className={`grid h-11 w-11 place-items-center rounded-full ${active ? "border-2 border-[#ffb12b] bg-[#07172d] text-[#ffb12b] shadow-[0_0_20px_rgba(255,177,43,0.28)]" : "border-2 border-white/13 bg-[#07172d] text-white/28"}`}>
        <Icon className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
      </span>
      <div className="pb-5">
        <div className={`text-[18px] font-semibold leading-tight ${active ? "text-white" : "text-white/44"}`}>{step.label}</div>
        {step.date ? <div className="mt-1 text-[14px] text-white/50">{step.date}</div> : <div className="mt-1 text-[14px] text-white/34">Pending</div>}
      </div>
    </div>
  );
}

function MemberVoteRow({ member, position }: { member: Member; position: VotePosition }) {
  return (
    <Link href={`/members/${member.bioguideId}`} className="grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 py-4">
      {member.photoUrl ? <img src={member.photoUrl} alt="" className="h-11 w-11 rounded-full border border-rust/35 object-cover" /> : <span className="grid h-11 w-11 place-items-center rounded-full bg-white/6 text-white/54"><UserRound className="h-6 w-6" /></span>}
      <span className="min-w-0">
        <span className="block truncate text-[16px] font-semibold text-white">{member.fullName}</span>
        <span className="mt-1 block text-[13px] text-white/52">{member.state} · {member.party}</span>
      </span>
      <PositionPill position={position} />
    </Link>
  );
}

function PositionPill({ position }: { position: VotePosition }) {
  const classes =
    position === "Yes"
      ? "bg-[#43ed74]/12 text-[#43ed74]"
      : position === "No"
        ? "bg-[#ff503d]/12 text-[#ff6b5c]"
        : position === "Present"
          ? "bg-[#ffb12b]/12 text-[#ffb12b]"
          : "bg-white/8 text-white/60";

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[13px] font-medium leading-none ${classes}`}>
      {position === "Yes" ? <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" /> : <VoteIcon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />}
      {position}
    </span>
  );
}

function DetailRow({
  icon,
  image,
  label,
  value,
  href
}: {
  icon?: ReactElement;
  image?: string;
  label: string;
  value: string;
  href?: string;
}) {
  const content = (
    <div className="flex items-center justify-between gap-3 py-4">
      <div className="flex min-w-0 items-center gap-4 text-white/60">
        {image ? <img src={image} alt="" className="h-11 w-11 rounded-full object-cover" /> : <span className="[&>svg]:h-6 [&>svg]:w-6 [&>svg]:stroke-[1.7]">{icon}</span>}
        <span className="text-[19px]">{label}</span>
      </div>
      <div className="flex min-w-0 items-center gap-2 text-right text-[19px] font-semibold text-white">
        <span className="truncate">{value}</span>
        {href ? <ChevronRight className="h-5 w-5 shrink-0 text-white/60" aria-hidden="true" /> : null}
      </div>
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

function SourceMatchRow({ match }: { match: BillSourceMatch }) {
  return (
    <GamificationEventAnchor href={match.url} event="open-official-source" targetId={match.id} className="block h-[248px] shrink-0 snap-start rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#ffb12b]/12 text-[#ffb12b]">
          <Link2 className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-rust/25 bg-rust/10 px-2 py-0.5 text-[11px] font-semibold text-[#ffb12b]">
              {match.matchKind}
            </span>
            <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${match.confidence === "high" ? "border-[#43ed74]/24 bg-[#43ed74]/10 text-[#43ed74]" : "border-white/12 bg-white/6 text-white/54"}`}>
              {match.confidence} confidence
            </span>
          </div>
          <div className="mt-2 text-[16px] font-semibold leading-snug text-white">{match.label}</div>
          <p className="mt-2 text-[13px] leading-5 text-white/54">{match.reason}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] font-semibold text-white/58">
            <ExternalLink className="h-4 w-4 text-[#ffb12b]" strokeWidth={1.8} aria-hidden="true" />
            {match.source}
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-white/50">{match.sourceKind}</span>
            {match.verifiedAt ? <span className="text-[#43ed74]">Verified {formatDate(match.verifiedAt)}</span> : null}
          </div>
        </div>
      </div>
    </GamificationEventAnchor>
  );
}

function VideoRow({ video }: { video: BillVideo }) {
  return (
    <GamificationEventAnchor href={video.videoUrl} event="watch-speech-video" targetId={video.id} className="block py-4">
      <div className="flex items-start gap-4">
        <span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#ffb12b]/12 text-[#ffb12b]">
          <PlayCircle className="h-7 w-7" strokeWidth={1.7} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-[#ffb12b]">
            <MessageSquareText className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
            {video.type}
          </div>
          <div className="mt-2 text-[17px] font-semibold leading-snug text-white">{video.title}</div>
          <p className="mt-2 line-clamp-2 text-[13px] leading-5 text-white/54">{video.summary}</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-white/45">
            <span>{video.speaker}</span>
            <span>{video.role}</span>
            <span>{video.duration}</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[13px] font-semibold text-white/62">
            <ExternalLink className="h-4 w-4 text-[#ffb12b]" strokeWidth={1.8} aria-hidden="true" />
            {video.source}
            {video.sourceKind ? (
              <span className="rounded-full border border-[#ffb12b]/22 bg-[#ffb12b]/10 px-2 py-0.5 text-[11px] text-[#ffbf45]">
                {video.sourceKind}
              </span>
            ) : null}
            {video.verifiedAt ? (
              <span className="rounded-full border border-emerald-400/22 bg-emerald-400/10 px-2 py-0.5 text-[11px] text-[#59ee83]">
                Verified {formatDate(video.verifiedAt)}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </GamificationEventAnchor>
  );
}
