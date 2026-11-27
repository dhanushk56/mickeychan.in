import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { logActivity } from "@/lib/activity-log";
import { kvDel } from "@/lib/kv";
import {
  clearMemberCookieHeader,
  deleteMember,
  memberFromCookieStore,
} from "@/lib/members";
import { deleteProfileSettings } from "@/lib/profile";
import { resolveAdmin } from "@/lib/roles";

export const dynamic = "force-dynamic";

export async function DELETE(request) {
  const session = await memberFromCookieStore(await cookies()).catch(() => null);
  if (!session) {
    return NextResponse.json({ error: "Log in to delete your account." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const typed = String(body?.confirm || "").trim().toLowerCase();
  if (typed !== session.username.toLowerCase()) {
    return NextResponse.json({ error: "Type your username to confirm." }, { status: 400 });
  }

  // A member who can open the console has to be taken off it first, otherwise
  // the admin entry would outlive the account it points at.
  const access = await resolveAdmin(session.username).catch(() => null);
  if (access) {
    return NextResponse.json(
      { error: "Your console access has to be removed before the account can go." },
      { status: 409 }
    );
  }

  const result = await deleteMember(session.username, { keepHandle: true });
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const handle = session.username.toLowerCase();
  await Promise.all([
    deleteProfileSettings(session.username),
    kvDel(`notifications:${session.username}`),
    kvDel(`notifications:${handle}`),
    kvDel(`notifications:${session.username}:read`),
    kvDel(`notifications:${handle}:read`),
  ]);

  await logActivity({
    area: "website",
    action: "account-deleted",
    username: session.username,
    detail: "Deleted their own account",
    request,
  });

  const response = NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
  response.headers.append("Set-Cookie", clearMemberCookieHeader());
  return response;
}
