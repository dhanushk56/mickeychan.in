import { NextResponse } from "next/server";
import { discordAuthorizationUrl, discordRedirectUri, isDiscordConfigured } from "@/lib/discord";
import { createOAuthState } from "@/lib/oauth-state";
import { safeNextPath, siteOrigin } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const origin = siteOrigin(request);
  const next = safeNextPath(new URL(request.url).searchParams.get("next"));

  if (!isDiscordConfigured()) {
    return NextResponse.redirect(`${origin}/login?error=discord_unavailable`);
  }

  const { state, value } = createOAuthState(next);
  const response = NextResponse.redirect(
    discordAuthorizationUrl({ redirectUri: discordRedirectUri(request), state })
  );
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  response.headers.append(
    "Set-Cookie",
    `mc_discord_state=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600${secure}`
  );
  return response;
}
