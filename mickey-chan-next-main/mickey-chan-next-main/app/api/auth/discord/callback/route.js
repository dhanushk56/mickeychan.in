import { NextResponse } from "next/server";
import {
  exchangeDiscordCode,
  createSessionToken,
  sessionCookieHeader,
  stateCookieName,
  redirectCookieName,
  clearCookieHeader,
  isAllowedDiscordId,
} from "@/lib/discord-auth";

export async function GET(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");
  const cookieHeader = request.headers.get("cookie") || "";
  const savedState = cookieHeader.match(new RegExp(`${stateCookieName()}=([^;]+)`))?.[1];
  const savedRedirect = cookieHeader.match(new RegExp(`${redirectCookieName()}=([^;]+)`))?.[1];
  const next = savedRedirect ? decodeURIComponent(savedRedirect) : "/admin";

  if (!code || !returnedState || !savedState || returnedState !== savedState) {
    return NextResponse.redirect(`${url.origin}${next}?auth_error=state_mismatch`);
  }

  try {
    const redirectUri = `${url.origin}/api/auth/discord/callback`;
    const discordUser = await exchangeDiscordCode({ code, redirectUri });

    if (!isAllowedDiscordId(discordUser.id)) {
      const response = NextResponse.redirect(`${url.origin}${next}?auth_error=not_allowed`);
      response.headers.append("Set-Cookie", clearCookieHeader(stateCookieName()));
      response.headers.append("Set-Cookie", clearCookieHeader(redirectCookieName()));
      return response;
    }

    const token = createSessionToken(discordUser);
    const response = NextResponse.redirect(`${url.origin}${next}`);
    response.headers.append("Set-Cookie", sessionCookieHeader(token));
    response.headers.append("Set-Cookie", clearCookieHeader(stateCookieName()));
    response.headers.append("Set-Cookie", clearCookieHeader(redirectCookieName()));
    return response;
  } catch {
    return NextResponse.redirect(`${url.origin}${next}?auth_error=discord_error`);
  }
}
