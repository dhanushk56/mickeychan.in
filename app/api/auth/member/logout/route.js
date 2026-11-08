import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { clearMemberCookieHeader, memberFromCookieStore } from "@/lib/members";
import { logActivity } from "@/lib/activity-log";

// Plain link so the navbar's "Log out" works without JavaScript.
export async function GET(request) {
  const member = await memberFromCookieStore(cookies());
  const response = NextResponse.redirect(new URL("/", request.url));
  response.headers.append("Set-Cookie", clearMemberCookieHeader());
  await logActivity({
    area: "website",
    action: "logout",
    username: member?.username || "Unknown",
    detail: "Logged out of the site",
    request,
  });
  return response;
}

export async function POST(request) {
  const member = await memberFromCookieStore(cookies());
  const response = NextResponse.json({ ok: true });
  response.headers.append("Set-Cookie", clearMemberCookieHeader());
  await logActivity({
    area: "website",
    action: "logout",
    username: member?.username || "Unknown",
    detail: "Logged out of the site",
    request,
  });
  return response;
}
