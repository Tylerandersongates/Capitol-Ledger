import { NextRequest, NextResponse } from "next/server";
import { getAccountSubscription, setAccountSubscription } from "@/lib/account-subscription";
import { ensureAccountUser, readSubscriptionFromDatabase, writeSubscriptionToDatabase } from "@/lib/account-database";
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

  const databaseSubscription = await ensureAccountUser(user)
    .then(() => readSubscriptionFromDatabase(user.id))
    .catch(() => null);

  return NextResponse.json({
    mode: databaseSubscription ? "database" : "account",
    user,
    subscription: databaseSubscription ?? getAccountSubscription(user.id)
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
  const databaseSubscription = await ensureAccountUser(user)
    .then(() => writeSubscriptionToDatabase(user.id, body))
    .catch(() => null);
  const subscription = databaseSubscription ?? setAccountSubscription(user.id, body);

  return NextResponse.json({
    mode: databaseSubscription ? "database" : "account",
    user,
    subscription
  });
}
