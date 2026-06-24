import { NextRequest, NextResponse } from "next/server";
import { searchRecordsWithLiveData } from "@/lib/data";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const stateValues = searchParams.getAll("state").filter(Boolean);
  const { mode, results } = await searchRecordsWithLiveData({
    q: searchParams.get("q") ?? undefined,
    type: searchParams.get("type") ?? undefined,
    chamber: searchParams.get("chamber") ?? undefined,
    party: searchParams.get("party") ?? undefined,
    state: stateValues.length ? stateValues : undefined
  });

  return NextResponse.json({
    mode,
    results
  });
}
