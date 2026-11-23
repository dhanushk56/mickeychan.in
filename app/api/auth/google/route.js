import { NextResponse } from "next/server";
import { authorizationUrl, googleRedirectUri, isGoogleConfigured } from "@/lib/google";
import { createOAuthState } from "@/lib/oauth-state";
import { safeNextPath, siteOrigin } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const origin = siteOrigin(request);
  const next = safeNextPath(new URL(request.url).searchParams.get("next"));

  if (!isGoogleConfigured()) {
    return NextResponse.redirect(`${origin}/login?error=google_unavailable`);
  }

  const { state, value } = createOAuthState(next);
  const response = NextResponse.redirect(
    authorizationUrl({ redirectUri: googleRedirectUri(request), state })
  );
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  response.headers.append(
    "Set-Cookie",
    `mc_oauth_state=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600${secure}`
  );
  return response;
}
