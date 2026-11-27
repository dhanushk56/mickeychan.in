import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { logActivity } from "@/lib/activity-log";
import { findThread } from "@/lib/forums";
import { memberFromCookieStore } from "@/lib/members";
import { limitReached, recordHit } from "@/lib/rate-limit";
import { createReport, reasonLabel } from "@/lib/reports";

export const dynamic = "force-dynamic";

// Five reports an hour per account is enough to flag a bad thread and its
// replies without letting one member flood the queue.
const LIMIT = { max: 5, windowMs: 60 * 60 * 1000 };

export async function POST(request) {
  const member = await memberFromCookieStore(await cookies()).catch(() => null);
  if (!member) {
    return NextResponse.json({ error: "Log in to report a post." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const threadId = String(body?.threadId || "").slice(0, 40);
  const replyId = String(body?.replyId || "").slice(0, 40);

  const thread = await findThread(threadId);
  if (!thread) {
    return NextResponse.json({ error: "That thread is gone." }, { status: 404 });
  }

  const reply = replyId ? thread.replies.find((entry) => entry.id === replyId) : null;
  if (replyId && !reply) {
    return NextResponse.json({ error: "That reply is already gone." }, { status: 404 });
  }

  const author = String((reply || thread).author || "").toLowerCase();
  if (author && author === member.username.toLowerCase()) {
    return NextResponse.json({ error: "You can't report your own post." }, { status: 400 });
  }

  const who = member.username.toLowerCase();
  const gate = await limitReached("reports", who, LIMIT);
  if (gate.limited) {
    return NextResponse.json(
      {
        error: "You've sent a few reports already. The moderators have them.",
      },
      { status: 429, headers: { "Retry-After": String(gate.retryAfter) } }
    );
  }

  const result = await createReport({
    reporter: member.username,
    threadId: thread.id,
    threadTitle: thread.title,
    replyId,
    reason: body?.reason,
    note: body?.note,
  });

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  await recordHit("reports", who, { windowMs: LIMIT.windowMs });

  if (!result.duplicate) {
    await logActivity({
      area: "website",
      action: "report",
      username: member.username,
      detail: `Reported ${replyId ? "a reply" : "the thread"} "${thread.title}" (${reasonLabel(result.report.reason)})`,
      request,
    });
  }

  return NextResponse.json({ ok: true, duplicate: Boolean(result.duplicate) });
}
