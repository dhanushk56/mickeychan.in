import { NextResponse } from "next/server";
import { sendVerificationEmail } from "@/lib/email-verification";
import { isEmailConfigured } from "@/lib/email";
import { findMember } from "@/lib/members";
import { safeNextPath, siteOrigin } from "@/lib/site-url";

export const dynamic = "force-dynamic";

const sends = globalThis.__mcVerifyResends || (globalThis.__mcVerifyResends = new Map());
const WINDOW_MS = 60 * 60 * 1000;
const MAX_SENDS = 3;

function clientKey(request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "local"
  );
}

function tooManySends(key) {
  const record = sends.get(key);
  if (!record) return false;
  if (Date.now() - record.first > WINDOW_MS) {
    sends.delete(key);
    return false;
  }
  return record.count >= MAX_SENDS;
}

function recordSend(key) {
  const record = sends.get(key);
  if (!record || Date.now() - record.first > WINDOW_MS) sends.set(key, { first: Date.now(), count: 1 });
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
  if (!isEmailConfigured()) {
    return NextResponse.json(
      { error: "Email confirmation isn't set up yet." },
      { status: 503 }
    );
  }

  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  }

  const key = clientKey(request);
  if (tooManySends(key)) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  }
  recordSend(key);

  const body = await request.json().catch(() => ({}));
  const username = typeof body.username === "string" ? body.username.trim() : "";
  const next = safeNextPath(body.next);

  const member = await findMember(username);
  if (
    member &&
    member.email &&
    member.emailVerified !== true &&
    member.provider !== "google"
  ) {
    await sendVerificationEmail({ member, origin: siteOrigin(request), next });
  }

  return NextResponse.json({ ok: true });
}
