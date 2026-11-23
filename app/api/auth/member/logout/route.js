import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { clearMemberCookieHeader, memberFromCookieStore } from "@/lib/members";
import { logActivity } from "@/lib/activity-log";

export async function POST(request) {
  const member = await memberFromCookieStore(cookies());
  const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
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
