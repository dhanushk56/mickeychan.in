import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  createMemberToken,
  markEmailVerified,
  memberCookieHeader,
  memberFromCookieStore,
  publicMember,
} from "@/lib/members";
import { confirmCode } from "@/lib/email-verification";
import { logActivity } from "@/lib/activity-log";
import { clearHits, limitReached, recordHit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const LIMIT = { max: 10, windowMs: 10 * 60 * 1000 };

function clientKey(request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "local"
  );
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

  const session = await memberFromCookieStore(cookies());
  if (!session) {
    return NextResponse.json({ error: "Log in first." }, { status: 401 });
  }

  if (session.emailVerified) {
    return NextResponse.json({ ok: true, member: publicMember(session) });
  }

  if (!session.email) {
    return NextResponse.json({ error: "Add your email address first." }, { status: 400 });
  }

  const key = clientKey(request);
  const limit = await limitReached("email-confirm", key, LIMIT);
  if (limit.limited) {
    return NextResponse.json(
      { error: "Too many attempts. Try again in a few minutes." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
    );
  }

  const body = await request.json().catch(() => ({}));
  const result = await confirmCode(session, body.code);
  if (result.error) {
    await recordHit("email-confirm", key, LIMIT);
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const member = await markEmailVerified(session.username);
  if (!member) {
    return NextResponse.json({ error: "Couldn't confirm that account." }, { status: 400 });
  }

  await clearHits("email-confirm", key, LIMIT);
  await logActivity({
    area: "website",
    action: "email-verified",
    username: member.username,
    detail: "Confirmed their email address with a code",
    request,
  });

  const response = NextResponse.json({ ok: true, member: publicMember(member) });
  response.headers.append("Set-Cookie", memberCookieHeader(createMemberToken(member)));
  return response;
}
