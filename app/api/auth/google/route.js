import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { authorizationUrl, googleRedirectUri, isGoogleConfigured } from "@/lib/google";
import { safeNextPath, siteOrigin } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const origin = siteOrigin(request);
  const next = safeNextPath(new URL(request.url).searchParams.get("next"));

  if (!isGoogleConfigured()) {
    return NextResponse.redirect(`${origin}/login?error=google_unavailable`);
  }

  const state = crypto.randomBytes(16).toString("hex");
  const payload = Buffer.from(JSON.stringify({ state, next })).toString("base64url");
  const response = NextResponse.redirect(
    authorizationUrl({ redirectUri: googleRedirectUri(request), state })
  );
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  response.headers.append(
    "Set-Cookie",
    `mc_oauth_state=${payload}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600${secure}`
  );
  return response;
}
