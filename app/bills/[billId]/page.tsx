import { MobileShell } from "@/components/mobile-shell";
import { BillStanceControl } from "@/components/bill-stance-controls";
import { GamificationEventAnchor } from "@/components/gamification-actions";
import { MobileBottomNav, MobileCard, mobileIconButtonClass, mobileViewAllClass } from "@/components/mobile-ui";
import { MobileGlassScrollFrame } from "@/components/mobile-glass-scroll-frame";
import { HistoryBackButton } from "@/components/history-back-button";
import { SaveTargetButton } from "@/components/saved-ledger-controls";
import { PlanFeatureGate } from "@/components/subscription-controls";
import { VoteSpreadPanel } from "@/components/vote-spread-panel";
import Image from "next/image";
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
  UsersRound,
  Settings,
  UserRound,
  Vote as VoteIcon,
  type LucideIcon
} from "lucide-react";
import { getBillDetailWithLiveData, getBillSummary, getBillStatus, getVoteTotals } from "@/lib/data";
import { getCurrentEffectiveAccountSubscription } from "@/lib/effective-account-subscription";
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
  const isVeteransOrMilitaryBill = matchesAny(text, [
    "veteran",
    "veterans",
    "military",
    "armed forces",
    "servicemember",
    "service member",
    "servicemen",
    "merchant marine",
    "merchant marines",
    "mariner",
    "mariners",
    "world war",
    "department of veterans affairs",
    "va benefits",
    "health care for veterans"
  ]);

  if (matchesAny(text, ["forest", "forests", "wildfire", "wildfires", "fireshed", "firesheds", "public lands", "natural resources", "forest management", "land management"])) {
    return {
      context: `${billName} could show up through wildfire risk, public lands management, local air quality, emergency planning, forest jobs, and how quickly agencies approve forest projects. ${statusLine}`,
      pros: [
        "Communities near high-risk firesheds could benefit if planning and fuel-reduction projects move faster and target the places most exposed to wildfire.",
        "Better wildfire intelligence and coordination can help local officials, firefighters, and residents see risk earlier instead of waiting for a crisis.",
        "Expedited review for certain forest projects could help remove hazardous fuel, restore habitat, or protect roads, water systems, and homes sooner."
      ],
      cons: [
        "Faster environmental review can reduce public input or miss local habitat, water, or tribal concerns if safeguards are too thin.",
        "Benefits may concentrate near selected firesheds, leaving other wildfire-prone communities waiting.",
        "If funding and agency staffing do not match the new deadlines, communities may see faster paperwork without safer forests."
      ]
    };
  }

  if (isVeteransOrMilitaryBill && matchesAny(text, ["payment", "benefit", "benefits", "compensation", "pension", "readjustment act", "servicemen's readjustment act"])) {
    return {
      context: `${billName} could show up as a targeted service benefit: eligible veterans or merchant mariners may need to prove qualifying service, apply through the Department of Veterans Affairs, and track whether a one-time payment or benefit reaches them. ${statusLine}`,
      pros: [
        "Eligible WWII merchant mariners or other covered service members could receive recognition through a direct federal benefit instead of only symbolic honors.",
        "Clearer eligibility rules can help families understand what service records, licensing history, or prior-benefit history they need before applying.",
        "Putting the process through VA can give applicants a familiar federal channel for questions, records, and payment status."
      ],
      cons: [
        "People with missing records, unclear service history, or prior benefits may be excluded even if they feel the service was comparable.",
        "Older applicants, or families helping them with records, may miss the benefit if outreach, paperwork, or documentation requirements are hard to navigate.",
        "A one-time payment can recognize past service but may not solve ongoing health, caregiving, or financial needs."
      ]
    };
  }

  if (isVeteransOrMilitaryBill) {
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

  if (matchesAny(text, ["child", "children", "childcare", "child care", "family care", "families with children", "parents", "caregiver"])) {
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

  if (matchesAny(text, ["health", "health care", "healthcare", "medical", "medicare", "medicaid", "hospital", "clinic", "patient", "patients", "public health", "provider", "providers"])) {
    return {
      context: `${billName} could affect people through health coverage, care access, provider capacity, medical costs, or public-health programs. ${statusLine}`,
      pros: [
        "Patients could benefit if the bill makes coverage, eligibility, or services clearer and easier to use.",
        "Local providers may get better guidance, funding, or coordination if the bill targets gaps in care delivery.",
        "More reporting can help families see whether promised health resources are actually reaching their community."
      ],
      cons: [
        "Benefits may depend on eligibility, state rollout, provider availability, or whether local systems have enough staff to act.",
        "New health rules can create paperwork for patients and providers if implementation is not simple.",
        "Costs can still show up through premiums, taxes, reduced services, or delayed care if funding is too narrow."
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

  if (matchesAny(text, ["border", "border security", "homeland security", "customs", "border patrol", "port of entry", "ports of entry", "immigration enforcement", "infrastructure review"])) {
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
  return terms.some((term) => {
    const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
    return new RegExp(`(^|[^a-z0-9])${escapedTerm}($|[^a-z0-9])`, "i").test(text);
  });
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

export default async function BillPage({ params, searchParams }: BillPageProps) {
  const [detail, initialSubscription] = await Promise.all([getBillDetailWithLiveData(params.billId), getCurrentEffectiveAccountSubscription()]);
  if (!detail) notFound();

  const { bill, billVideos, billVotes, cosponsors, sourceMatches, sponsor, voteMemberPositionsByVoteId } = detail;
  const billSummary = await getBillSummary(bill);
  const billVote = billVotes[0];
  const voteTotals = getVoteTotals(billVote);
  const status = getBillStatus(bill);
  const activeTab = normalizeTab(searchParams?.tab);
  const displayNumber = bill.displayNumber.replace(". ", ".");
  const headerTitle = bill.shortTitle || bill.title;
  let headerTitleSizeClass = "text-[32px] leading-[1.06]";
  if (headerTitle.length > 90) headerTitleSizeClass = "text-[24px] leading-[1.12]";
  else if (headerTitle.length > 54) headerTitleSizeClass = "text-[27px] leading-[1.1]";
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
        <HistoryBackButton className={mobileIconButtonClass}>
          <ArrowLeft className="h-7 w-7" strokeWidth={2.2} aria-hidden="true" />
        </HistoryBackButton>
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
        <h1 className={`${headerTitleSizeClass} hyphens-auto break-words font-semibold text-white`} style={{ overflowWrap: "anywhere" }}>
          {headerTitle}
        </h1>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="rounded-full border border-white/12 bg-white/[0.055] px-3.5 py-2 text-[15px] font-semibold leading-none text-white/72">
            {displayNumber}
          </span>
          <span className="rounded-full border border-emerald-400/35 bg-emerald-400/13 px-3.5 py-2 text-[15px] font-medium leading-none text-[#59ee83]">
            {status}
          </span>
        </div>
        <BillStanceControl billId={bill.id} />
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
            <KeyDetailsCard bill={bill} cosponsors={cosponsors} introducedDate={introducedDate} sponsor={sponsor} />
            <ProgressSummaryCard billId={bill.id} progressSteps={progressSteps} />
            <VoteBreakdownCard billId={bill.id} vote={billVote} voteTotals={voteTotals} />
          </>
        ) : null}

        {activeTab === "votes" ? <VotesTab billVotes={billVotes} voteMemberPositionsByVoteId={voteMemberPositionsByVoteId} /> : null}

        {activeTab === "timeline" ? <TimelineTab bill={bill} billVideos={billVideos} progressSteps={progressSteps} status={status} /> : null}

        {activeTab === "details" ? (
          <>
            <BillSummaryCard bill={bill} status={status} summary={billSummary} />
            <PlanFeatureGate feature="aiPolicyLens" initialSubscription={initialSubscription}>
              <AiPolicyLensCard analysis={buildAiBillAnalysis(bill, billSummary.text)} />
            </PlanFeatureGate>
            <PlanFeatureGate feature="sourceMap" initialSubscription={initialSubscription}>
              <SourceMapCard sourceMatches={sourceMatches} />
            </PlanFeatureGate>
            <PlanFeatureGate feature="speechVideo" initialSubscription={initialSubscription}>
              <VideoCard billVideos={billVideos} />
            </PlanFeatureGate>
          </>
        ) : null}
      </main>

      <MobileBottomNav
        indicatorClassName="mx-auto mt-4 h-1.5 w-36 rounded-full bg-white/70"
        items={[
          { href: "/dashboard", icon: <Home />, label: "Home" },
          { active: true, href: "/search?type=bills", icon: <FileText />, label: "Bills" },
          { href: "/search", icon: <Search />, label: "Search" },
          { href: "/alerts", icon: <Bell />, label: "Alerts" },
          { href: "/settings", icon: <Settings />, label: "Settings" }
        ]}
      />
    </MobileShell>
  );
}

function ProgressSummaryCard({ billId, progressSteps }: { billId: string; progressSteps: ProgressStep[] }) {
  const activeStepIndex = progressSteps.reduce((latestIndex, step, index) => (step.date ? index : latestIndex), 0);
  const currentStep = progressSteps[activeStepIndex];
  const progressFillPercent = (activeStepIndex / Math.max(1, progressSteps.length - 1)) * 100;

  return (
    <MobileCard variant="rust" className="px-5 py-5">
      <div className="flex items-center justify-between">
        <h2 className="text-[23px] font-medium">Bill Progress</h2>
        <Link href={tabHref(billId, "timeline")} className={mobileViewAllClass}>
          View Timeline
        </Link>
      </div>
      <div className="mt-7 px-2">
        <div className="relative h-11">
          <div className="absolute left-3 right-3 top-5 h-[3px] bg-white/13" />
          <div className="absolute left-3 top-5 h-[3px] bg-[#ffb12b]" style={{ width: activeStepIndex === 0 ? "0" : `calc(${progressFillPercent}% - 0.75rem)` }} />
          {progressSteps.map((step, index) => {
            const active = index <= activeStepIndex;
            const Icon = step.icon;
            const left = `${index * 25}%`;
            return (
              <div key={step.label} className="absolute top-0 -translate-x-1/2" style={{ left }}>
                <span className={`grid h-10 w-10 place-items-center rounded-full ${active ? "border-2 border-[#ffb12b] bg-[#07172d] text-[#ffb12b] shadow-[0_0_18px_rgba(255,177,43,0.32)]" : "border-2 border-white/13 bg-[#07172d] text-white/25"}`}>
                  <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden="true" />
                </span>
              </div>
            );
          })}
        </div>
        <div className="mt-3 grid grid-cols-5 gap-1 text-center">
          {progressSteps.map((step, index) => (
            <div key={`${step.label}-label`} className={index === activeStepIndex ? "text-[#ffb12b]" : index < activeStepIndex ? "text-white/72" : "text-white/34"}>
              <div className="truncate text-[10px] font-semibold uppercase tracking-[0.04em]">{compactProgressLabel(step.label)}</div>
              <div className="mt-1 truncate text-[10px] leading-none">{step.date ? compactProgressDate(step.date) : "Pending"}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-xl border border-[#ffb12b]/28 bg-[#ffb12b]/8 px-3 py-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/45">Current</span>
            <span className="min-w-0 truncate text-right text-[13px] font-medium text-[#ffb12b]">
              {currentStep.label}
              {currentStep.date ? <span className="font-normal text-[#ffd083]"> / {currentStep.date}</span> : null}
            </span>
          </div>
        </div>
      </div>
    </MobileCard>
  );
}

function compactProgressLabel(label: string) {
  if (label === "Referred to Committee") return "Referred";
  if (label === "Committee Hearing") return "Hearing";
  if (label === "Marked Up") return "Markup";
  return label;
}

function compactProgressDate(date: string) {
  return date.replace(/, \d{4}$/, "");
}

function BillSummaryCard({ bill, status, summary }: { bill: Bill; status: string; summary: BillSummaryResolution }) {
  const sourceTone =
    summary.source === "official"
      ? "border-emerald-400/26 bg-emerald-400/10 text-[#59ee83]"
      : summary.source === "stored"
        ? "border-[#ffb12b]/32 bg-[#ffb12b]/10 text-[#ffb12b]"
        : "border-white/10 bg-white/5 text-white/56";

  return (
    <MobileCard variant="rust" className="overflow-hidden px-5 py-5">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-5">
        <div className="min-w-0">
          <div className="text-[12px] font-semibold uppercase tracking-[0.1em] text-white/48">Bill Summary</div>
          <h2 className="mt-2 text-[24px] font-medium leading-tight">{bill.shortTitle}</h2>
          <div className={`mt-3 inline-flex rounded-full border px-3 py-1.5 text-[12px] font-semibold leading-none ${sourceTone}`}>
            {summary.label}
          </div>
        </div>
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-[#ffb12b]/24 bg-[#ffb12b]/10 text-[#ffb12b] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_18px_rgba(255,177,43,0.16)]">
          <FileText className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
        </span>
      </div>
      <ScrollableTextBox className="text-[16px] text-white/70">
        {summary.text}
      </ScrollableTextBox>
      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded-full border border-[#ffb12b]/30 bg-[#ffb12b]/10 px-3 py-1.5 text-[12px] font-semibold text-[#ffb12b] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
          {bill.policyArea}
        </span>
        <span className="rounded-full border border-emerald-400/24 bg-emerald-400/10 px-3 py-1.5 text-[12px] font-semibold text-[#59ee83] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
          {status}
        </span>
        <span className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5 text-[12px] font-semibold text-white/56">
          {bill.congress}th Congress
        </span>
        {summary.publishedAt ? (
          <span className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5 text-[12px] font-semibold text-white/56">
            Updated {formatDate(summary.publishedAt)}
          </span>
        ) : null}
      </div>
    </MobileCard>
  );
}

function AiPolicyLensCard({ analysis }: { analysis: AiBillAnalysis }) {
  return (
    <MobileCard variant="rust" className="overflow-hidden px-5 py-5">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-5">
        <div className="min-w-0">
          <div className="text-[12px] font-semibold uppercase tracking-[0.1em] text-white/48">AI Policy Lens</div>
          <h2 className="mt-2 text-[24px] font-medium leading-tight">Personal Impact</h2>
          <p className="mt-2 text-[13px] leading-5 text-white/54">An easy read on how this bill could show up in your household, community, wallet, or rights.</p>
        </div>
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-[#ffb12b]/24 bg-[#ffb12b]/10 text-[#ffb12b] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_18px_rgba(255,177,43,0.16)]">
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
    <div className="rounded-[1.15rem] border border-white/10 bg-[linear-gradient(180deg,rgba(29,83,145,0.22)_0%,rgba(7,23,50,0.68)_100%)] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_12px_24px_rgba(2,10,28,0.24)]">
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
    <MobileGlassScrollFrame heightClassName="max-h-32" className={`px-4 py-4 leading-6 ${className}`}>
      <p className="whitespace-pre-line">{children}</p>
    </MobileGlassScrollFrame>
  );
}

function VoteBreakdownCard({
  billId,
  vote,
  voteTotals
}: {
  billId: string;
  vote?: Vote;
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
      <VoteSpreadPanel className="mt-5" totals={voteTotals} yesLabel="For" noLabel="Against" />
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
  const activeStepCount = progressSteps.filter((step) => Boolean(step.date)).length;
  const completionPercent = Math.round((activeStepCount / Math.max(1, progressSteps.length)) * 100);
  const currentStepIndex = Math.max(0, activeStepCount - 1);

  return (
    <>
      <MobileCard variant="rust" className="overflow-hidden px-5 py-5">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-5">
          <div>
            <div className="text-[12px] font-semibold uppercase tracking-[0.1em] text-white/48">Legislative Timeline</div>
            <h2 className="mt-2 text-[24px] font-medium leading-tight">{status}</h2>
          </div>
          <span className="grid h-12 w-12 place-items-center rounded-2xl border border-[#ffb12b]/24 bg-[#ffb12b]/10 text-[#ffb12b] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_18px_rgba(255,177,43,0.16)]">
            <FileClock className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
          </span>
        </div>
        <div className="mt-5 rounded-xl border border-white/10 bg-[#071a38]/65 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-[0.08em] text-white/48">
            <span>Progress</span>
            <span>{activeStepCount}/{progressSteps.length} stages</span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-[#c57b0b] via-[#ffb12b] to-[#ffd45c] shadow-[0_0_16px_rgba(255,177,43,0.24)]" style={{ width: `${completionPercent}%` }} />
          </div>
        </div>
        <div className="mt-5">
          {progressSteps.map((step, index) => (
            <TimelineRow
              key={step.label}
              active={Boolean(step.date)}
              current={index === currentStepIndex}
              isLast={index === progressSteps.length - 1}
              step={step}
            />
          ))}
        </div>
      </MobileCard>

      <MobileCard variant="rust" className="px-5 py-5">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
          <div className="min-w-0">
            <div className="text-[12px] font-semibold uppercase tracking-[0.1em] text-white/48">Current action</div>
            <h2 className="mt-2 text-[22px] font-medium leading-tight">Latest Action</h2>
          </div>
          <span className="grid h-11 w-11 place-items-center rounded-2xl border border-[#ffb12b]/24 bg-[#ffb12b]/10 text-[#ffb12b] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_18px_rgba(255,177,43,0.14)]">
            <CalendarDays className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
          </span>
        </div>
        <div className="mt-4 rounded-xl border border-white/10 bg-[#071a38]/65 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          <p className="text-[16px] leading-snug text-white/72">{bill.latestActionText}</p>
          <div className="mt-3 flex items-center justify-between gap-3 text-[13px] text-white/50">
            <span>{formatDate(bill.latestActionDate)}</span>
            <span className="rounded-full border border-[#ffb12b]/24 bg-[#ffb12b]/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.07em] text-[#ffb12b]">
              {status}
            </span>
          </div>
        </div>
      </MobileCard>

      <VideoCard billVideos={billVideos} compact />
    </>
  );
}

function KeyDetailsCard({
  bill,
  cosponsors,
  introducedDate,
  sponsor
}: {
  bill: Bill;
  cosponsors: Member[];
  introducedDate: string;
  sponsor?: Member;
}) {
  return (
    <MobileCard variant="rust" className="overflow-hidden px-5 py-5">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-5">
        <div>
          <div className="text-[12px] font-semibold uppercase tracking-[0.1em] text-white/48">Bill Metadata</div>
          <h2 className="mt-2 text-[24px] font-medium leading-tight">Key Details</h2>
        </div>
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-[#ffb12b]/24 bg-[#ffb12b]/10 text-[#ffb12b] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_18px_rgba(255,177,43,0.16)]">
          <FileCheck2 className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
        </span>
      </div>
      <div className="mt-5 grid gap-3">
        <DetailRow
          image={sponsor?.photoUrl}
          label="Sponsor"
          value={sponsor?.fullName ?? (bill.sponsorBioguideId ? "Sponsor profile pending" : "No sponsor listed")}
          href={sponsor ? `/members/${sponsor.bioguideId}` : undefined}
        />
        <CosponsorsRow cosponsors={cosponsors} />
        <DetailRow icon={<CalendarDays />} label="Introduced" value={formatDate(introducedDate)} />
        <DetailRow icon={<BriefcaseBusiness />} label="Committee" value={bill.committeeName ?? "Committee pending"} href="/search?type=bills" />
      </div>
    </MobileCard>
  );
}

function CosponsorsRow({ cosponsors }: { cosponsors: Member[] }) {
  return (
    <div className="grid grid-cols-[44px_minmax(0,1fr)] items-center gap-3 rounded-[1.15rem] border border-white/10 bg-[linear-gradient(180deg,rgba(29,83,145,0.22)_0%,rgba(7,23,50,0.68)_100%)] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_12px_24px_rgba(2,10,28,0.22)]">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/[0.035] text-[#ffb12b]">
        <UsersRound className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-white/46">Cosponsors</div>
        {cosponsors.length ? (
          <MobileGlassScrollFrame axis="horizontal" ariaLabel="Cosponsors" frameClassName="mt-1" className="flex gap-2">
            {cosponsors.map((member) => (
              <Link
                key={member.bioguideId}
                href={`/members/${member.bioguideId}`}
                className="grid h-8 min-w-[170px] grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-2 transition hover:bg-white/[0.07]"
              >
                <Image src={member.photoUrl ?? "/capitol-ledger-logo.png"} alt="" width={24} height={24} className="h-6 w-6 rounded-lg border border-white/12 object-cover" />
                <span className="truncate text-[12px] font-semibold leading-none text-white">{member.fullName}</span>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-white/42" aria-hidden="true" />
              </Link>
            ))}
          </MobileGlassScrollFrame>
        ) : (
          <div className="mt-1 truncate text-[16px] font-semibold leading-tight text-white">No cosponsors listed</div>
        )}
      </div>
    </div>
  );
}

function SourceMapCard({ sourceMatches }: { sourceMatches: BillSourceMatch[] }) {
  return (
    <MobileCard variant="rust" className="overflow-hidden px-5 py-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-[12px] font-semibold uppercase tracking-[0.1em] text-white/48">Evidence Trail</div>
          <h2 className="mt-2 text-[24px] font-medium leading-tight">Official Source Map</h2>
          <p className="mt-2 text-[13px] leading-5 text-white/54">Matched evidence trail for bill record, votes, hearings, floor video, and sponsor records.</p>
        </div>
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-[#43ed74]/24 bg-[#43ed74]/10 text-[#43ed74] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_18px_rgba(67,237,116,0.14)]">
          <ShieldCheck className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
        </span>
      </div>
      <MobileGlassScrollFrame heightClassName="h-[248px]" className="flex snap-y snap-mandatory flex-col gap-3">
        {sourceMatches.map((match) => (
          <SourceMatchRow key={match.id} match={match} />
        ))}
      </MobileGlassScrollFrame>
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
  const visibleVideos = billVideos.slice(0, compact ? 2 : billVideos.length);

  return (
    <MobileCard variant="rust" className="overflow-hidden px-5 py-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-white/48">
            <PlayCircle className="h-4 w-4 text-[#ffb12b]" strokeWidth={1.9} aria-hidden="true" />
            Source media
          </div>
          <h2 className="mt-2 text-[23px] font-medium leading-tight">Speeches & Video</h2>
        </div>
        <span className="shrink-0 rounded-full border border-[#ffb12b]/35 bg-[#ffb12b]/10 px-3 py-1.5 text-[12px] font-semibold leading-none text-[#ffb12b]">
          {billVideos.length} {billVideos.length === 1 ? "link" : "links"}
        </span>
      </div>
      <div className="mt-5 space-y-3">
        {visibleVideos.length ? visibleVideos.map((video) => <VideoRow key={video.id} video={video} />) : <div className="rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-4 text-[15px] text-white/52">No linked speeches or video yet.</div>}
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

function TimelineRow({
  active,
  current,
  isLast,
  step
}: {
  active: boolean;
  current: boolean;
  isLast: boolean;
  step: ProgressStep;
}) {
  const Icon = step.icon;
  const statusLabel = current ? "Current" : active ? "Complete" : "Pending";

  return (
    <div className="grid grid-cols-[48px_minmax(0,1fr)] gap-4">
      <div className="relative flex justify-center">
        {!isLast ? <span className={`absolute top-12 h-[calc(100%-20px)] w-px ${active ? "bg-[#ffb12b]/36" : "bg-white/10"}`} /> : null}
        <span
          className={`relative z-10 grid h-12 w-12 place-items-center rounded-2xl border ${
            current
              ? "border-[#ffb12b]/70 bg-[#ffb12b]/14 text-[#ffb12b] shadow-[0_0_22px_rgba(255,177,43,0.2)]"
              : active
                ? "border-[#ffb12b]/42 bg-[#ffb12b]/8 text-[#ffb12b]"
                : "border-white/14 bg-white/[0.035] text-white/32"
          }`}
        >
          <Icon className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
        </span>
      </div>
      <div className="pb-5">
        <div className="flex items-start justify-between gap-3">
          <div className={`text-[18px] font-semibold leading-tight ${active ? "text-white" : "text-white/46"}`}>{step.label}</div>
          <span
            className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.07em] ${
              current
                ? "border-[#ffb12b]/28 bg-[#ffb12b]/10 text-[#ffb12b]"
                : active
                  ? "border-[#43ed74]/22 bg-[#43ed74]/10 text-[#43ed74]"
                  : "border-white/10 bg-white/[0.035] text-white/38"
            }`}
          >
            {statusLabel}
          </span>
        </div>
        {step.date ? <div className="mt-1 text-[14px] text-white/50">{step.date}</div> : <div className="mt-1 text-[14px] text-white/34">Pending</div>}
      </div>
    </div>
  );
}

function MemberVoteRow({ member, position }: { member: Member; position: VotePosition }) {
  return (
    <Link href={`/members/${member.bioguideId}`} className="grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 py-4">
      {member.photoUrl ? <Image src={member.photoUrl} alt="" width={44} height={44} className="h-11 w-11 rounded-full border border-rust/35 object-cover" /> : <span className="grid h-11 w-11 place-items-center rounded-full bg-white/6 text-white/54"><UserRound className="h-6 w-6" /></span>}
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
    <div className="grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 rounded-[1.15rem] border border-white/10 bg-[linear-gradient(180deg,rgba(29,83,145,0.22)_0%,rgba(7,23,50,0.68)_100%)] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_12px_24px_rgba(2,10,28,0.22)]">
      <div className="text-white/62">
        {image ? (
          <Image src={image} alt="" width={44} height={44} className="h-11 w-11 rounded-2xl border border-white/12 object-cover shadow-[0_10px_18px_rgba(0,0,0,0.22)]" />
        ) : (
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/[0.035] text-[#ffb12b] [&>svg]:h-5 [&>svg]:w-5 [&>svg]:stroke-[1.8]">{icon}</span>
        )}
      </div>
      <div className="min-w-0">
        <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-white/46">{label}</div>
        <div className="mt-1 truncate text-[16px] font-semibold leading-tight text-white">{value}</div>
      </div>
      {href ? <ChevronRight className="h-5 w-5 shrink-0 text-white/60" aria-hidden="true" /> : <span />}
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

function SourceMatchRow({ match }: { match: BillSourceMatch }) {
  return (
    <GamificationEventAnchor
      href={match.url}
      event="open-official-source"
      targetId={match.id}
      className="block h-[248px] shrink-0 snap-start rounded-[1.15rem] border border-white/10 bg-[linear-gradient(180deg,rgba(29,83,145,0.24)_0%,rgba(7,23,50,0.7)_100%)] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_12px_24px_rgba(2,10,28,0.26)] transition hover:brightness-110"
    >
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-[#ffb12b]/24 bg-[#ffb12b]/10 text-[#ffb12b] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_18px_rgba(255,177,43,0.14)]">
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
    <GamificationEventAnchor
      href={video.videoUrl}
      event="watch-speech-video"
      targetId={video.id}
      className="block rounded-[1.15rem] border border-white/10 bg-[linear-gradient(180deg,rgba(29,83,145,0.26)_0%,rgba(7,23,50,0.72)_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_12px_24px_rgba(2,10,28,0.32)] transition hover:brightness-110"
    >
      <div className="grid grid-cols-[52px_minmax(0,1fr)] gap-4">
        <span className="relative grid h-[52px] w-[52px] shrink-0 place-items-center rounded-2xl border border-[#ffb12b]/24 bg-[#ffb12b]/10 text-[#ffb12b] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_18px_rgba(255,177,43,0.16)]">
          <PlayCircle className="h-7 w-7" strokeWidth={1.7} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#ffb12b]">
            <MessageSquareText className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
            {video.type}
            <span className="h-1 w-1 rounded-full bg-white/30" />
            <span className="text-white/46">{formatDate(video.publishedAt)}</span>
          </div>
          <div className="mt-2 text-[17px] font-semibold leading-snug text-white">{video.title}</div>
          <p className="mt-2 line-clamp-2 text-[13px] leading-5 text-white/54">{video.summary}</p>
          <div className="mt-3 grid gap-2 rounded-xl border border-white/8 bg-[#071a38]/65 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-white/48">
              <span>{video.speaker}</span>
              <span>{video.role}</span>
              <span>{video.duration}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[13px] font-semibold text-white/72">
              <ExternalLink className="h-4 w-4 text-[#ffb12b]" strokeWidth={1.8} aria-hidden="true" />
              <span>Open {video.source}</span>
              {video.sourceKind ? (
                <span className="rounded-full border border-[#ffb12b]/26 bg-[#ffb12b]/10 px-2 py-0.5 text-[11px] text-[#ffbf45]">
                  {video.sourceKind}
                </span>
              ) : null}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {video.verifiedAt ? (
              <span className="rounded-full border border-emerald-400/22 bg-emerald-400/10 px-2 py-0.5 text-[11px] text-[#59ee83]">
                Verified {formatDate(video.verifiedAt)}
              </span>
            ) : null}
            <span className="rounded-full border border-white/10 bg-white/[0.035] px-2 py-0.5 text-[11px] text-white/46">
              Official source
            </span>
          </div>
        </div>
      </div>
    </GamificationEventAnchor>
  );
}
