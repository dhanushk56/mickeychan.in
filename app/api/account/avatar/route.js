import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  clearMemberAvatar,
  createMemberToken,
  memberCookieHeader,
  memberFromCookieStore,
  publicProfile,
  setMemberAvatar,
} from "@/lib/members";
import { logActivity } from "@/lib/activity-log";

export const dynamic = "force-dynamic";

function sameOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  let originHost;
  try {
    originHost = new URL(origin).host;
  } catch {
    return false;
  }
  const candidates = [request.headers.get("host"), request.headers.get("x-forwarded-host")];
  try {
    candidates.push(new URL(request.url).host);
  } catch {
  }
  return candidates.filter(Boolean).includes(originHost);
}

function finish(member, action, username, request) {
  const response = NextResponse.json(
    { ok: true, profile: publicProfile(member) },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
  response.headers.append("Set-Cookie", memberCookieHeader(createMemberToken(member)));
  logActivity({
    area: "website",
    action,
    username,
    detail: action === "avatar-clear" ? "Removed profile photo" : "Updated profile photo",
    request,
  });
  return response;
}

export async function POST(request) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  }

  const session = await memberFromCookieStore(cookies());
  if (!session) {
    return NextResponse.json({ error: "Log in to change your photo." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const result = await setMemberAvatar(session.username, body?.dataUrl);

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return finish(result.member, "avatar-update", session.username, request);
}

export async function DELETE(request) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  }

  const session = await memberFromCookieStore(cookies());
  if (!session) {
    return NextResponse.json({ error: "Log in to change your photo." }, { status: 401 });
  }

  const result = await clearMemberAvatar(session.username);

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return finish(result.member, "avatar-clear", session.username, request);
}
