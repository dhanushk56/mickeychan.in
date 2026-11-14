import { NextResponse } from "next/server";
import {
  checkPassword,
  createSessionToken,
  isPasswordConfigured,
  sessionCookieHeader,
} from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";
import { isAdminUsername } from "@/lib/admin-access";

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
  const typedName = typeof body.username === "string" ? body.username.trim() : "";

  if (!checkPassword(password)) {
    recordFailure(key);
    await logActivity({
      area: "admin",
      action: "login-failed",
      username: typedName || "Unknown",
      detail: "Wrong admin password",
      ok: false,
      request,
    });
    return NextResponse.json({ error: "That password didn't work." }, { status: 401 });
  }

  if (!isAdminUsername(typedName)) {
    recordFailure(key);
    await logActivity({
      area: "admin",
      action: "login-denied",
      username: typedName || "Unknown",
      detail: "Username is not on the admin allowlist",
      ok: false,
      request,
    });
    return NextResponse.json(
      {
        error: "That username doesn't have access to the admin console.",
        code: "admin_not_allowed",
      },
      { status: 403 }
    );
  }

  attempts.delete(key);
  const actor = typedName;
  const response = NextResponse.json({ ok: true, user: { username: actor } });
  response.headers.append("Set-Cookie", sessionCookieHeader(createSessionToken(actor)));
  await logActivity({
    area: "admin",
    action: "login",
    username: actor,
    detail: "Signed in to the admin console",
    request,
  });
  return response;
}
