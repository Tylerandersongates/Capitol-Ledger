import { NextRequest, NextResponse } from "next/server";
import { getAccountLedger, toggleAccountFollow } from "@/lib/account-ledger";
import { getAccountPersistenceUserId, readLedgerFromDatabase, toggleFollowInDatabase } from "@/lib/account-database";
import { getCurrentSession, requireAuthMessage } from "@/lib/auth";
import { guardMutationRequest } from "@/lib/request-security";
import type { FollowTargetType } from "@/types/capitol";

export async function GET() {
  const session = await getCurrentSession();

  if (session) {
    const accountUserId = await getAccountPersistenceUserId(session.user).catch(() => session.user.id);
    const databaseLedger = await readLedgerFromDatabase(accountUserId).catch(() => null);

    return NextResponse.json({
      mode: databaseLedger ? "database" : "account",
      follows: (databaseLedger ?? getAccountLedger(accountUserId)).follows
    });
  }

  return NextResponse.json({
    mode: "demo",
    follows: [],
    note: "Browser-based follows are used until a demo account session is started."
  });
}

export async function POST(request: NextRequest) {
  const guard = guardMutationRequest(request, "account-follows");
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

  const accountUserId = await getAccountPersistenceUserId(session.user).catch(() => session.user.id);
  const databaseLedger = await toggleFollowInDatabase(accountUserId, body.targetType as FollowTargetType, body.targetId as string, body.saved).catch(() => null);
  const ledger = databaseLedger ?? toggleAccountFollow(accountUserId, body.targetType, body.targetId, body.saved);

  return NextResponse.json({
    mode: databaseLedger ? "database" : "account",
    follows: ledger.follows
  });
}
