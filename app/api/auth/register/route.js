import { NextResponse } from "next/server";
import { createMemberToken, memberCookieHeader, publicMember, registerMember } from "@/lib/members";

export const dynamic = "force-dynamic";

// Registrations are cheap to spam, so cap them per IP the same way logins are
// capped. Serverless instances keep their own counter.
const signups = globalThis.__mcSignupAttempts || (globalThis.__mcSignupAttempts = new Map());
const WINDOW_MS = 60 * 60 * 1000;
const MAX_SIGNUPS = 5;

function clientKey(request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "local"
  );
}

function tooManySignups(key) {
  const record = signups.get(key);
  if (!record) return false;
  if (Date.now() - record.first > WINDOW_MS) {
    signups.delete(key);
    return false;
  }
  return record.count >= MAX_SIGNUPS;
}

function recordSignup(key) {
  const record = signups.get(key);
  if (!record || Date.now() - record.first > WINDOW_MS) signups.set(key, { first: Date.now(), count: 1 });
  else record.count += 1;
}

// Proxy-aware same-origin check: request.url points at the internal server
// when the app sits behind a tunnel or custom domain.
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
    /* ignore */
  }
  return candidates.filter(Boolean).includes(originHost);
}

export async function POST(request) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  }

  const key = clientKey(request);
  if (tooManySignups(key)) {
    return NextResponse.json(
      { error: "Too many accounts created from this connection. Try again later." },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const username = typeof body.username === "string" ? body.username : "";
  const password = typeof body.password === "string" ? body.password : "";
  const confirm = typeof body.confirmPassword === "string" ? body.confirmPassword : password;
  const name = typeof body.name === "string" ? body.name : "";

  if (password !== confirm) {
    return NextResponse.json({ error: "Those passwords don't match." }, { status: 400 });
  }

  const result = await registerMember({ username, name, password });
  if (result.error) {
    const taken = result.error.includes("already taken");
    return NextResponse.json({ error: result.error }, { status: taken ? 409 : 400 });
  }

  recordSignup(key);

  // Sign them straight in: registration and login are one step.
  const response = NextResponse.json({ ok: true, member: publicMember(result.member) });
  response.headers.append("Set-Cookie", memberCookieHeader(createMemberToken(result.member)));
  return response;
}
