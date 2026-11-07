import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { discordAuthorizeUrl, stateCookieName, redirectCookieName, shortLivedCookieHeader } from "@/lib/discord-auth";

// Visit /api/auth/discord/login?next=/admin or /api/auth/discord/login?next=/form-builder
export async function GET(request) {
  const url = new URL(request.url);
  const next = url.searchParams.get("next") || "/admin";
  const redirectUri = `${url.origin}/api/auth/discord/callback`;
  const state = crypto.randomBytes(16).toString("hex");

  const response = NextResponse.redirect(discordAuthorizeUrl({ redirectUri, state }));
  response.headers.append("Set-Cookie", shortLivedCookieHeader(stateCookieName(), state));
  response.headers.append("Set-Cookie", shortLivedCookieHeader(redirectCookieName(), encodeURIComponent(next)));
  return response;
}
