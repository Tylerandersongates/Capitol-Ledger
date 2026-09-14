import { NextRequest, NextResponse } from "next/server";
import {
  getAccountGamification,
  getDefaultAccountGamification,
  setAccountGamification,
  type AccountGamificationSnapshot
} from "@/lib/account-gamification";
import { canUseDatabasePersistence, getAccountPersistenceUserId, readGamificationFromDatabase, writeGamificationToDatabase } from "@/lib/account-database";
import { throwAccountPersistenceUnavailable, withAccountPersistenceRoute } from "@/lib/account-persistence-safety";
import { getCurrentSession, requireAuthMessage } from "@/lib/auth";
import { guardMutationRequest } from "@/lib/request-security";

async function readSession() {
  const session = await getCurrentSession();
  return session?.user ?? null;
}

async function getGamification() {
  const user = await readSession();

  if (!user) {
    return NextResponse.json(requireAuthMessage(), { status: 401 });
  }

  const accountUserId = await getAccountPersistenceUserId(user);
  const databaseGamification = await readGamificationFromDatabase(accountUserId);
  const usesDatabase = canUseDatabasePersistence();

  return NextResponse.json({
    mode: usesDatabase ? "database" : "account",
    user,
    gamification: databaseGamification ?? (usesDatabase ? getDefaultAccountGamification() : getAccountGamification(accountUserId))
  });
}

async function updateGamification(request: NextRequest) {
  const guard = guardMutationRequest(request, "account-gamification");
  if (guard) return guard;

  const user = await readSession();

  if (!user) {
    return NextResponse.json(requireAuthMessage(), { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as Partial<AccountGamificationSnapshot>;
  const accountUserId = await getAccountPersistenceUserId(user);
  const usesDatabase = canUseDatabasePersistence();
  const gamification = usesDatabase
    ? await writeGamificationToDatabase(accountUserId, body)
    : setAccountGamification(accountUserId, body);
  if (!gamification) throwAccountPersistenceUnavailable("updateGamification");

  return NextResponse.json({
    mode: usesDatabase ? "database" : "account",
    user,
    gamification
  });
}

export const GET = withAccountPersistenceRoute(getGamification);
export const POST = withAccountPersistenceRoute(updateGamification);
