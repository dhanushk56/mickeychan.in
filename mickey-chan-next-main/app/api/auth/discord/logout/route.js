import { NextResponse } from "next/server";
import { clearSessionCookieHeader } from "@/lib/discord-auth";

export async function POST(request) {
  const url = new URL(request.url);
  const response = NextResponse.json({ ok: true });
  response.headers.set("Set-Cookie", clearSessionCookieHeader());
  return response;
}

// Also allow a plain link/GET for convenience, redirecting home after clearing the cookie.
export async function GET(request) {
  const url = new URL(request.url);
  const response = NextResponse.redirect(url.origin);
  response.headers.set("Set-Cookie", clearSessionCookieHeader());
  return response;
}
