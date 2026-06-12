import { NextRequest, NextResponse } from "next/server";
import { getAccountSubscription, setAccountSubscription } from "@/lib/account-subscription";
import { getAccountPersistenceUserId, readSubscriptionFromDatabase, writeSubscriptionToDatabase } from "@/lib/account-database";
import { getCurrentSession, requireAuthMessage } from "@/lib/auth";
import { guardMutationRequest } from "@/lib/request-security";
import type { AccountSubscriptionSnapshot } from "@/types/capitol";

async function readSession() {
  const session = await getCurrentSession();
  return session?.user ?? null;
}

export async function GET() {
  const user = await readSession();

  if (!user) {
    return NextResponse.json(requireAuthMessage(), { status: 401 });
  }

  const accountUserId = await getAccountPersistenceUserId(user).catch(() => user.id);
  const databaseSubscription = await readSubscriptionFromDatabase(accountUserId).catch(() => null);

  return NextResponse.json({
    mode: databaseSubscription ? "database" : "account",
    user,
    subscription: databaseSubscription ?? getAccountSubscription(accountUserId)
  });
}

export async function POST(request: NextRequest) {
  const guard = guardMutationRequest(request, "account-subscription");
  if (guard) return guard;

  const user = await readSession();

  if (!user) {
    return NextResponse.json(requireAuthMessage(), { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as Partial<AccountSubscriptionSnapshot>;
  const accountUserId = await getAccountPersistenceUserId(user).catch(() => user.id);
  const databaseSubscription = await writeSubscriptionToDatabase(accountUserId, body).catch(() => null);
  const subscription = databaseSubscription ?? setAccountSubscription(accountUserId, body);

  return NextResponse.json({
    mode: databaseSubscription ? "database" : "account",
    user,
    subscription
  });
}
