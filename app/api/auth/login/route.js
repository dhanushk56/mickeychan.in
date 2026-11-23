import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  checkPassword,
  createSessionToken,
  isPasswordConfigured,
  sessionCookieHeader,
} from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";
import { memberFromCookieStore } from "@/lib/members";
import { resolveAdmin } from "@/lib/roles";

export const dynamic = "force-dynamic";

const attempts = globalThis.__mcLoginAttempts || (globalThis.__mcLoginAttempts = new Map());
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 8;

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
  if (!record || Date.now() - record.first > WINDOW_MS) {
    attempts.set(key, { first: Date.now(), count: 1 });
  } else {
    record.count += 1;
  }
}

export async function POST(request) {
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).host !== new URL(request.url).host) {
        return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
    }
  }

  if (!isPasswordConfigured()) {
    return NextResponse.json(
      { error: "No admin password is configured. Set ADMIN_PASSWORD in the environment." },
      { status: 500 }
    );
  }

  const key = clientKey(request);
  if (tooManyAttempts(key)) {
    return NextResponse.json(
      { error: "Too many attempts. Try again in a few minutes." },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const password = typeof body.password === "string" ? body.password : "";

  const member = await memberFromCookieStore(cookies());
  if (!member) {
    await logActivity({
      area: "admin",
      action: "login-blocked",
      username: "Unknown",
      detail: "Tried to unlock the console without a site account",
      ok: false,
      request,
    });
    return NextResponse.json(
      {
        error: "Log in to your site account first, then unlock the console.",
        code: "login_required",
      },
      { status: 401 }
    );
  }

  if (!checkPassword(password)) {
    recordFailure(key);
    await logActivity({
      area: "admin",
      action: "login-failed",
      username: member.username,
      detail: "Wrong admin password",
      ok: false,
      request,
    });
    return NextResponse.json({ error: "That password didn't work." }, { status: 401 });
  }

  const access = await resolveAdmin(member.username);
  if (!access) {
    recordFailure(key);
    await logActivity({
      area: "admin",
      action: "login-denied",
      username: member.username,
      detail: "Site account has no console role",
      ok: false,
      request,
    });
    return NextResponse.json(
      {
        error: "Your account doesn't have access to the admin console.",
        code: "admin_not_allowed",
      },
      { status: 403 }
    );
  }

  attempts.delete(key);
  const response = NextResponse.json({
    ok: true,
    user: {
      username: access.username,
      role: access.roleName,
      owner: access.owner,
      permissions: access.permissions,
    },
  });
  response.headers.append(
    "Set-Cookie",
    sessionCookieHeader(createSessionToken(access.username, access))
  );
  await logActivity({
    area: "admin",
    action: "login",
    username: access.username,
    detail: `Signed in to the admin console as ${access.roleName}`,
    request,
  });
  return response;
}
