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

  const body = await request.json().catch(() => ({}));
  const result = await confirmCode(session, body.code);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const member = await markEmailVerified(session.username);
  if (!member) {
    return NextResponse.json({ error: "Couldn't confirm that account." }, { status: 400 });
  }

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
