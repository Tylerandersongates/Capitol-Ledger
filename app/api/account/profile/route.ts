import { NextRequest, NextResponse } from "next/server";
import { getAccountProfile, setAccountProfile } from "@/lib/account-profile";
import { ensureAccountUser, readProfileFromDatabase, writeProfileToDatabase } from "@/lib/account-database";
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

  const databaseProfile = await ensureAccountUser(user)
    .then(() => readProfileFromDatabase(user.id))
    .catch(() => null);

  return NextResponse.json({
    mode: databaseProfile ? "database" : "account",
    profile: databaseProfile ?? getAccountProfile(user.id),
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
  const databaseProfile = await ensureAccountUser(user)
    .then(() => writeProfileToDatabase(user.id, body))
    .catch(() => null);
  const profile = databaseProfile ?? setAccountProfile(user.id, body);

  return NextResponse.json({
    mode: databaseProfile ? "database" : "account",
    profile,
    user
  });
}
