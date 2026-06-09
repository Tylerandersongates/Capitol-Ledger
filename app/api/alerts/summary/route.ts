import { NextResponse } from "next/server";
import { getActiveAlertSummary } from "@/lib/alert-summary";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await getActiveAlertSummary());
  } catch {
    return NextResponse.json({ activeAlertCount: 0, activeAlertIds: [] });
  }
}
