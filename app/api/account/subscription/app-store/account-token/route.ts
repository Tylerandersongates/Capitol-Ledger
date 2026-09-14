import { NextResponse } from "next/server";
import { getAccountPersistenceUserId } from "@/lib/account-database";
import { getCurrentSession, requireAuthMessage } from "@/lib/auth";
import { createAppStoreAccountToken } from "@/lib/billing/app-store";
import { appStoreServerVerificationIsEnabled } from "@/lib/billing/app-store-server";
import { upsertAppStoreAccountTokenBinding } from "@/lib/billing/app-store-state";
import { withAccountPersistenceRoute } from "@/lib/account-persistence-safety";

async function getAppStoreAccountToken() {
  if (!appStoreServerVerificationIsEnabled()) {
    return NextResponse.json(
      {
        code: "APP_STORE_SERVER_VERIFICATION_DISABLED",
        error: "App Store subscription verification is temporarily disabled."
      },
      {
        headers: {
          "Cache-Control": "no-store",
          "Retry-After": "30"
        },
        status: 503
      }
    );
  }

  const session = await getCurrentSession();
  if (!session?.user) {
    return NextResponse.json(requireAuthMessage(), { status: 401 });
  }

  const accountUserId = await getAccountPersistenceUserId(session.user);
  const appAccountToken = createAppStoreAccountToken(accountUserId);
  await upsertAppStoreAccountTokenBinding({
    appAccountToken,
    userId: accountUserId
  });

  return NextResponse.json({
    appAccountToken
  });
}

export const GET = withAccountPersistenceRoute(getAppStoreAccountToken);
