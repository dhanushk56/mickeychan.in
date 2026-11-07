import { NextResponse } from "next/server";
import { clearMemberCookieHeader } from "@/lib/members";

// Plain link so the navbar's "Log out" works without JavaScript.
export async function GET(request) {
  const response = NextResponse.redirect(new URL("/", request.url));
  response.headers.append("Set-Cookie", clearMemberCookieHeader());
  return response;
}

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.headers.append("Set-Cookie", clearMemberCookieHeader());
  return response;
}
