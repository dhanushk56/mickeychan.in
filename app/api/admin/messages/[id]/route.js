import { NextResponse } from "next/server";
import { authorize } from "@/lib/admin-guard";
import { logActivity } from "@/lib/activity-log";
import { deleteJoinMessage, listJoinMessages } from "@/lib/join-messages";

export const dynamic = "force-dynamic";

export async function DELETE(request, { params }) {
  const { id } = await params;
  const gate = await authorize("messages.delete");
  if (gate.response) return gate.response;

  const messages = await listJoinMessages();
  const target = messages.find((entry) => entry.id === id);
  const next = messages.filter((entry) => entry.id !== id);
  if (next.length === messages.length) {
    return NextResponse.json({ error: "Message not found." }, { status: 404 });
  }

  await deleteJoinMessage(id);

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
