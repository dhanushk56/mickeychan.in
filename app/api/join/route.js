import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { kvGet, kvSet } from "@/lib/kv";
import { memberFromCookieStore } from "@/lib/members";
import { logActivity } from "@/lib/activity-log";
import { EMAIL_VERIFICATION_REQUIRED } from "@/lib/features";

const SUBMISSIONS_KEY = "submissions:join";

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
  const member = await memberFromCookieStore(cookies());
  if (!member) {
    return NextResponse.json({ error: "Please log in to send a message." }, { status: 401 });
  }

  if (EMAIL_VERIFICATION_REQUIRED && member.emailVerified !== true) {
    return NextResponse.json(
      {
        error: "Confirm your email address before sending a message — open Verify your account from the menu.",
        code: "email_unverified",
      },
      { status: 403 }
    );
  }

  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const role = typeof body.role === "string" ? body.role.trim() : "Community";
  if (!name || !email || !message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Please provide a valid name, email, and message." }, { status: 400 });
  }

  const submissions = await kvGet(SUBMISSIONS_KEY, []);
  submissions.unshift({
    id: crypto.randomUUID(),
    memberUsername: member.username,
    memberName: member.name,
    name,
    email,
    role,
    message,
    createdAt: new Date().toISOString(),
  });
  await kvSet(SUBMISSIONS_KEY, submissions);

  await logActivity({
    area: "website",
    action: "message",
    username: member.username,
    detail: `Sent a “join us” message (${role})`,
    request,
  });

  return NextResponse.json({ ok: true });
}
