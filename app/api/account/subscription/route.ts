import { NextRequest, NextResponse } from "next/server";
import { getAccountSubscription, setAccountSubscription } from "@/lib/account-subscription";
import { getAccountPersistenceUserId, readSubscriptionFromDatabase, writeSubscriptionToDatabase } from "@/lib/account-database";
import { getCurrentSession, requireAuthMessage } from "@/lib/auth";
import { getEffectiveSubscriptionForAccountUser } from "@/lib/effective-account-subscription";
import { guardMutationRequest } from "@/lib/request-security";
import type { AccountSubscriptionSnapshot } from "@/types/capitol";

async function readSession() {
  const session = await getCurrentSession();
  return session?.user ?? null;
}

function isClientWritableSubscription(value: Partial<AccountSubscriptionSnapshot>) {
  const plan = value.plan === "pro" || value.plan === "team" ? value.plan : "free";
  const provider = value.provider === "stripe" || value.provider === "revenuecat" || value.provider === "app-store" ? value.provider : "demo";

  return plan === "free" && provider === "demo";
}

export async function GET(request: NextRequest) {
  const user = await readSession();

  if (!user) {
    return NextResponse.json(requireAuthMessage(), { status: 401 });
  }

  const accountUserId = await getAccountPersistenceUserId(user).catch(() => user.id);
  const databaseSubscription = await readSubscriptionFromDatabase(accountUserId).catch(() => null);

  const personalSubscription = databaseSubscription ?? getAccountSubscription(accountUserId);
  const effective = request.nextUrl.searchParams.get("scope") === "effective";
  const subscription = effective ? await getEffectiveSubscriptionForAccountUser(user, personalSubscription).catch(() => personalSubscription) : personalSubscription;

  return NextResponse.json({
    mode: effective ? "effective" : databaseSubscription ? "database" : "account",
    user,
    subscription
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

  if (!isClientWritableSubscription(body)) {
    const databaseSubscription = await readSubscriptionFromDatabase(accountUserId).catch(() => null);
    const subscription = databaseSubscription ?? getAccountSubscription(accountUserId);

    return NextResponse.json(
      {
        error: "Paid subscriptions must be changed through checkout or billing management.",
        mode: databaseSubscription ? "database" : "account",
        user,
        subscription
      },
      { status: 403 }
    );
  }

  const databaseSubscription = await writeSubscriptionToDatabase(accountUserId, body).catch(() => null);
  const subscription = databaseSubscription ?? setAccountSubscription(accountUserId, body);

  return NextResponse.json({
    mode: databaseSubscription ? "database" : "account",
    user,
    subscription
  });
}
