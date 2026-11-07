import { NextResponse } from "next/server";
import { kvGet, kvSet } from "@/lib/kv";
import { getSessionFromCookies } from "@/lib/auth";

const SUBMISSIONS_KEY = "submissions:join";

export const dynamic = "force-dynamic";

// Protected — deletes one contact ("join us") message from the inbox.
export async function DELETE(request, { params }) {
  const session = getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const messages = await kvGet(SUBMISSIONS_KEY, []);
  const next = messages.filter((entry) => entry.id !== params.id);
  if (next.length === messages.length) {
    return NextResponse.json({ error: "Message not found." }, { status: 404 });
  }

  await kvSet(SUBMISSIONS_KEY, next);
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
