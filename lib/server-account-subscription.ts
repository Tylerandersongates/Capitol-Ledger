import { getAccountSubscription } from "@/lib/account-subscription";
import { getAccountPersistenceUserId, readSubscriptionFromDatabase } from "@/lib/account-database";
import { getCurrentSession } from "@/lib/auth";
import type { AccountSubscriptionSnapshot } from "@/types/capitol";

type AccountSubscriptionUser = {
  email: string;
  id: string;
  name?: string;
};

export async function getSubscriptionForAccountUser(user: AccountSubscriptionUser): Promise<AccountSubscriptionSnapshot> {
  const accountUserId = await getAccountPersistenceUserId(user).catch(() => user.id);
  return (await readSubscriptionFromDatabase(accountUserId).catch(() => null)) ?? getAccountSubscription(accountUserId);
}

export async function getCurrentAccountSubscription(): Promise<AccountSubscriptionSnapshot | null> {
  const session = await getCurrentSession();
  if (!session?.user) return null;

  return getSubscriptionForAccountUser(session.user);
}
