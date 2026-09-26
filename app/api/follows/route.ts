import { NextRequest, NextResponse } from "next/server";
import { getAccountLedger, normalizeAccountLedger, toggleAccountFollow } from "@/lib/account-ledger";
import { canUseDatabasePersistence, getAccountPersistenceUserId, readLedgerFromDatabase, toggleFollowInDatabase } from "@/lib/account-database";
import { throwAccountPersistenceUnavailable, withAccountPersistenceRoute } from "@/lib/account-persistence-safety";
import { getCurrentSession, requireAuthMessage } from "@/lib/auth";
import { guardMutationRequest } from "@/lib/request-security";
import type { FollowTargetType } from "@/types/capitol";

async function getFollows() {
  const session = await getCurrentSession();

  if (session) {
    const accountUserId = await getAccountPersistenceUserId(session.user);
    const databaseLedger = await readLedgerFromDatabase(accountUserId);
    const usesDatabase = canUseDatabasePersistence();

    return NextResponse.json({
      mode: usesDatabase ? "database" : "account",
      follows: (databaseLedger ?? (usesDatabase ? normalizeAccountLedger() : getAccountLedger(accountUserId))).follows
    });
  }

  return NextResponse.json({
    mode: "anonymous",
    follows: [],
    note: "Sign in or create an account to sync followed records."
  });
}

async function updateFollow(request: NextRequest) {
  const guard = await guardMutationRequest(request, "account-follows");
  if (guard) return guard;

  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json(requireAuthMessage(), { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    targetId?: string;
    targetType?: FollowTargetType;
    saved?: boolean;
  };

  if ((body.targetType !== "member" && body.targetType !== "bill") || !body.targetId) {
    return NextResponse.json({ error: "Invalid follow target." }, { status: 400 });
  }

  const accountUserId = await getAccountPersistenceUserId(session.user);
  const usesDatabase = canUseDatabasePersistence();
  const ledger = usesDatabase
    ? await toggleFollowInDatabase(accountUserId, body.targetType as FollowTargetType, body.targetId as string, body.saved)
    : toggleAccountFollow(accountUserId, body.targetType, body.targetId, body.saved);
  if (!ledger) throwAccountPersistenceUnavailable("updateFollow");

  return NextResponse.json({
    mode: usesDatabase ? "database" : "account",
    follows: ledger.follows
  });
}

export const GET = withAccountPersistenceRoute(getFollows);
export const POST = withAccountPersistenceRoute(updateFollow);
