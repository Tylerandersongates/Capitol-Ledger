import { NextRequest, NextResponse } from "next/server";
import { CongressApiError, fetchMembers } from "@/lib/congress/client";
import { buildMemberSourceLinks, normalizeCongressMember } from "@/lib/congress/normalizers";

function readPageParams(request: NextRequest) {
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? "20");
  const offset = Number(request.nextUrl.searchParams.get("offset") ?? "0");

  return {
    limit: Number.isInteger(limit) && limit > 0 && limit <= 250 ? limit : 20,
    offset: Number.isInteger(offset) && offset >= 0 ? offset : 0
  };
}

export async function GET(request: NextRequest) {
  try {
    const page = readPageParams(request);
    const data = await fetchMembers(page);

    if (request.nextUrl.searchParams.get("format") === "raw") {
      return NextResponse.json(data);
    }

    const members = (data.members ?? []).map(normalizeCongressMember).filter((member) => member !== null);
    const sourceLinks = members.flatMap(buildMemberSourceLinks);

    return NextResponse.json({
      mode: "live",
      source: "Congress.gov",
      count: members.length,
      pagination: data.pagination ?? null,
      members,
      sourceLinks
    });
  } catch (error) {
    if (error instanceof CongressApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status ?? 500 });
    }
    return NextResponse.json({ error: "Unexpected Congress.gov API error." }, { status: 500 });
  }
}
