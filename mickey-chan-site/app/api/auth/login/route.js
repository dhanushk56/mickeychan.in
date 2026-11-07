import { NextResponse } from "next/server";
import {
  checkPassword,
  createSessionToken,
  isPasswordConfigured,
  sessionCookieHeader,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

// Very small in-memory throttle: 8 failed attempts per IP per 10 minutes.
// Serverless instances each keep their own counter, which still slows
// brute-forcing considerably.
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

  if (!checkPassword(password)) {
    recordFailure(key);
    return NextResponse.json({ error: "That password didn't work." }, { status: 401 });
  }

  attempts.delete(key);
  const response = NextResponse.json({ ok: true });
  response.headers.append("Set-Cookie", sessionCookieHeader(createSessionToken()));
  return response;
}
