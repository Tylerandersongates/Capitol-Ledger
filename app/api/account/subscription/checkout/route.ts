import { NextResponse } from "next/server";

const retiredCheckoutCode = "APP_STORE_ONLY_CHECKOUT_RETIRED";

export async function POST() {
  return NextResponse.json(
    {
      code: retiredCheckoutCode,
      error: "Web checkout is no longer available. Use the CapitolWonk iOS app to purchase or manage an App Store subscription."
    },
    { status: 410 }
  );
}
