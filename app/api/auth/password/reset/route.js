import { NextResponse } from "next/server";
import {
  findMemberByEmail,
  markEmailVerified,
  passwordProblem,
  setMemberPassword,
} from "@/lib/members";
import { clearResetCode, verifyResetCode } from "@/lib/password-reset";
import { logActivity } from "@/lib/activity-log";
import { clearHits, limitReached, recordHit } from "@/lib/rate-limit";

import { clientKey } from "@/lib/request-ips";

export const dynamic = "force-dynamic";

const LIMIT = { max: 10, windowMs: 10 * 60 * 1000 };

export async function POST(request) {
  const key = clientKey(request);
  const limit = await limitReached("password-reset", key, LIMIT);
  if (limit.limited) {
    return NextResponse.json(
      { error: "Too many attempts. Try again in a few minutes." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
    );
  }

  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const code = typeof body.code === "string" ? body.code : "";
  const password = typeof body.password === "string" ? body.password : "";
  const confirm = typeof body.confirmPassword === "string" ? body.confirmPassword : password;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter the email address on your account." }, { status: 400 });
  }

  const member = await findMemberByEmail(email);
  if (!member || member.provider === "google" || member.provider === "discord") {
    await recordHit("password-reset", key, LIMIT);
    return NextResponse.json({ error: "That code has expired. Send a new one." }, { status: 400 });
  }

  const problem = passwordProblem(password, member.username);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  if (password !== confirm) {
    return NextResponse.json({ error: "Those passwords don't match." }, { status: 400 });
  }

  const checked = await verifyResetCode(email, code);
  if (checked.error) {
    await recordHit("password-reset", key, LIMIT);
    return NextResponse.json({ error: checked.error }, { status: 400 });
  }

  const updated = await setMemberPassword(member.username, password);
  if (updated.error) {
    return NextResponse.json({ error: updated.error }, { status: 400 });
  }

  if (member.emailVerified !== true) {
    await markEmailVerified(member.username);
  }
  await clearResetCode(email);
  await clearHits("password-reset", key, LIMIT);

  await logActivity({
    area: "website",
    action: "password-reset",
    username: member.username,
    detail: "Reset their password with an email code",
    request,
  });

  return NextResponse.json({ ok: true, username: member.username });
}
