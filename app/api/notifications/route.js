import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { memberFromCookieStore } from "@/lib/members";
import { listNotifications, markNotificationsRead } from "@/lib/notifications";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

async function currentUsername() {
  const session = await memberFromCookieStore(cookies());
  return session ? session.username : null;
}

export async function GET() {
  const username = await currentUsername();
  if (!username) {
    return NextResponse.json({ error: "Log in to see notifications." }, { status: 401, headers: NO_STORE });
  }
  const notifications = await listNotifications(username);
  return NextResponse.json(
    {
      ok: true,
      notifications,
      unread: notifications.filter((entry) => !entry.read).length,
    },
    { headers: NO_STORE }
  );
}

export async function POST(request) {
  const username = await currentUsername();
  if (!username) {
    return NextResponse.json({ error: "Log in to see notifications." }, { status: 401, headers: NO_STORE });
  }

  const body = await request.json().catch(() => ({}));
  const action = String(body?.action || "");
  if (action !== "read" && action !== "read-all") {
    return NextResponse.json({ error: "That action isn't supported." }, { status: 400, headers: NO_STORE });
  }

  await markNotificationsRead(username, action === "read" ? body?.ids : undefined);
  const notifications = await listNotifications(username);
  return NextResponse.json(
    { ok: true, notifications, unread: notifications.filter((entry) => !entry.read).length },
    { headers: NO_STORE }
  );
}
