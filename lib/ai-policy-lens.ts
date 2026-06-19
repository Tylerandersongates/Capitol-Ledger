import type { Bill } from "../types/capitol";

export type AiBillAnalysis = {
  cons: string[];
  context: string;
  pros: string[];
};

export function buildAiBillAnalysis(bill: Bill, summaryText?: string): AiBillAnalysis {
  const text = [bill.policyArea, bill.title, bill.shortTitle, bill.summary, summaryText, bill.latestActionText, bill.committeeName]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const statusLine = getPersonalStatusLine(bill);
  const billName = (bill.shortTitle || bill.title).replace(/[.!?]+$/, "");
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
  const isSupremeCourtStructureBill =
    matchesAny(text, [
      "supreme court",
      "nine justices",
      "composed of nine justices",
      "court packing",
      "number of justices",
      "article iii"
    ]) ||
    (matchesAny(text, ["constitution", "constitutional amendment"]) &&
      matchesAny(text, ["supreme court", "justices", "judiciary"]));

  if (matchesAny(text, ["public waters", "waterway", "waterways", "fishing restriction", "fishing restrictions", "public access", "outdoor recreation", "recreation", "outdoor recreational access", "recreational access", "recreation access", "geospatial data"])) {
    return {
      context: `${billName} could affect people through access to public waters, recreation areas, maps, permits, fishing rules, and how clearly agencies publish outdoor access information. ${statusLine}`,
      pros: [
        "People who fish, boat, hike, or guide trips could get clearer public maps and fewer surprises about where access is open or restricted.",
        "Local recreation businesses may benefit if visitors can plan trips with more reliable federal waterway and access data.",
        "Standardized data can help agencies, states, and civic tools point residents to the same public information instead of conflicting maps."
      ],
      cons: [
        "Better data does not automatically create new access if local closures, safety limits, private-property boundaries, or environmental rules still apply.",
        "Communities may see little change if agencies publish information slowly or do not keep maps current.",
        "More visitors can strain fragile waterways or local services if access information improves without matching stewardship."
      ]
    };
  }

  if (matchesAny(text, ["forest", "forests", "wildfire", "wildfires", "fireshed", "firesheds", "forest management", "land management"])) {
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

  if (matchesAny(text, ["tax", "taxes", "taxation", "tax credit", "deduction", "budget", "balanced budget", "appropriation", "spending", "deficit", "debt limit", "public debt", "revenue", "fiscal", "ways and means"])) {
    return {
      context: `${billName} matters because tax and budget choices eventually decide who pays, which services are funded, and what gets delayed. ${statusLine}`,
      pros: [
        "If money is targeted well, your community could see better services or safer investments without having to fight for attention every year.",
        "Clear tax or spending rules can make it easier for taxpayers to see whether funds reach the promised people or places.",
        "A well-designed fiscal plan can reduce uncertainty for families, small businesses, property owners, and local governments."
      ],
      cons: [
        "The cost may come back to households through taxes, fees, reduced services, compliance costs, or future budget pressure.",
        "Tax incentives can miss people who do not have the cash, property, or paperwork needed to use them.",
        "If oversight is weak, money can be spent or forgone without proving that people actually benefited."
      ]
    };
  }

  if (isSupremeCourtStructureBill) {
    return {
      context: `${billName} is about the structure of the Supreme Court. It could affect people through trust in the Court, separation of powers, and how stable federal constitutional rules feel over time. ${statusLine}`,
      pros: [
        "Locking the Court at nine justices could make it harder for either party to expand or shrink the Court for short-term political advantage.",
        "A constitutional rule could give voters, lawyers, and lower courts a clearer expectation about the Court's size across future administrations.",
        "If people see the Court as less vulnerable to partisan restructuring, confidence in major rulings and constitutional rights may be more stable."
      ],
      cons: [
        "A fixed number of justices would not by itself resolve concerns about ethics, lifetime tenure, nomination fights, or ideological balance.",
        "Changing the Constitution is intentionally hard, so the proposal may signal a priority without producing near-term change for households.",
        "Freezing the Court's size could limit future options if caseloads, legitimacy concerns, or democratic pressures lead people to support structural reform."
      ]
    };
  }

  if (matchesAny(text, ["immigration", "immigrant", "immigrants", "alien", "aliens", "non-u.s. national", "non-u.s. nationals", "lawfully admitted", "permanent resident", "permanent residents", "asylum", "refugee", "deportation"])) {
    return {
      context: `${billName} could affect people through immigration status rules, eligibility for public programs, local government funding, housing or work stability, and how agencies verify who qualifies. ${statusLine}`,
      pros: [
        "Supporters may see clearer eligibility rules for public funds, local programs, or services that depend on immigration status.",
        "Local agencies could get firmer guidance on who qualifies, which may reduce confusion when administering benefits or grants.",
        "Taxpayers may get more visibility into whether federal dollars are being used for the population Congress intended."
      ],
      cons: [
        "Mixed-status families and local service providers may face more paperwork, uncertainty, or fear of using programs they rely on.",
        "Restricting grants can affect broader community services if housing, economic development, or local aid programs lose funding.",
        "Eligibility checks can create mistakes or delays for people who are lawfully present but have complex documentation."
      ]
    };
  }

  if (matchesAny(text, ["housing", "rent", "renter", "renters", "homebuyer", "homebuyers", "mortgage", "borrower", "borrowers", "homeless", "zoning", "community development", "fair lending", "labor", "worker", "workers", "wage", "employment"])) {
    return {
      context: `${billName} could affect everyday stability through housing access, rent, mortgages, jobs, wages, workplace rules, or the cost of staying in your community. ${statusLine}`,
      pros: [
        "If the bill reaches people directly, it could ease pressure on housing, paychecks, benefits, or the ability to keep steady work.",
        "Better standards can help renters, borrowers, workers, or local agencies understand what rules apply and where to go when they are ignored.",
        "Local programs may become easier to compare if the bill requires clearer reporting on outcomes."
      ],
      cons: [
        "Costs may be passed along through prices, rents, hiring decisions, mortgage terms, or reduced local services if the bill is not funded carefully.",
        "People most affected may still miss out if eligibility rules are complicated or enforcement is weak.",
        "A bill can sound protective but still leave gaps for part-time workers, contractors, renters, borrowers, or people between systems."
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

  if (matchesAny(text, ["education", "school", "student", "teacher", "college", "learning", "classroom", "academic", "per-pupil"])) {
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

  if (matchesAny(text, ["childcare", "child care", "family care", "families with children", "caregiver", "caregivers"])) {
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
