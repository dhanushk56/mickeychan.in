import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { addToBlacklist, readBlacklist, removeFromBlacklist } from "@/lib/blacklist";
import { findMember } from "@/lib/members";
import { logActivity } from "@/lib/activity-log";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!getSessionFromCookies()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(
    { entries: await readBlacklist() },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}

export async function POST(request) {
  const session = getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const username = typeof body.username === "string" ? body.username.trim() : "";
  if (!username) {
    return NextResponse.json({ error: "Pick an account first." }, { status: 400 });
  }

  const member = await findMember(username);
  if (!member) {
    return NextResponse.json({ error: "No account with that username." }, { status: 404 });
  }

  const result = await addToBlacklist({
    username: member.username,
    reason: body.reason,
    addedBy: session.user.username,
  });
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  await logActivity({
    area: "admin",
    action: "blacklist-add",
    username: session.user.username,
    detail: `Blocked @${member.username} from submitting forms`,
    request,
  });

  return NextResponse.json(
    { ok: true, entry: result.entry },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function DELETE(request) {
  const session = getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username") || "";

  const result = await removeFromBlacklist(username);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  await logActivity({
    area: "admin",
    action: "blacklist-remove",
    username: session.user.username,
    detail: `Allowed @${username} to submit forms again`,
    request,
  });

  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
