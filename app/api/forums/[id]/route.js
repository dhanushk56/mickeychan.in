import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { authorize } from "@/lib/admin-guard";
import { logActivity } from "@/lib/activity-log";
import {
  addReply,
  removeReply,
  removeThread,
  setThreadFlags,
} from "@/lib/forums";
import { memberFromCookieStore } from "@/lib/members";
import { can, resolveAdmin } from "@/lib/roles";
import { getSessionFromCookies } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function viewer() {
  return memberFromCookieStore(await cookies()).catch(() => null);
}

async function moderator() {
  const session = await getSessionFromCookies();
  const access = session ? await resolveAdmin(session.user.username) : null;
  return Boolean(access && can(access, "forums.moderate"));
}

export async function POST(request, { params }) {
  const { id } = await params;
  const member = await viewer();
  if (!member) {
    return NextResponse.json({ error: "Log in to reply." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const result = await addReply({ threadId: id, member, body: body?.body });
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status || 400 });
  }

  await logActivity({
    area: "website",
    action: "forum",
    username: member.username,
    detail: `Replied in "${result.thread.title}"`,
  });
  return NextResponse.json({ reply: result.reply });
}

export async function PATCH(request, { params }) {
  const { id } = await params;
  const gate = await authorize("forums.moderate");
  if (gate.response) return gate.response;

  const body = await request.json().catch(() => ({}));
  const result = await setThreadFlags({
    threadId: id,
    admin: true,
    pinned: body?.pinned,
    locked: body?.locked,
  });
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status || 400 });
  }
  return NextResponse.json({ thread: result.thread });
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const replyId = new URL(request.url).searchParams.get("reply") || "";
  const member = await viewer();
  const admin = await moderator();

  const result = replyId
    ? await removeReply({ threadId: id, replyId, member, admin })
    : await removeThread({ threadId: id, member, admin });

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status || 400 });
  }

  if (member) {
    await logActivity({
      area: "website",
      action: "forum",
      username: member.username,
      detail: replyId ? "Removed a reply" : "Removed a thread",
    });
  }
  return NextResponse.json({ ok: true });
}
