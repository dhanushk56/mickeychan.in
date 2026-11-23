import { NextResponse } from "next/server";
import { createMemberToken, memberCookieHeader, publicMember, registerMember } from "@/lib/members";
import { requestIps, requestLocation } from "@/lib/request-ips";
import { logActivity } from "@/lib/activity-log";
import { isEmailConfigured } from "@/lib/email";
import { sendCodeEmail } from "@/lib/email-verification";
import { limitReached, recordHit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const LIMIT = { max: 5, windowMs: 60 * 60 * 1000 };

function clientKey(request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "local"
  );
}

function sameOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  let originHost;
  try {
    originHost = new URL(origin).host;
  } catch {
    return false;
  }
  const candidates = [request.headers.get("host"), request.headers.get("x-forwarded-host")];
  try {
    candidates.push(new URL(request.url).host);
  } catch {
  }
  return candidates.filter(Boolean).includes(originHost);
}

export async function POST(request) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  }

  const key = clientKey(request);
  const limit = await limitReached("register", key, LIMIT);
  if (limit.limited) {
    return NextResponse.json(
      { error: "Too many accounts created from this connection. Try again later." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
    );
  }

  const body = await request.json().catch(() => ({}));
  const username = typeof body.username === "string" ? body.username : "";
  const password = typeof body.password === "string" ? body.password : "";
  const confirm = typeof body.confirmPassword === "string" ? body.confirmPassword : password;
  const name = typeof body.name === "string" ? body.name : "";
  const email = typeof body.email === "string" ? body.email : "";

  if (password !== confirm) {
    return NextResponse.json({ error: "Those passwords don't match." }, { status: 400 });
  }

  const result = await registerMember({
    username,
    name,
    email,
    password,
    provider: "password",
    emailVerified: false,
    ips: requestIps(request),
    location: requestLocation(request),
  });
  if (result.error) {
    if (result.code === "ip_limit") {
      await logActivity({
        area: "website",
        action: "signup-blocked",
        username: username || "Unknown",
        detail: "Blocked: this internet connection already has an account",
        ok: false,
        request,
      });
    }
    const conflict = result.code === "ip_limit" || result.error.includes("already taken");
    return NextResponse.json({ error: result.error, code: result.code }, { status: conflict ? 409 : 400 });
  }

  await recordHit("register", key, LIMIT);

  let emailSent = false;
  if (isEmailConfigured()) {
    const sent = await sendCodeEmail(result.member);
    emailSent = Boolean(sent.ok);
  }

  await logActivity({
    area: "website",
    action: "register",
    username: result.member.username,
    detail: "Created a site account",
    request,
  });

  const response = NextResponse.json({
    ok: true,
    member: publicMember(result.member),
    emailSent,
  });
  response.headers.append("Set-Cookie", memberCookieHeader(createMemberToken(result.member)));
  return response;
}
