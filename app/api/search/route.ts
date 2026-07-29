import { NextRequest, NextResponse } from "next/server";
import { searchRecordsWithLiveData } from "@/lib/data";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const stateValues = searchParams.getAll("state").filter(Boolean);
  const pageParam = Number(searchParams.get("page"));
  const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;
  const type = searchParams.get("type") ?? undefined;
  const { mode, resultCounts, results } = await searchRecordsWithLiveData({
    billPage: type === "votes" ? 1 : page,
    q: searchParams.get("q") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    type,
    votePage: type === "votes" ? page : 1,
    chamber: searchParams.get("chamber") ?? undefined,
    party: searchParams.get("party") ?? undefined,
    state: stateValues.length ? stateValues : undefined
  });

  return NextResponse.json({
    mode,
    resultCounts,
    results
  });
}
