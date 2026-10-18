import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      code: "BILLING_ENDPOINT_RETIRED",
      error: "This billing endpoint is no longer available."
    },
    { status: 410 }
  );
}
