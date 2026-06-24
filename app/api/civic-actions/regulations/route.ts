import { NextResponse } from "next/server";
import { fetchOpenRegulationsGovActions, RegulationsGovApiError } from "@/lib/regulations-gov";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const result = await fetchOpenRegulationsGovActions();

    return NextResponse.json({
      actions: result.actions,
      configured: true,
      generatedAt: new Date().toISOString(),
      source: "Regulations.gov",
      total: result.total
    });
  } catch (error) {
    if (error instanceof RegulationsGovApiError) {
      return NextResponse.json(
        {
          actions: [],
          configured: error.message !== "REGULATIONS_GOV_API_KEY is not configured.",
          error: error.message,
          generatedAt: new Date().toISOString(),
          source: "Regulations.gov",
          total: 0
        },
        { status: error.status === 408 ? 504 : 200 }
      );
    }

    return NextResponse.json(
      {
        actions: [],
        configured: true,
        error: "Regulations.gov is unavailable right now.",
        generatedAt: new Date().toISOString(),
        source: "Regulations.gov",
        total: 0
      },
      { status: 502 }
    );
  }
}
