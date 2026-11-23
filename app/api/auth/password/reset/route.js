import { NextResponse } from "next/server";
import {
  findMemberByEmail,
  markEmailVerified,
  passwordProblem,
  setMemberPassword,
} from "@/lib/members";
import { clearResetCode, verifyResetCode } from "@/lib/password-reset";
import { logActivity } from "@/lib/activity-log";

export const dynamic = "force-dynamic";

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
    return NextResponse.json({ error: "That code has expired. Send a new one." }, { status: 400 });
  }

  const problem = passwordProblem(password, member.username);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  if (password !== confirm) {
    return NextResponse.json({ error: "Those passwords don't match." }, { status: 400 });
  }

  const checked = await verifyResetCode(email, code);
  if (checked.error) {
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

  await logActivity({
    area: "website",
    action: "password-reset",
    username: member.username,
    detail: "Reset their password with an email code",
    request,
  });

  return NextResponse.json({ ok: true, username: member.username });
}
