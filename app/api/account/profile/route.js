import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  createMemberToken,
  memberCookieHeader,
  memberFromCookieStore,
  publicProfile,
  updateMemberProfile,
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

export async function PATCH(request) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  }

  const session = await memberFromCookieStore(cookies());
  if (!session) {
    return NextResponse.json({ error: "Log in to change your details." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const result = await updateMemberProfile(session.username, {
    name: body?.name,
    phone: body?.phone,
  });

  if (result.error) {
    return NextResponse.json(
      { error: result.error, code: result.code || null, nextChangeAt: result.nextChangeAt || null },
      { status: result.code === "locked" ? 429 : 400 }
    );
  }

  const response = NextResponse.json(
    { ok: true, profile: publicProfile(result.member) },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
  response.headers.append("Set-Cookie", memberCookieHeader(createMemberToken(result.member)));
  await logActivity({
    area: "website",
    action: "profile-update",
    username: session.username,
    detail: "Updated account details",
    request,
  });

  return response;
}
