import { NextRequest, NextResponse } from "next/server";
import { getAccountLedger, mergeAccountLedger } from "@/lib/account-ledger";
import { ensureAccountUser, mergeLedgerIntoDatabase, readLedgerFromDatabase } from "@/lib/account-database";
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

  const databaseLedger = await ensureAccountUser(user)
    .then(() => readLedgerFromDatabase(user.id))
    .catch(() => null);

  return NextResponse.json({
    mode: databaseLedger ? "database" : "account",
    user,
    ledger: databaseLedger ?? getAccountLedger(user.id)
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
  const databaseLedger = await ensureAccountUser(user)
    .then(() => mergeLedgerIntoDatabase(user.id, body))
    .catch(() => null);
  const ledger = databaseLedger ?? mergeAccountLedger(user.id, body);

  return NextResponse.json({
    mode: databaseLedger ? "database" : "account",
    user,
    ledger
  });
}
