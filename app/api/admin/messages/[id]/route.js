import { NextResponse } from "next/server";
import { kvGet, kvSet } from "@/lib/kv";
import { getSessionFromCookies } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";

const SUBMISSIONS_KEY = "submissions:join";

export const dynamic = "force-dynamic";

export async function DELETE(request, { params }) {
  const session = getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const messages = await kvGet(SUBMISSIONS_KEY, []);
  const target = messages.find((entry) => entry.id === params.id);
  const next = messages.filter((entry) => entry.id !== params.id);
  if (next.length === messages.length) {
    return NextResponse.json({ error: "Message not found." }, { status: 404 });
  }

  await kvSet(SUBMISSIONS_KEY, next);

  const who = target?.memberUsername ? `@${target.memberUsername}` : target?.name || "someone";
  await logActivity({
    area: "admin",
    action: "message-deleted",
    username: session.user.username,
    detail: `Deleted a “join us” message from ${who}`,
    request,
  });

  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
