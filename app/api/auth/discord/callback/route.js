import { NextResponse } from "next/server";
import {
  discordProfile,
  discordRedirectUri,
  exchangeDiscordCode,
  isDiscordConfigured,
} from "@/lib/discord";
import {
  createMemberToken,
  findMemberByDiscordId,
  findMemberByEmail,
  isUsernameTaken,
  memberCookieHeader,
  registerMember,
} from "@/lib/members";
import { availableUsernameFrom } from "@/lib/member-handles";
import { requestIps, requestLocation } from "@/lib/request-ips";
import { logActivity } from "@/lib/activity-log";
import { safeNextPath, siteOrigin } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const origin = siteOrigin(request);
  const url = new URL(request.url);

  const finish = (response) => {
    response.headers.append(
      "Set-Cookie",
      "mc_discord_state=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0"
    );
    return response;
  };
  const fail = (code) => finish(NextResponse.redirect(`${origin}/login?error=${code}`));

  if (!isDiscordConfigured()) return fail("discord_unavailable");
  if (url.searchParams.get("error")) return fail("discord_denied");

  let parsed = null;
  try {
    parsed = JSON.parse(
      Buffer.from(request.cookies.get("mc_discord_state")?.value || "", "base64url").toString("utf8")
    );
  } catch {
    parsed = null;
  }
  const state = url.searchParams.get("state") || "";
  if (!parsed || !parsed.state || parsed.state !== state) return fail("discord_state");

  const next = safeNextPath(parsed.next);
  const code = url.searchParams.get("code") || "";
  if (!code) return fail("discord_failed");

  const tokens = await exchangeDiscordCode(code, discordRedirectUri(request));
  if (!tokens) return fail("discord_failed");

  const profile = await discordProfile(tokens.access_token);
  if (!profile) return fail("discord_failed");
  if (!profile.email) return fail("discord_no_email");
  if (!profile.emailVerified) return fail("discord_email_unverified");

  let member = await findMemberByDiscordId(profile.id);

  if (!member) {
    const byEmail = await findMemberByEmail(profile.email);
    if (byEmail) {
      if (byEmail.provider !== "discord") return fail("email_taken");
      member = byEmail;
    }
  }

  if (!member) {
    const username = await availableUsernameFrom(profile.username, profile.email, profile.name);
    if (!(await isUsernameTaken(username))) {
      const result = await registerMember({
        username,
        name: profile.name,
        email: profile.email,
        provider: "discord",
        discordId: profile.id,
        emailVerified: true,
        ips: requestIps(request),
        location: requestLocation(request),
      });
      if (result.error) {
        if (result.code === "ip_limit") return fail("ip_limit");
        if (result.code === "email_taken") return fail("email_taken");
        return fail("discord_failed");
      }
      member = result.member;
      await logActivity({
        area: "website",
        action: "register-discord",
        username: member.username,
        detail: "Created a site account with Discord",
        request,
      });
    }
  }

  if (!member) return fail("discord_failed");

  if (member.provider === "discord" && member.discordId === profile.id) {
    await logActivity({
      area: "website",
      action: "login-discord",
      username: member.username,
      detail: "Signed in with Discord",
      request,
    });
  }

  const response = NextResponse.redirect(`${origin}${next}`);
  response.headers.append("Set-Cookie", memberCookieHeader(createMemberToken(member)));
  return finish(response);
}
