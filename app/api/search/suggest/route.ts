import { NextRequest, NextResponse } from "next/server";
import { getSearchSuggestions } from "@/lib/search-suggestions";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const q = searchParams.get("q") ?? "";
  const type = searchParams.get("type") ?? undefined;
  const limitRaw = searchParams.get("limit");
  const limit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;

  const suggestions = await getSearchSuggestions({
    limit: Number.isFinite(limit) ? limit : undefined,
    q,
    type
  });

  return NextResponse.json({
    suggestions
  });
}
