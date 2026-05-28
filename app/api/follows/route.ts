import { NextRequest, NextResponse } from "next/server";
import { getAccountLedger, toggleAccountFollow } from "@/lib/account-ledger";
import { ensureAccountUser, readLedgerFromDatabase, toggleFollowInDatabase } from "@/lib/account-database";
import { getCurrentSession, requireAuthMessage } from "@/lib/auth";
import { guardMutationRequest } from "@/lib/request-security";
import type { FollowTargetType } from "@/types/capitol";

export async function GET() {
  const session = await getCurrentSession();

  if (session) {
    const databaseLedger = await ensureAccountUser(session.user)
      .then(() => readLedgerFromDatabase(session.user.id))
      .catch(() => null);

    return NextResponse.json({
      mode: databaseLedger ? "database" : "account",
      follows: (databaseLedger ?? getAccountLedger(session.user.id)).follows
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

  const databaseLedger = await ensureAccountUser(session.user)
    .then(() => toggleFollowInDatabase(session.user.id, body.targetType as FollowTargetType, body.targetId as string, body.saved))
    .catch(() => null);
  const ledger = databaseLedger ?? toggleAccountFollow(session.user.id, body.targetType, body.targetId, body.saved);

  return NextResponse.json({
    mode: databaseLedger ? "database" : "account",
    follows: ledger.follows
  });
}
