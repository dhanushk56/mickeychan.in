import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  createEmailClaimToken,
  createMemberToken,
  emailClaimCookieHeader,
  findMember,
  hasMembers,
  memberCookieHeader,
  memberFromCookieStore,
  publicMember,
  verifyMemberPassword,
} from "@/lib/members";
import { logActivity } from "@/lib/activity-log";

export const dynamic = "force-dynamic";

const attempts = globalThis.__mcMemberAttempts || (globalThis.__mcMemberAttempts = new Map());
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 10;

function clientKey(request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "local"
  );
}

function tooManyAttempts(key) {
  const record = attempts.get(key);
  if (!record) return false;
  if (Date.now() - record.first > WINDOW_MS) {
    attempts.delete(key);
    return false;
  }
  return record.count >= MAX_ATTEMPTS;
}

function recordFailure(key) {
  const record = attempts.get(key);
  if (!record || Date.now() - record.first > WINDOW_MS) attempts.set(key, { first: Date.now(), count: 1 });
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

export async function GET() {
  const member = await memberFromCookieStore(cookies());
  return NextResponse.json(
    { member: publicMember(member) },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}

export async function POST(request) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  }

  if (!(await hasMembers())) {
    return NextResponse.json(
      { error: "No accounts exist yet. Create one, then log in." },
      { status: 401 }
    );
  }

  const key = clientKey(request);
  if (tooManyAttempts(key)) {
    return NextResponse.json({ error: "Too many attempts. Try again in a few minutes." }, { status: 429 });
  }

  const body = await request.json().catch(() => ({}));
  const username = typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  const member = await findMember(username);

  if (member && member.provider === "google") {
    await logActivity({
      area: "website",
      action: "login-blocked",
      username: member.username,
      detail: "Tried to use a password on a Google account",
      ok: false,
      request,
    });
    return NextResponse.json(
      {
        error: "That account signs in with Google — use the Google button instead.",
        code: "google_only",
      },
      { status: 400 }
    );
  }

  if (!member || !verifyMemberPassword(member, password)) {
    recordFailure(key);
    await logActivity({
      area: "website",
      action: "login-failed",
      username: username || "Unknown",
      detail: "Wrong username or password",
      ok: false,
      request,
    });
    return NextResponse.json({ error: "That username and password don't match." }, { status: 401 });
  }

  if (member.emailVerified !== true) {
    const needsEmail = !member.email;
    await logActivity({
      area: "website",
      action: "login-blocked",
      username: member.username,
      detail: needsEmail ? "Has no email address on file" : "Email address not confirmed yet",
      ok: false,
      request,
    });

    const response = NextResponse.json(
      {
        error: needsEmail
          ? "Add your email address to finish setting up your account."
          : "Confirm your email address first — we sent you a link when you signed up.",
        code: needsEmail ? "email_required" : "unverified",
      },
      { status: needsEmail ? 409 : 403 }
    );
    if (needsEmail) {
      response.headers.append("Set-Cookie", emailClaimCookieHeader(createEmailClaimToken(member)));
    }
    return response;
  }

  attempts.delete(key);
  const response = NextResponse.json({ ok: true, member: publicMember(member) });
  response.headers.append("Set-Cookie", memberCookieHeader(createMemberToken(member)));
  await logActivity({
    area: "website",
    action: "login",
    username: member.username,
    detail: "Signed in to the site",
    request,
  });
  return response;
}
