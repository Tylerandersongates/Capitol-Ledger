import { z } from "zod";

const REGULATIONS_GOV_BASE_URL = "https://api.regulations.gov/v4";
const REGULATIONS_GOV_SITE_URL = "https://www.regulations.gov";
const DEFAULT_ACTION_LIMIT = 5;
const DEFAULT_FETCH_PAGE_SIZE = 25;
const DEFAULT_TIMEOUT_MS = 8_000;

const RegulationsGovDocumentSchema = z.object({
  id: z.string(),
  attributes: z.object({
    agencyId: z.string().nullable().optional(),
    allowLateComments: z.boolean().nullable().optional(),
    commentEndDate: z.string().nullable().optional(),
    commentStartDate: z.string().nullable().optional(),
    docketId: z.string().nullable().optional(),
    documentType: z.string().nullable().optional(),
    frDocNum: z.string().nullable().optional(),
    openForComment: z.boolean().nullable().optional(),
    postedDate: z.string().nullable().optional(),
    subtype: z.string().nullable().optional(),
    title: z.string().nullable().optional(),
    withinCommentPeriod: z.boolean().nullable().optional(),
    withdrawn: z.boolean().nullable().optional()
  })
});

const RegulationsGovDocumentsResponseSchema = z.object({
  data: z.array(RegulationsGovDocumentSchema).optional(),
  meta: z
    .object({
      totalElements: z.number().optional()
    })
    .passthrough()
    .optional()
});

type RegulationsGovDocument = z.infer<typeof RegulationsGovDocumentSchema>;

export type RegulationsGovAction = {
  agencyId: string;
  commentEndDate?: string;
  commentLabel: string;
  commentUrl: string;
  documentId: string;
  documentType: string;
  docketId?: string;
  frDocNum?: string;
  id: string;
  postedDate?: string;
  sourceLabel: string;
  sourceUrl: string;
  subtype?: string;
  title: string;
};

export class RegulationsGovApiError extends Error {
  constructor(
    message: string,
    public status?: number
  ) {
    super(message);
    this.name = "RegulationsGovApiError";
  }
}

function getRegulationsGovApiKey() {
  const key = process.env.REGULATIONS_GOV_API_KEY?.trim();
  if (!key || key === "replace_me") {
    throw new RegulationsGovApiError("REGULATIONS_GOV_API_KEY is not configured.");
  }
  return key;
}

function formatDateLabel(value?: string | null) {
  if (!value) return "Open now";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Open now";

  return `Comments due ${new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    timeZone: "America/New_York",
    year: "numeric"
  }).format(date)}`;
}

function hasStarted(value?: string | null) {
  if (!value) return true;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return true;

  return date.getTime() <= Date.now();
}

function hasFutureDeadline(value?: string | null) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  return date.getTime() > Date.now();
}

function normalizeDocument(document: RegulationsGovDocument): RegulationsGovAction | null {
  const attributes = document.attributes;
  const title = attributes.title?.trim();
  const docketId = attributes.docketId?.trim();

  if (
    !title ||
    !docketId ||
    attributes.withdrawn ||
    !attributes.openForComment ||
    !attributes.withinCommentPeriod ||
    !hasStarted(attributes.commentStartDate) ||
    !hasFutureDeadline(attributes.commentEndDate)
  ) {
    return null;
  }

  const agencyId = attributes.agencyId?.trim() || "Agency";
  const documentType = attributes.documentType?.trim() || "Document";
  const sourceLabel = [agencyId, documentType].filter(Boolean).join(" • ");

  return {
    agencyId,
    commentEndDate: attributes.commentEndDate ?? undefined,
    commentLabel: formatDateLabel(attributes.commentEndDate),
    commentUrl: `${REGULATIONS_GOV_SITE_URL}/commenton/${encodeURIComponent(document.id)}`,
    documentId: document.id,
    documentType,
    docketId,
    frDocNum: attributes.frDocNum ?? undefined,
    id: `regulations:${document.id}`,
    postedDate: attributes.postedDate ?? undefined,
    sourceLabel,
    sourceUrl: `${REGULATIONS_GOV_SITE_URL}/document/${encodeURIComponent(document.id)}`,
    subtype: attributes.subtype ?? undefined,
    title
  };
}

function dedupeActionsByDocket(actions: RegulationsGovAction[]) {
  const seen = new Set<string>();

  return actions.filter((action) => {
    const key = `${action.docketId ?? action.documentId}:${action.title.toLowerCase()}`;
    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
}

export async function fetchOpenRegulationsGovActions({
  limit = DEFAULT_ACTION_LIMIT,
  timeoutMs = DEFAULT_TIMEOUT_MS
}: {
  limit?: number;
  timeoutMs?: number;
} = {}) {
  const url = new URL(`${REGULATIONS_GOV_BASE_URL}/documents`);
  url.searchParams.set("filter[withinCommentPeriod]", "true");
  url.searchParams.set("page[size]", String(DEFAULT_FETCH_PAGE_SIZE));
  url.searchParams.set("sort", "-postedDate");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;

  try {
    response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "X-Api-Key": getRegulationsGovApiKey()
      },
      next: { revalidate: 900 },
      signal: controller.signal
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new RegulationsGovApiError("Regulations.gov request timed out.", 408);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new RegulationsGovApiError("Regulations.gov request failed.", response.status);
  }

  const json = RegulationsGovDocumentsResponseSchema.parse(await response.json());
  const actions = (json.data ?? [])
    .map(normalizeDocument)
    .filter((action): action is RegulationsGovAction => Boolean(action));
  const dedupedActions = dedupeActionsByDocket(actions)
    .slice(0, Math.max(1, Math.min(DEFAULT_FETCH_PAGE_SIZE, limit)));

  return {
    actions: dedupedActions,
    total: json.meta?.totalElements ?? actions.length
  };
}
