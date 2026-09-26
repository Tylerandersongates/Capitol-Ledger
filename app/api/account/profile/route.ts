import { NextRequest, NextResponse } from "next/server";
import { getAccountProfile, getDefaultAccountProfile, setAccountProfile } from "@/lib/account-profile";
import { canUseDatabasePersistence, getAccountPersistenceUserId, readProfileFromDatabase, writeProfileToDatabase } from "@/lib/account-database";
import { throwAccountPersistenceUnavailable, withAccountPersistenceRoute } from "@/lib/account-persistence-safety";
import { getCurrentSession, requireAuthMessage } from "@/lib/auth";
import { guardMutationRequest } from "@/lib/request-security";
import type { AccountProfileSnapshot } from "@/types/capitol";

async function readSession() {
  const session = await getCurrentSession();
  return session?.user ?? null;
}

async function getProfile() {
  const user = await readSession();

  if (!user) {
    return NextResponse.json(requireAuthMessage(), { status: 401 });
  }

  const accountUserId = await getAccountPersistenceUserId(user);
  const databaseProfile = await readProfileFromDatabase(accountUserId);
  const usesDatabase = canUseDatabasePersistence();

  return NextResponse.json({
    mode: usesDatabase ? "database" : "account",
    profile: databaseProfile ?? (usesDatabase ? getDefaultAccountProfile() : getAccountProfile(accountUserId)),
    user
  });
}

async function updateProfile(request: NextRequest) {
  const guard = await guardMutationRequest(request, "account-profile");
  if (guard) return guard;

  const user = await readSession();

  if (!user) {
    return NextResponse.json(requireAuthMessage(), { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as Partial<AccountProfileSnapshot>;
  const accountUserId = await getAccountPersistenceUserId(user);
  const usesDatabase = canUseDatabasePersistence();
  const profile = usesDatabase
    ? await writeProfileToDatabase(accountUserId, body)
    : setAccountProfile(accountUserId, body);
  if (!profile) throwAccountPersistenceUnavailable("updateProfile");

  return NextResponse.json({
    mode: usesDatabase ? "database" : "account",
    profile,
    user
  });
}

export const GET = withAccountPersistenceRoute(getProfile);
export const POST = withAccountPersistenceRoute(updateProfile);
