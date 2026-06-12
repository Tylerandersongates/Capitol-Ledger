import { NextRequest, NextResponse } from "next/server";
import { getAccountProfile, setAccountProfile } from "@/lib/account-profile";
import { getAccountPersistenceUserId, readProfileFromDatabase, writeProfileToDatabase } from "@/lib/account-database";
import { getCurrentSession, requireAuthMessage } from "@/lib/auth";
import { guardMutationRequest } from "@/lib/request-security";
import type { AccountProfileSnapshot } from "@/types/capitol";

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
  const databaseProfile = await readProfileFromDatabase(accountUserId).catch(() => null);

  return NextResponse.json({
    mode: databaseProfile ? "database" : "account",
    profile: databaseProfile ?? getAccountProfile(accountUserId),
    user
  });
}

export async function POST(request: NextRequest) {
  const guard = guardMutationRequest(request, "account-profile");
  if (guard) return guard;

  const user = await readSession();

  if (!user) {
    return NextResponse.json(requireAuthMessage(), { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as Partial<AccountProfileSnapshot>;
  const accountUserId = await getAccountPersistenceUserId(user).catch(() => user.id);
  const databaseProfile = await writeProfileToDatabase(accountUserId, body).catch(() => null);
  const profile = databaseProfile ?? setAccountProfile(accountUserId, body);

  return NextResponse.json({
    mode: databaseProfile ? "database" : "account",
    profile,
    user
  });
}
