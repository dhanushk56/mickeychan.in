import { NextResponse } from "next/server";
import { findMemberByEmail } from "@/lib/members";
import { clearResetCode, issueResetCode } from "@/lib/password-reset";
import { isEmailConfigured, resetEmail, sendEmail } from "@/lib/email";
import { logActivity } from "@/lib/activity-log";
import { limitReached, recordHit } from "@/lib/rate-limit";

import { clientKey } from "@/lib/request-ips";

export const dynamic = "force-dynamic";

const LIMIT = { max: 8, windowMs: 60 * 60 * 1000 };

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

  if (!isEmailConfigured()) {
    return NextResponse.json(
      { error: "Email confirmation isn't set up yet. Ask the site owner to finish it." },
      { status: 503 }
    );
  }

  const key = clientKey(request);
  const limit = await limitReached("password-request", key, LIMIT);
  if (limit.limited) {
    return NextResponse.json(
      { error: "Too many reset requests. Try again later." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
    );
  }

  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter the email address on your account." }, { status: 400 });
  }

  const member = await findMemberByEmail(email);
  if (member && member.provider !== "google" && member.provider !== "discord") {
    const issued = await issueResetCode(member);
    if (!issued.error) {
      const message = resetEmail({ username: member.name || member.username, code: issued.code });
      const sent = await sendEmail({
        to: member.email,
        subject: message.subject,
        html: message.html,
        text: message.text,
      });
      if (sent.error) await clearResetCode(member.email);
      await recordHit("password-request", key, LIMIT);
      await logActivity({
        area: "website",
        action: "password-reset-code",
        username: member.username,
        detail: sent.error ? `Couldn't send a reset code to ${member.email}` : `Sent a password reset code to ${member.email}`,
        ok: !sent.error,
        request,
      });
    }
  }

  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
