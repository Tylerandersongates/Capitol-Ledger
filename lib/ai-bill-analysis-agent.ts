import { z } from "zod";
import { buildAiBillAnalysis, type AiBillAnalysis } from "./ai-policy-lens";
import { publicBrandName } from "./brand";
import type { Bill, BillAction, BillSourceMatch, Vote } from "../types/capitol";

type BillAnalysisSource = {
  id: string;
  label: string;
  text: string;
  url?: string;
};

export type BillAnalysisSourcePacket = {
  bill: {
    displayNumber: string;
    latestActionDate: string;
    latestActionText: string;
    policyArea: string;
    sourceUrl: string;
    title: string;
  };
  sources: BillAnalysisSource[];
};

type ResolveAiBillAnalysisOptions = {
  billActions?: BillAction[];
  billVotes?: Vote[];
  enableLive?: boolean;
  sourceMatches?: BillSourceMatch[];
  summaryText?: string;
};

type CachedAiBillAnalysis = {
  analysis: AiBillAnalysis;
  cachedAt: number;
};

declare global {
  // eslint-disable-next-line no-var
  var __capitolLedgerAiBillAnalysisCache: Map<string, CachedAiBillAnalysis> | undefined;
}

const generatedBillAnalysisSchema = z
  .object({
    confidence: z.enum(["high", "medium", "low"]),
    cons: z.array(z.string().min(24).max(260)).length(3),
    context: z.string().min(80).max(900),
    pros: z.array(z.string().min(24).max(260)).length(3),
    sourceIds: z.array(z.string()).min(1).max(8),
    uncertainty: z.string().min(24).max(320)
  })
  .strict();

const generatedBillAnalysisJsonSchema = {
  additionalProperties: false,
  properties: {
    confidence: {
      enum: ["high", "medium", "low"],
      type: "string"
    },
    cons: {
      items: {
        maxLength: 260,
        minLength: 24,
        type: "string"
      },
      maxItems: 3,
      minItems: 3,
      type: "array"
    },
    context: {
      maxLength: 900,
      minLength: 80,
      type: "string"
    },
    pros: {
      items: {
        maxLength: 260,
        minLength: 24,
        type: "string"
      },
      maxItems: 3,
      minItems: 3,
      type: "array"
    },
    sourceIds: {
      items: {
        type: "string"
      },
      maxItems: 8,
      minItems: 1,
      type: "array"
    },
    uncertainty: {
      maxLength: 320,
      minLength: 24,
      type: "string"
    }
  },
  required: ["context", "pros", "cons", "uncertainty", "confidence", "sourceIds"],
  type: "object"
} as const;

const aiBillAnalysisCache = globalThis.__capitolLedgerAiBillAnalysisCache ?? new Map<string, CachedAiBillAnalysis>();

if (process.env.NODE_ENV !== "production") {
  globalThis.__capitolLedgerAiBillAnalysisCache = aiBillAnalysisCache;
}

function readIntegerEnv(name: string, fallback: number, min: number, max: number) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value < min || value > max) return fallback;
  return value;
}

function resolveAiBillAnalysisProvider() {
  return (process.env.CAPITOL_LEDGER_AI_BILL_ANALYSIS_PROVIDER ?? "fallback").toLowerCase();
}

function resolveAiBillAnalysisModel() {
  return process.env.CAPITOL_LEDGER_AI_BILL_ANALYSIS_MODEL || "gpt-4o-mini";
}

function resolveAiBillAnalysisTimeoutMs() {
  return readIntegerEnv("CAPITOL_LEDGER_AI_BILL_ANALYSIS_TIMEOUT_MS", 4500, 1000, 20000);
}

function resolveAiBillAnalysisCacheMs() {
  return readIntegerEnv("CAPITOL_LEDGER_AI_BILL_ANALYSIS_CACHE_MS", 6 * 60 * 60 * 1000, 0, 7 * 24 * 60 * 60 * 1000);
}

function shouldUseLiveAiBillAnalysis(enableLive = true) {
  return enableLive && resolveAiBillAnalysisProvider() === "openai" && Boolean(process.env.OPENAI_API_KEY);
}

