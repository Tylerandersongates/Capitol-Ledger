import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentSession, requireAuthMessage } from "@/lib/auth";
import {
  confirmOfficialContactForUser,
  readOfficialContactMessagesForUser
} from "@/lib/official-contact-messages";
import { guardMutationRequest } from "@/lib/request-security";

const confirmLetterSchema = z.object({
  id: z.string().trim().min(1)
});

export async function GET() {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json(requireAuthMessage(), { status: 401 });
  }

  const letters = await readOfficialContactMessagesForUser(session.user.id).catch(() => []);

  return NextResponse.json({
    letters,
    user: session.user
  });
}

export async function PATCH(request: NextRequest) {
  const guard = guardMutationRequest(request, "account-letters");
  if (guard) return guard;

  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json(requireAuthMessage(), { status: 401 });
  }

  const parsed = confirmLetterSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Letter id is required." }, { status: 400 });
  }

  const letter = await confirmOfficialContactForUser(parsed.data.id, session.user.id).catch(() => null);
  if (!letter) {
    return NextResponse.json({ error: "Letter not found." }, { status: 404 });
  }

  return NextResponse.json({ letter });
}
