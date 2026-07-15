import assert from "node:assert/strict";
import { buildBillAnalysisSourcePacket, resolveAiBillAnalysis, validateGeneratedBillAnalysis } from "../lib/ai-bill-analysis-agent";
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
  },
  {
    name: "foreign military sale disapproval does not get veterans benefit copy",
    bill: {
      billType: "hjres",
      displayNumber: "H.J.Res. 200",
      policyArea: "International Affairs",
      shortTitle: "Providing for congressional disapproval of the proposed foreign military sale to Turkey of certain defense articles and services.",
      summary: "Providing for congressional disapproval of the proposed foreign military sale to Turkey of certain defense articles and services.",
      title: "Providing for congressional disapproval of the proposed foreign military sale to Turkey of certain defense articles and services."
    },
    expected: ["proposed foreign military sale", "congressional oversight", "diplomatic relationships"],
    forbidden: ["veterans and caregivers", "targeted service benefit", "faster access, clearer eligibility"]
  },
  {
    name: "election administration bills do not get immigration program copy",
    bill: {
      policyArea: "Government Operations and Politics",
      shortTitle: "SAVE Act",
      summary: "Requires documentary proof of U.S. citizenship for federal voter registration and directs states to verify voter eligibility."
    },
    expected: ["voter registration rules", "election administration", "eligible voters"],
    forbidden: ["immigration status rules", "housing grants", "mixed-status families"]
  },
  {
    name: "congressional continuity bills get representation copy",
    bill: {
      billType: "hjres",
      displayNumber: "H.J.Res. 199",
      latestActionText: "Referred to the House Committee on the Judiciary.",
      policyArea: "Congress",
      shortTitle:
        "Proposing an amendment to the Constitution of the United States to temporarily fill vacancies in the House of Representatives to further the continuity of Congress.",
      summary:
        "Proposes an amendment to temporarily fill vacancies in the House of Representatives to further the continuity of Congress."
    },
    expected: ["continuity of congress", "representation", "house vacancies"],
    forbidden: ["housing access", "rent", "foreign military sale"]
  },
  {
    name: "post office naming bills stay symbolic",
    bill: {
      policyArea: "Government Operations and Politics",
      shortTitle: "Francis C. Flaherty Post Office Building",
      summary:
        "Designates the facility of the United States Postal Service located at 117 West Lovett Street in Charlotte, Michigan, as the Francis C. Flaherty Post Office Building."
    },
    expected: ["recognition", "naming", "commemoration"],
    forbidden: ["household budgets", "benefits that already affect daily life", "new eligibility"]
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

const generatedFixtureBill = makeBill({
  policyArea: "International Affairs",
  shortTitle: "Foreign Military Sale Review Act",
  summary: "Provides for congressional review of a proposed foreign military sale."
});
const sourcePacket = buildBillAnalysisSourcePacket({
  bill: generatedFixtureBill,
  summaryText: generatedFixtureBill.summary
});
const validGeneratedAnalysis = validateGeneratedBillAnalysis(
  {
    confidence: "medium",
    context:
      "Foreign Military Sale Review Act could affect people indirectly through foreign policy, congressional oversight, defense exports, and the public debate over whether a proposed sale should move forward.",
    pros: [
      "Congressional review could make the decision more transparent before sensitive defense articles or services are transferred abroad.",
      "A public process may help voters see the security, alliance, and human-rights tradeoffs behind the proposed sale.",
      "If lawmakers identify risks early, agencies may have clearer pressure to explain or adjust the sale before it proceeds."
    ],
    cons: [
      "Delays or disapproval could complicate diplomatic relationships with the country requesting the sale.",
      "Defense contractors and workers tied to export orders may face uncertainty if the sale is paused or canceled.",
      "A review resolution may raise concerns without resolving the broader foreign-policy choices behind the proposal."
    ],
    sourceIds: ["bill-record", "official-summary"],
    uncertainty: "The official record is still limited, so the practical impact depends on later votes and implementation decisions."
  },
  sourcePacket
);

assert.ok(validGeneratedAnalysis, "generated agent analysis should validate when it cites known sources");
assert.ok(
  !validateGeneratedBillAnalysis(
    {
      confidence: "medium",
      context:
        "Foreign Military Sale Review Act could affect people indirectly through foreign policy, congressional oversight, defense exports, and the public debate over whether a proposed sale should move forward.",
      pros: [
        "Congressional review could make the decision more transparent before sensitive defense articles or services are transferred abroad.",
        "A public process may help voters see the security, alliance, and human-rights tradeoffs behind the proposed sale.",
        "If lawmakers identify risks early, agencies may have clearer pressure to explain or adjust the sale before it proceeds."
      ],
      cons: [
        "Delays or disapproval could complicate diplomatic relationships with the country requesting the sale.",
        "Defense contractors and workers tied to export orders may face uncertainty if the sale is paused or canceled.",
        "A review resolution may raise concerns without resolving the broader foreign-policy choices behind the proposal."
      ],
      sourceIds: ["unknown-source"],
      uncertainty: "The official record is still limited, so the practical impact depends on later votes and implementation decisions."
    },
    sourcePacket
  ),
  "generated agent analysis should reject unknown source ids"
);

function generatedPayload(sourceIds = ["bill-record"]) {
  return {
    confidence: "medium",
    context:
      "The official record indicates that this fixture bill could affect oversight, agency procedures, and public understanding if later legislative steps move it forward.",
    pros: [
      "A clearer oversight process could make later agency decisions easier for the public and lawmakers to evaluate.",
      "Structured reporting may help affected people understand which procedural steps have happened and which remain pending.",
      "Using cited official sources could reduce the risk that practical effects are described more confidently than the record supports."
    ],
    cons: [
      "Additional review steps could slow decisions without guaranteeing that the underlying policy questions are resolved.",
      "People may still face uncertainty because the current record does not describe final implementation details or deadlines.",
      "A procedural update may create expectations before the bill has completed the votes required to become law."
    ],
    sourceIds,
    uncertainty: "The bill is not enacted, so the practical outcome depends on later votes, amendments, and implementation choices."
  };
}

function successfulOpenAiResponse(sourceIds?: string[]) {
  return new Response(
    JSON.stringify({
      output_text: JSON.stringify(generatedPayload(sourceIds))
    }),
    {
      headers: { "Content-Type": "application/json" },
      status: 200
    }
  );
}

async function checkAgentResilience() {
  const originalFetch = globalThis.fetch;
  const envNames = [
    "CAPITOL_LEDGER_AI_BILL_ANALYSIS_PROVIDER",
    "CAPITOL_LEDGER_AI_BILL_ANALYSIS_CACHE_MS",
    "CAPITOL_LEDGER_AI_BILL_ANALYSIS_TIMEOUT_MS",
    "OPENAI_API_KEY"
  ] as const;
  const originalEnv = new Map(envNames.map((name) => [name, process.env[name]]));

  try {
    let fetchCalls = 0;
    globalThis.fetch = async () => {
      fetchCalls += 1;
      return successfulOpenAiResponse();
    };

    process.env.CAPITOL_LEDGER_AI_BILL_ANALYSIS_PROVIDER = "fallback";
    process.env.OPENAI_API_KEY = "fixture-key";
    const disabledBill = makeBill({ billNumber: "20", displayNumber: "H.R. 20", id: "fixture-disabled-live" });
    const disabledFallback = buildAiBillAnalysis(disabledBill, disabledBill.summary);
    assert.deepEqual(
      await resolveAiBillAnalysis(disabledBill, { enableLive: true, summaryText: disabledBill.summary }),
      disabledFallback,
      "disabled provider should return deterministic fallback"
    );
    assert.equal(fetchCalls, 0, "disabled provider should not call OpenAI");

    process.env.CAPITOL_LEDGER_AI_BILL_ANALYSIS_PROVIDER = "openai";
    delete process.env.OPENAI_API_KEY;
    const missingKeyBill = makeBill({ billNumber: "21", displayNumber: "H.R. 21", id: "fixture-missing-key" });
    assert.deepEqual(
      await resolveAiBillAnalysis(missingKeyBill, { enableLive: true, summaryText: missingKeyBill.summary }),
      buildAiBillAnalysis(missingKeyBill, missingKeyBill.summary),
      "missing OpenAI key should return deterministic fallback"
    );
    assert.equal(fetchCalls, 0, "missing OpenAI key should not call OpenAI");

    process.env.OPENAI_API_KEY = "fixture-key";
    process.env.CAPITOL_LEDGER_AI_BILL_ANALYSIS_CACHE_MS = "60000";
    const cacheBill = makeBill({ billNumber: "22", displayNumber: "H.R. 22", id: "fixture-cache" });
    const firstLive = await resolveAiBillAnalysis(cacheBill, { enableLive: true, summaryText: cacheBill.summary });
    assert.notDeepEqual(firstLive, buildAiBillAnalysis(cacheBill, cacheBill.summary), "valid live output should replace fallback output");
    assert.equal(fetchCalls, 1, "first live analysis should call OpenAI once");
    const cachedLive = await resolveAiBillAnalysis(cacheBill, { enableLive: true, summaryText: cacheBill.summary });
    assert.deepEqual(cachedLive, firstLive, "cached live analysis should match the validated first response");
    assert.equal(fetchCalls, 1, "cached live analysis should not call OpenAI again");

    globalThis.fetch = async () => {
      fetchCalls += 1;
      return successfulOpenAiResponse(["unknown-source"]);
    };
    const invalidSourceBill = makeBill({ billNumber: "23", displayNumber: "H.R. 23", id: "fixture-invalid-source" });
    assert.deepEqual(
      await resolveAiBillAnalysis(invalidSourceBill, { enableLive: true, summaryText: invalidSourceBill.summary }),
      buildAiBillAnalysis(invalidSourceBill, invalidSourceBill.summary),
      "unknown source ids should return deterministic fallback"
    );

    process.env.CAPITOL_LEDGER_AI_BILL_ANALYSIS_TIMEOUT_MS = "1000";
    globalThis.fetch = async (_input, init) =>
      new Promise<Response>((_resolve, reject) => {
        const signal = init?.signal;
        if (signal?.aborted) {
          reject(new Error("aborted"));
          return;
        }
        signal?.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
      });
    const timeoutBill = makeBill({ billNumber: "24", displayNumber: "H.R. 24", id: "fixture-timeout" });
    assert.deepEqual(
      await resolveAiBillAnalysis(timeoutBill, { enableLive: true, summaryText: timeoutBill.summary }),
      buildAiBillAnalysis(timeoutBill, timeoutBill.summary),
      "timed-out OpenAI request should return deterministic fallback"
    );
  } finally {
    globalThis.fetch = originalFetch;
    for (const name of envNames) {
      const value = originalEnv.get(name);
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
}

checkAgentResilience()
  .then(() => {
    console.log(`AI Policy Lens fixture check passed (${fixtures.length} fixtures plus agent validation and resilience guards).`);
  })
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