function truncateText(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trim()}...`;
}

function sourceText(value?: string | null) {
  return truncateText(value ?? "", 1300);
}

function uniqueSources(sources: BillAnalysisSource[]) {
  return Array.from(new Map(sources.filter((source) => source.text).map((source) => [source.id, source])).values()).slice(0, 18);
}

export function buildBillAnalysisSourcePacket({
  bill,
  billActions = [],
  billVotes = [],
  sourceMatches = [],
  summaryText
}: Omit<ResolveAiBillAnalysisOptions, "enableLive"> & { bill: Bill }): BillAnalysisSourcePacket {
  const sourceCandidates: BillAnalysisSource[] = [
    {
      id: "bill-record",
      label: "Official bill metadata",
      text: [
        `${bill.displayNumber}: ${bill.title}`,
        `Short title: ${bill.shortTitle}`,
        `Policy area: ${bill.policyArea}`,
        `Latest action on ${bill.latestActionDate}: ${bill.latestActionText}`
      ].join("\n"),
      url: bill.sourceUrl
    },
    {
      id: "official-summary",
      label: "Official or stored bill summary",
      text: sourceText(summaryText || bill.summary),
      url: bill.sourceUrl
    },
    ...billActions.slice(0, 8).map((action, index) => ({
      id: `action-${index + 1}`,
      label: `Official action ${index + 1}`,
      text: sourceText(`${action.date}: ${action.action}`),
      url: action.sourceUrl
    })),
    ...billVotes.slice(0, 4).map((vote, index) => ({
      id: `vote-${index + 1}`,
      label: `Recorded vote ${index + 1}`,
      text: sourceText(`${vote.chamber} roll call ${vote.rollCall}: ${vote.question}. Result: ${vote.result}.`),
      url: vote.sourceUrl
    })),
    ...sourceMatches.slice(0, 5).map((source, index) => ({
      id: `source-${index + 1}`,
      label: source.label,
      text: sourceText(`${source.matchKind}: ${source.reason}`),
      url: source.url
    }))
  ];

  return {
    bill: {
      displayNumber: bill.displayNumber,
      latestActionDate: bill.latestActionDate,
      latestActionText: bill.latestActionText,
      policyArea: bill.policyArea,
      sourceUrl: bill.sourceUrl,
      title: bill.shortTitle || bill.title
    },
    sources: uniqueSources(sourceCandidates)
  };
}

function sourcePacketCacheKey(packet: BillAnalysisSourcePacket) {
  return JSON.stringify({
    bill: packet.bill,
    model: resolveAiBillAnalysisModel(),
    provider: resolveAiBillAnalysisProvider(),
    sourceIds: packet.sources.map((source) => source.id),
    sourceText: packet.sources.map((source) => source.text)
  });
}

function getCachedAnalysis(cacheKey: string) {
  const maxAgeMs = resolveAiBillAnalysisCacheMs();
  if (!maxAgeMs) return null;

  const cached = aiBillAnalysisCache.get(cacheKey);
  if (!cached) return null;

  if (Date.now() - cached.cachedAt > maxAgeMs) {
    aiBillAnalysisCache.delete(cacheKey);
    return null;
  }

  return cached.analysis;
}

function cacheAnalysis(cacheKey: string, analysis: AiBillAnalysis) {
  const maxAgeMs = resolveAiBillAnalysisCacheMs();
  if (!maxAgeMs) return;

  aiBillAnalysisCache.set(cacheKey, {
    analysis,
    cachedAt: Date.now()
  });
}

function extractResponseText(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (typeof record.output_text === "string") return record.output_text;

  const output = Array.isArray(record.output) ? record.output : [];
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = Array.isArray((item as Record<string, unknown>).content) ? ((item as Record<string, unknown>).content as unknown[]) : [];
    for (const contentItem of content) {
      if (!contentItem || typeof contentItem !== "object") continue;
      const text = (contentItem as Record<string, unknown>).text;
      if (typeof text === "string") return text;
    }
  }

  return null;
}

export function validateGeneratedBillAnalysis(value: unknown, sourcePacket: BillAnalysisSourcePacket): AiBillAnalysis | null {
  const parsed = generatedBillAnalysisSchema.safeParse(value);
  if (!parsed.success) return null;

  const allowedSourceIds = new Set(sourcePacket.sources.map((source) => source.id));
  if (!parsed.data.sourceIds.every((sourceId) => allowedSourceIds.has(sourceId))) return null;

  const context = parsed.data.uncertainty ? `${parsed.data.context} ${parsed.data.uncertainty}` : parsed.data.context;

  return {
    cons: parsed.data.cons,
    context,
    pros: parsed.data.pros
  };
}

function buildAgentInstructions() {
  return [
    `You are ${publicBrandName}'s nonpartisan bill analysis agent.`,
    "Use only the supplied official source packet. Do not use outside knowledge.",
    "Explain practical effects in plain English for U.S. residents, but avoid claiming the bill will change anything unless the official action says it is enacted.",
    "If the official record is thin, say the impact is uncertain and procedural.",
    "Write benefits and drawbacks as possibilities, not predictions. Prefer 'could' and 'may'.",
    "Do not invent dollar amounts, affected groups, deadlines, agencies, or legal effects not supported by the sources.",
    "Return exactly the requested JSON shape."
  ].join("\n");
}

async function generateOpenAiBillAnalysis(sourcePacket: BillAnalysisSourcePacket): Promise<AiBillAnalysis | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), resolveAiBillAnalysisTimeoutMs());

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      body: JSON.stringify({
        input: [
          {
            content: [
              {
                text: buildAgentInstructions(),
                type: "input_text"
              }
            ],
            role: "developer"
          },
          {
            content: [
              {
                text: JSON.stringify(sourcePacket, null, 2),
                type: "input_text"
              }
            ],
            role: "user"
          }
        ],
        max_output_tokens: 950,
        model: resolveAiBillAnalysisModel(),
        text: {
          format: {
            name: "capitol_ledger_bill_analysis",
            schema: generatedBillAnalysisJsonSchema,
            strict: true,
            type: "json_schema"
          }
        }
      }),
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      method: "POST",
      signal: controller.signal
    });

    if (!response.ok) return null;

    const json = (await response.json()) as unknown;
    const text = extractResponseText(json);
    if (!text) return null;

    return validateGeneratedBillAnalysis(JSON.parse(text), sourcePacket);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function resolveAiBillAnalysis(bill: Bill, options: ResolveAiBillAnalysisOptions = {}): Promise<AiBillAnalysis> {
  const fallback = buildAiBillAnalysis(bill, options.summaryText);
  const sourcePacket = buildBillAnalysisSourcePacket({ ...options, bill });

  if (!shouldUseLiveAiBillAnalysis(options.enableLive)) return fallback;

  const cacheKey = sourcePacketCacheKey(sourcePacket);
  const cachedAnalysis = getCachedAnalysis(cacheKey);
  if (cachedAnalysis) return cachedAnalysis;

  const generatedAnalysis = await generateOpenAiBillAnalysis(sourcePacket);
  if (!generatedAnalysis) return fallback;

  cacheAnalysis(cacheKey, generatedAnalysis);
  return generatedAnalysis;
}
