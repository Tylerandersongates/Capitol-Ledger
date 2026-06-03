import { NextRequest, NextResponse } from "next/server";
import { CongressApiError, fetchBills } from "@/lib/congress/client";
import { buildBillSourceLinks, normalizeCongressBill } from "@/lib/congress/normalizers";

function readPageParams(request: NextRequest) {
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? "20");
  const offset = Number(request.nextUrl.searchParams.get("offset") ?? "0");

  return {
    limit: Number.isInteger(limit) && limit > 0 && limit <= 250 ? limit : 20,
    offset: Number.isInteger(offset) && offset >= 0 ? offset : 0
  };
}

export async function GET(request: NextRequest) {
  const congress = Number(request.nextUrl.searchParams.get("congress") ?? "119");

  if (!Number.isInteger(congress) || congress < 1) {
    return NextResponse.json({ error: "Invalid congress parameter." }, { status: 400 });
  }

  try {
    const data = await fetchBills(congress, readPageParams(request));

    if (request.nextUrl.searchParams.get("format") === "raw") {
      return NextResponse.json(data);
    }

    const bills = (data.bills ?? []).map(normalizeCongressBill).filter((bill) => bill !== null);
    const sourceLinks = bills.flatMap((bill) => buildBillSourceLinks(bill, data.bills?.find((raw) => raw.congress === bill.congress && raw.type?.toUpperCase() === bill.billType && raw.number === bill.billNumber)));

    return NextResponse.json({
      mode: "live",
      source: "Congress.gov",
      congress,
      count: bills.length,
      pagination: data.pagination ?? null,
      bills,
      sourceLinks
    });
  } catch (error) {
    if (error instanceof CongressApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status ?? 500 });
    }
    return NextResponse.json({ error: "Unexpected Congress.gov API error." }, { status: 500 });
  }
}
