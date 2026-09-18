import type { CongressBillTextVersionsResponse } from "@/lib/congress/client";

export type OfficialBillTextVersion = {
  date: string;
  type: string;
  sourceUrl?: string;
  govInfoUrl?: string;
};

export function textVersionIsNewer(versionDate: string, summaryActionDate?: string) {
  return !summaryActionDate || versionDate > summaryActionDate.slice(0, 10);
}

export function isHr7008HousePassedVersion(version: OfficialBillTextVersion, bill: { congress: number; billType: string; billNumber: string }) {
  return bill.congress === 119 && bill.billType.toLowerCase() === "hr" && bill.billNumber === "7008" &&
    version.date === "2026-07-22" && version.type.toLowerCase().includes("engrossed in house");
}

export function selectLatestBillTextVersion(
  versions: CongressBillTextVersionsResponse["textVersions"],
  bill: { congress: number; billType: string; billNumber: string }
): OfficialBillTextVersion | null {
  const latest = [...(versions ?? [])]
    .filter((version) => /^\d{4}-\d{2}-\d{2}/.test(version.date ?? ""))
    .sort((left, right) => (right.date ?? "").localeCompare(left.date ?? ""))[0];
  if (!latest?.date) return null;

  const formattedText = latest.formats?.find((format) => format.type === "Formatted Text" && format.url?.startsWith("https://"));
  const govInfoUrl = formattedText?.url ? deriveGovInfoTextUrl(formattedText.url, bill) : undefined;
  const sourceUrl = govInfoUrl ? formattedText?.url : undefined;

  return {
    date: latest.date.slice(0, 10),
    type: latest.type?.trim() || "Published bill text",
    sourceUrl,
    govInfoUrl
  };
}

export function deriveGovInfoTextUrl(sourceUrl: string, bill: { congress: number; billType: string; billNumber: string }) {
  let url: URL;
  try {
    url = new URL(sourceUrl);
  } catch {
    return undefined;
  }

  if (url.protocol !== "https:" || url.hostname !== "www.congress.gov") return undefined;
  const stem = url.pathname.split("/").at(-1)?.replace(/\.htm$/i, "");
  if (!stem) return undefined;
  const matched = stem.match(/^BILLS-(\d+)(hconres|sconres|hjres|sjres|hres|sres|hr|s)(\d+)([a-z][a-z0-9]*)$/i);
  if (!matched || Number(matched[1]) !== bill.congress || matched[2].toLowerCase() !== bill.billType.toLowerCase() || matched[3] !== bill.billNumber) return undefined;
  return `https://www.govinfo.gov/content/pkg/${stem}/html/${stem}.htm`;
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&(?:nbsp|amp|lt|gt|quot|apos);/g, (entity) => ({
      "&nbsp;": " ", "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'"
    })[entity] ?? entity);
}

export function plainTextFromOfficialHtml(html: string) {
  const pre = html.match(/<pre\b[^>]*>([\s\S]*?)<\/pre>/i)?.[1];
  const content = pre ?? html.replace(/^[\s\S]*?<body\b[^>]*>/i, "").replace(/<\/body>[\s\S]*$/i, "");
  return decodeHtmlEntities(content
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<\/(?:p|div|section|h[1-6]|li)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, ""))
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function fetchOfficialBillText(version: OfficialBillTextVersion): Promise<{ text: string; excerpt: boolean } | null> {
  if (!version.govInfoUrl) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3_500);
  try {
    const response = await fetch(version.govInfoUrl, {
      headers: { Accept: "text/html" },
      cache: "no-store",
      redirect: "error",
      signal: controller.signal
    });
    if (!response.ok || Number(response.headers.get("content-length")) > 1_000_000) return null;
    const html = await response.text();
    if (html.length > 1_000_000) return null;
    const text = plainTextFromOfficialHtml(html);
    if (text.length < 100 || /verify you are human|enable javascript|cloudflare/i.test(text.slice(0, 1_000))) return null;
    return { text: text.slice(0, 120_000), excerpt: text.length > 120_000 };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
