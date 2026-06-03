import { NextRequest, NextResponse } from "next/server";
import { CongressApiError, fetchCommittees } from "@/lib/congress/client";
import { buildCommitteeSourceLinks, normalizeCongressCommittee } from "@/lib/congress/normalizers";

function readPageParams(request: NextRequest) {
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? "20");
  const offset = Number(request.nextUrl.searchParams.get("offset") ?? "0");

  return {
    limit: Number.isInteger(limit) && limit > 0 && limit <= 250 ? limit : 20,
    offset: Number.isInteger(offset) && offset >= 0 ? offset : 0
  };
}

function readChamber(request: NextRequest) {
  const chamber = request.nextUrl.searchParams.get("chamber")?.toLowerCase();
  if (chamber === "house" || chamber === "senate") return chamber;
  return undefined;
}

export async function GET(request: NextRequest) {
  try {
    const data = await fetchCommittees(readChamber(request), readPageParams(request));

    if (request.nextUrl.searchParams.get("format") === "raw") {
      return NextResponse.json(data);
    }

    const committees = (data.committees ?? []).map(normalizeCongressCommittee).filter((committee) => committee !== null);
    const sourceLinks = committees.flatMap(buildCommitteeSourceLinks);

    return NextResponse.json({
      mode: "live",
      source: "Congress.gov",
      count: committees.length,
      pagination: data.pagination ?? null,
      committees,
      sourceLinks
    });
  } catch (error) {
    if (error instanceof CongressApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status ?? 500 });
    }
    return NextResponse.json({ error: "Unexpected Congress.gov API error." }, { status: 500 });
  }
}
