import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { exchangeCode, googleProfile, googleRedirectUri, isGoogleConfigured } from "@/lib/google";
import {
  createMemberToken,
  findMember,
  findMemberByEmail,
  findMemberByGoogleSub,
  isUsernameTaken,
  memberCookieHeader,
  registerMember,
} from "@/lib/members";
import { requestIps, requestLocation } from "@/lib/request-ips";
import { logActivity } from "@/lib/activity-log";
import { safeNextPath, siteOrigin } from "@/lib/site-url";

export const dynamic = "force-dynamic";

function suggestedBase(email, name) {
  const local = String(email || "").split("@")[0] || "";
  let base = local
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "")
    .replace(/^[._-]+/, "")
    .slice(0, 20);

  if (base.length < 3) {
    const fromName = String(name || "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 20);
    base = fromName.length >= 3 ? fromName : "member";
  }
  if (!/^[a-z0-9]/.test(base)) base = `m${base}`.slice(0, 20);
  return base;
}

async function availableUsername(email, name) {
  const base = suggestedBase(email, name);
  let candidate = base;
  let suffix = 2;
  while (await isUsernameTaken(candidate)) {
    if (suffix > 40) {
      candidate = `member-${crypto.randomBytes(3).toString("hex")}`;
      break;
    }
    candidate = `${base.slice(0, 16)}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

export async function GET(request) {
  const origin = siteOrigin(request);
  const url = new URL(request.url);

  const finish = (response) => {
    response.headers.append(
      "Set-Cookie",
      "mc_oauth_state=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0"
    );
    return response;
  };
  const fail = (code) => finish(NextResponse.redirect(`${origin}/login?error=${code}`));

  if (!isGoogleConfigured()) return fail("google_unavailable");
  if (url.searchParams.get("error")) return fail("google_denied");

  let parsed = null;
  try {
    parsed = JSON.parse(
      Buffer.from(request.cookies.get("mc_oauth_state")?.value || "", "base64url").toString("utf8")
    );
  } catch {
    parsed = null;
  }
  const state = url.searchParams.get("state") || "";
  if (!parsed || !parsed.state || parsed.state !== state) return fail("google_state");

  const next = safeNextPath(parsed.next);
  const code = url.searchParams.get("code") || "";
  if (!code) return fail("google_failed");

  const tokens = await exchangeCode(code, googleRedirectUri(request));
  if (!tokens) return fail("google_failed");

  const profile = await googleProfile(tokens.access_token);
  if (!profile) return fail("google_failed");
  if (!profile.emailVerified) return fail("google_email_unverified");

  let member = await findMemberByGoogleSub(profile.sub);

  if (!member) {
    const byEmail = await findMemberByEmail(profile.email);
    if (byEmail) {
      if (byEmail.provider !== "google") return fail("email_taken");
      member = byEmail;
    }
  }

  if (!member) {
    const username = await availableUsername(profile.email, profile.name);
    const result = await registerMember({
      username,
      name: profile.name,
      email: profile.email,
      provider: "google",
      googleSub: profile.sub,
      emailVerified: true,
      ips: requestIps(request),
      location: requestLocation(request),
    });
    if (result.error) {
      if (result.code === "ip_limit") return fail("ip_limit");
      if (result.code === "email_taken") return fail("email_taken");
      return fail("google_failed");
    }
    member = result.member;
    await logActivity({
      area: "website",
      action: "register-google",
      username: member.username,
      detail: "Created a site account with Google",
      request,
    });
  } else {
    await logActivity({
      area: "website",
      action: "login-google",
      username: member.username,
      detail: "Signed in with Google",
      request,
    });
  }

  const response = NextResponse.redirect(`${origin}${next}`);
  response.headers.append("Set-Cookie", memberCookieHeader(createMemberToken(member)));
  return finish(response);
}
