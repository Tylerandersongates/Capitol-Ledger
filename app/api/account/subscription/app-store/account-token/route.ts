import { NextResponse } from "next/server";
import { getAccountPersistenceUserId } from "@/lib/account-database";
import { getCurrentSession, requireAuthMessage } from "@/lib/auth";
import { createAppStoreAccountToken } from "@/lib/billing/app-store";
import { upsertAppStoreAccountTokenBinding } from "@/lib/billing/app-store-state";
import { withAccountPersistenceRoute } from "@/lib/account-persistence-safety";

async function getAppStoreAccountToken() {
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
