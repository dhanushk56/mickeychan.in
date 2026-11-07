import { NextResponse } from "next/server";
import { clearSessionCookieHeader } from "@/lib/auth";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.headers.append("Set-Cookie", clearSessionCookieHeader());
  return response;
}

// Plain link/GET for convenience, redirecting home after clearing the cookie.
export async function GET(request) {
  const response = NextResponse.redirect(new URL("/", request.url));
  response.headers.append("Set-Cookie", clearSessionCookieHeader());
  return response;
}
