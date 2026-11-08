import { NextResponse } from "next/server";
import { clearSessionCookieHeader, getSessionFromCookies } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";

export async function POST(request) {
  const session = getSessionFromCookies();
  const response = NextResponse.json({ ok: true });
  response.headers.append("Set-Cookie", clearSessionCookieHeader());
  await logActivity({
    area: "admin",
    action: "logout",
    username: session?.user?.username || "Unknown",
    detail: "Locked the admin console",
    request,
  });
  return response;
}

// Plain link/GET for convenience, redirecting home after clearing the cookie.
export async function GET(request) {
  const session = getSessionFromCookies();
  const response = NextResponse.redirect(new URL("/", request.url));
  response.headers.append("Set-Cookie", clearSessionCookieHeader());
  await logActivity({
    area: "admin",
    action: "logout",
    username: session?.user?.username || "Unknown",
    detail: "Locked the admin console",
    request,
  });
  return response;
}
