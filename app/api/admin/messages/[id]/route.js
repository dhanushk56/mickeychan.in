import { NextResponse } from "next/server";
import { kvGet, kvSet } from "@/lib/kv";
import { authorize } from "@/lib/admin-guard";
import { logActivity } from "@/lib/activity-log";

const SUBMISSIONS_KEY = "submissions:join";

export const dynamic = "force-dynamic";

export async function DELETE(request, { params }) {
  const gate = await authorize("messages.delete");
  if (gate.response) return gate.response;

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
    username: gate.access.username,
    detail: `Deleted a “join us” message from ${who}`,
    request,
  });

  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
