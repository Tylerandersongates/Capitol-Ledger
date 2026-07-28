import { NextRequest, NextResponse } from "next/server";
import { searchRecordsWithLiveData } from "@/lib/data";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const stateValues = searchParams.getAll("state").filter(Boolean);
  const billPageParam = Number(searchParams.get("page"));
  const billPage = Number.isInteger(billPageParam) && billPageParam > 0 ? billPageParam : 1;
  const { mode, resultCounts, results } = await searchRecordsWithLiveData({
    billPage,
    q: searchParams.get("q") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    type: searchParams.get("type") ?? undefined,
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
