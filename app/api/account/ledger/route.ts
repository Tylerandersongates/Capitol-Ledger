import { NextRequest, NextResponse } from "next/server";
import { getAccountLedger, mergeAccountLedger, normalizeAccountLedger } from "@/lib/account-ledger";
import { canUseDatabasePersistence, getAccountPersistenceUserId, mergeLedgerIntoDatabase, readLedgerFromDatabase } from "@/lib/account-database";
import { throwAccountPersistenceUnavailable, withAccountPersistenceRoute } from "@/lib/account-persistence-safety";
import { getCurrentSession, requireAuthMessage } from "@/lib/auth";
import { guardMutationRequest } from "@/lib/request-security";
import type { AccountLedgerSnapshot } from "@/types/capitol";

async function readSession() {
  const session = await getCurrentSession();
  return session?.user ?? null;
}

async function getLedger() {
  const user = await readSession();

  if (!user) {
    return NextResponse.json(requireAuthMessage(), { status: 401 });
  }

  const accountUserId = await getAccountPersistenceUserId(user);
  const databaseLedger = await readLedgerFromDatabase(accountUserId);
  const usesDatabase = canUseDatabasePersistence();

  return NextResponse.json({
    mode: usesDatabase ? "database" : "account",
    user,
    ledger: databaseLedger ?? (usesDatabase ? normalizeAccountLedger() : getAccountLedger(accountUserId))
  });
}

async function updateLedger(request: NextRequest) {
  const guard = guardMutationRequest(request, "account-ledger");
  if (guard) return guard;

  const user = await readSession();

  if (!user) {
    return NextResponse.json(requireAuthMessage(), { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as Partial<AccountLedgerSnapshot>;
  const accountUserId = await getAccountPersistenceUserId(user);
  const usesDatabase = canUseDatabasePersistence();
  const ledger = usesDatabase
    ? await mergeLedgerIntoDatabase(accountUserId, body)
    : mergeAccountLedger(accountUserId, body);
  if (!ledger) throwAccountPersistenceUnavailable("updateLedger");

  return NextResponse.json({
    mode: usesDatabase ? "database" : "account",
    user,
    ledger
  });
}

export const GET = withAccountPersistenceRoute(getLedger);
export const POST = withAccountPersistenceRoute(updateLedger);
