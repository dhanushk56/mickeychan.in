import { NextResponse } from "next/server";
import { createMemberToken, memberCookieHeader, publicMember, registerMember } from "@/lib/members";
import { requestIps, requestLocation } from "@/lib/request-ips";
import { logActivity } from "@/lib/activity-log";
import { isEmailConfigured } from "@/lib/email";
import { isCodeSecretConfigured, sendCodeEmail } from "@/lib/email-verification";
import { limitReached, recordHit } from "@/lib/rate-limit";

import { clientKey } from "@/lib/request-ips";

export const dynamic = "force-dynamic";

const LIMIT = { max: 5, windowMs: 60 * 60 * 1000 };

export async function POST(request) {
  // Sending a confirmation code needs the session secret. Without it the send
  // would throw halfway through registration, so say what's missing instead.
  if (isEmailConfigured() && !isCodeSecretConfigured()) {
    return NextResponse.json(
      { error: "Sign-up isn't fully set up yet. Ask the site owner to finish it." },
      { status: 503 }
    );
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
  const phone = typeof body.phone === "string" ? body.phone : "";

  if (password !== confirm) {
    return NextResponse.json({ error: "Those passwords don't match." }, { status: 400 });
  }

  const result = await registerMember({
    username,
    name,
    email,
    phone,
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
    // Rejected attempts count too, so one connection cannot probe usernames or
    // addresses indefinitely without tripping the limit.
    await recordHit("register", key, LIMIT);
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
