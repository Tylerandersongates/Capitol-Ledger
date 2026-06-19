import assert from "node:assert/strict";
import { buildAiBillAnalysis } from "../lib/ai-policy-lens";
import type { Bill } from "../types/capitol";

type LensFixture = {
  bill: Partial<Bill>;
  expected: string[];
  forbidden?: string[];
  name: string;
  summaryText?: string;
};

const baseBill: Bill = {
  billNumber: "1",
  billType: "hr",
  committeeName: "House Committee",
  congress: 119,
  displayNumber: "H.R.1",
  id: "fixture-bill",
  introducedDate: "2025-01-03",
  latestActionDate: "2025-01-03",
  latestActionText: "Referred to the House Committee.",
  policyArea: "Government Operations and Politics",
  shortTitle: "Fixture Bill",
  sourceUrl: "https://www.congress.gov/bill/119th-congress/house-bill/1",
  sponsorBioguideId: "A000000",
  summary: "",
  title: "Fixture Bill"
};

const fixtures: LensFixture[] = [
  {
    name: "public waters access is not routed to wildfire copy",
    bill: {
      policyArea: "Public Lands and Natural Resources",
      shortTitle: "MAPWaters Act",
      summary: "Requires agencies to publish geospatial data on public waters, fishing restrictions, and outdoor recreation access."
    },
    expected: ["access to public waters", "recreation areas", "fishing rules"],
    forbidden: ["wildfire risk", "forest projects"]
  },
  {
    name: "forest and wildfire bills keep forest copy",
    bill: {
      policyArea: "Public Lands and Natural Resources",
      shortTitle: "Fix Our Forests Act",
      summary: "Designates firesheds at high risk for wildfires and directs forest management projects."
    },
    expected: ["wildfire risk", "public lands management", "forest jobs"],
    forbidden: ["access to public waters"]
  },
  {
    name: "service-benefit bills keep veteran benefit copy",
    bill: {
      policyArea: "Armed Forces and National Security",
      shortTitle: "Merchant Mariners of World War II Congressional Gold Medal Act",
      summary: "Provides a one-time benefit payment for eligible World War II merchant mariners through the Department of Veterans Affairs."
    },
    expected: ["targeted service benefit", "merchant mariners", "one-time payment"],
    forbidden: ["housing access", "tax and budget choices"]
  },
  {
    name: "health bills keep health copy",
    bill: {
      policyArea: "Health",
      shortTitle: "Health Coverage Access Act",
      summary: "Improves Medicaid, Medicare, patient access, clinics, hospitals, and provider capacity."
    },
    expected: ["health coverage", "care access", "provider capacity"],
    forbidden: ["veterans", "child care"]
  },
  {
    name: "education bills are not treated as child-care bills",
    bill: {
      policyArea: "Education",
      shortTitle: "School Nutrition Choice Act",
      summary: "Supports schools, students, teachers, classrooms, academic programs, and local education choices."
    },
    expected: ["schools", "student costs", "classroom resources"],
    forbidden: ["child care", "household budgets, family care"]
  },
  {
    name: "budget bills beat incidental military or veteran terms",
    bill: {
      policyArea: "Economics and Public Finance",
      shortTitle: "Proposing a balanced budget amendment to the Constitution of the United States.",
      summary: "Requires a balanced budget, limits public debt, and discusses spending including military and veterans programs."
    },
    expected: ["Proposing a balanced budget amendment to the Constitution of the United States matters", "tax and budget choices"],
    forbidden: ["United States. matters", "matters for veterans"]
  },
  {
    name: "housing bills beat protected-class veteran mentions",
    bill: {
      policyArea: "Housing and Community Development",
      shortTitle: "Housing Fairness Act",
      summary: "Addresses housing discrimination involving renters, borrowers, mortgages, community development, veterans, and other protected classes."
    },
    expected: ["housing access", "rent", "mortgages"],
    forbidden: ["matters for veterans", "targeted service benefit"]
  },
  {
    name: "immigration bills beat housing program vocabulary",
    bill: {
      policyArea: "Immigration",
      shortTitle: "Public Program Eligibility Act",
      summary: "Restricts community development and housing grants for aliens, non-U.S. nationals, and people who are not lawfully admitted permanent residents."
    },
    expected: ["immigration status rules", "eligibility for public programs"],
    forbidden: ["housing access", "rent, mortgages"]
  },
  {
    name: "tax bills get fiscal copy instead of generic copy",
    bill: {
      policyArea: "Taxation",
      shortTitle: "Small Business Tax Credit Act",
      summary: "Creates a tax credit, deduction, revenue adjustment, and Ways and Means reporting rule."
    },
    expected: ["tax and budget choices", "tax incentives"],
    forbidden: ["matters if it touches your work"]
  },
  {
    name: "supreme court structure bills do not get public safety copy",
    bill: {
      billType: "hjres",
      displayNumber: "H.J.Res. 1",
      policyArea: "Law",
      shortTitle:
        "Proposing an amendment to the Constitution of the United States to require that the Supreme Court of the United States be composed of nine justices.",
      summary:
        "Constitutional amendment requiring the Supreme Court of the United States to be composed of nine justices.",
      title:
        "Proposing an amendment to the Constitution of the United States to require that the Supreme Court of the United States be composed of nine justices."
    },
    expected: ["structure of the Supreme Court", "nine justices", "separation of powers"],
    forbidden: ["emergency response", "local agencies", "enforcement power"]
  }
];

function makeBill(overrides: Partial<Bill>): Bill {
  return { ...baseBill, ...overrides };
}

function combinedAnalysisText(bill: Bill, summaryText?: string) {
  const analysis = buildAiBillAnalysis(bill, summaryText);
  return [analysis.context, ...analysis.pros, ...analysis.cons].join("\n");
}

for (const fixture of fixtures) {
  const text = combinedAnalysisText(makeBill(fixture.bill), fixture.summaryText).toLowerCase();

  for (const expected of fixture.expected) {
    assert.ok(
      text.includes(expected.toLowerCase()),
      `${fixture.name}: expected lens copy to include "${expected}"`
    );
  }

  for (const forbidden of fixture.forbidden ?? []) {
    assert.ok(
      !text.includes(forbidden.toLowerCase()),
      `${fixture.name}: lens copy should not include "${forbidden}"`
    );
  }
}

console.log(`AI Policy Lens fixture check passed (${fixtures.length} fixtures).`);
