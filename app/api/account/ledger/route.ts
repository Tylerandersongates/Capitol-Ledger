import { NextRequest, NextResponse } from "next/server";
import { getAccountLedger, mergeAccountLedger } from "@/lib/account-ledger";
import { getAccountPersistenceUserId, mergeLedgerIntoDatabase, readLedgerFromDatabase } from "@/lib/account-database";
import { getCurrentSession, requireAuthMessage } from "@/lib/auth";
import { guardMutationRequest } from "@/lib/request-security";
import type { AccountLedgerSnapshot } from "@/types/capitol";

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
  const databaseLedger = await readLedgerFromDatabase(accountUserId).catch(() => null);

  return NextResponse.json({
    mode: databaseLedger ? "database" : "account",
    user,
    ledger: databaseLedger ?? getAccountLedger(accountUserId)
  });
}

export async function POST(request: NextRequest) {
  const guard = guardMutationRequest(request, "account-ledger");
  if (guard) return guard;

  const user = await readSession();

  if (!user) {
    return NextResponse.json(requireAuthMessage(), { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as Partial<AccountLedgerSnapshot>;
  const accountUserId = await getAccountPersistenceUserId(user).catch(() => user.id);
  const databaseLedger = await mergeLedgerIntoDatabase(accountUserId, body).catch(() => null);
  const ledger = databaseLedger ?? mergeAccountLedger(accountUserId, body);

  return NextResponse.json({
    mode: databaseLedger ? "database" : "account",
    user,
    ledger
  });
}
