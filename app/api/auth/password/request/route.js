import { NextResponse } from "next/server";
import { findMemberByEmail } from "@/lib/members";
import { clearResetCode, issueResetCode } from "@/lib/password-reset";
import { isEmailConfigured, resetEmail, sendEmail } from "@/lib/email";
import { logActivity } from "@/lib/activity-log";

export const dynamic = "force-dynamic";

const requests = globalThis.__mcResetRequests || (globalThis.__mcResetRequests = new Map());
const WINDOW_MS = 60 * 60 * 1000;
const MAX_REQUESTS = 8;

function clientKey(request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "local"
  );
}

function tooMany(key) {
  const record = requests.get(key);
  if (!record) return false;
  if (Date.now() - record.first > WINDOW_MS) {
    requests.delete(key);
    return false;
  }
  return record.count >= MAX_REQUESTS;
}

function recordRequest(key) {
  const record = requests.get(key);
  if (!record || Date.now() - record.first > WINDOW_MS) requests.set(key, { first: Date.now(), count: 1 });
  else record.count += 1;
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

  if (!isEmailConfigured()) {
    return NextResponse.json(
      { error: "Email confirmation isn't set up yet. Ask the site owner to finish it." },
      { status: 503 }
    );
  }

  const key = clientKey(request);
  if (tooMany(key)) {
    return NextResponse.json(
      { error: "Too many reset requests. Try again later." },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter the email address on your account." }, { status: 400 });
  }

  const member = await findMemberByEmail(email);
  if (!member) {
    return NextResponse.json(
      { error: "No account is associated with that email address.", code: "no_account" },
      { status: 404 }
    );
  }

  if (member.provider === "google" || member.provider === "discord") {
    const provider = member.provider === "discord" ? "Discord" : "Google";
    return NextResponse.json(
      {
        error: `That account signs in with ${provider}, so it has no password to reset. Use the ${provider} button on the login page.`,
        code: "oauth_account",
      },
      { status: 400 }
    );
  }

  const issued = await issueResetCode(member);
  if (issued.error === "cooldown") {
    return NextResponse.json(
      { error: `Wait ${issued.waitSeconds}s before asking for another code.`, waitSeconds: issued.waitSeconds },
      { status: 429 }
    );
  }

  const message = resetEmail({ username: member.name || member.username, code: issued.code });
  const sent = await sendEmail({
    to: member.email,
    subject: message.subject,
    html: message.html,
    text: message.text,
  });
  if (sent.error) {
    await clearResetCode(member.email);
    return NextResponse.json(
      { error: "We couldn't send the email. Try again in a minute." },
      { status: 502 }
    );
  }

  recordRequest(key);
  await logActivity({
    area: "website",
    action: "password-reset-code",
    username: member.username,
    detail: `Sent a password reset code to ${member.email}`,
    request,
  });

  return NextResponse.json({ ok: true, email: member.email });
}
