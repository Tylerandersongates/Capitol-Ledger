import { NextResponse } from "next/server";
import { getAccountPersistenceUserId } from "@/lib/account-database";
import { getCurrentSession, requireAuthMessage } from "@/lib/auth";
import { createAppStoreAccountToken } from "@/lib/billing/app-store";

export async function GET() {
  const session = await getCurrentSession();
  if (!session?.user) {
    return NextResponse.json(requireAuthMessage(), { status: 401 });
  }

  const accountUserId = await getAccountPersistenceUserId(session.user).catch(() => session.user.id);

  return NextResponse.json({
    appAccountToken: createAppStoreAccountToken(accountUserId)
  });
}
