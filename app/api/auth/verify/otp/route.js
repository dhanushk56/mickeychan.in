import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  attachEmail,
  createMemberToken,
  memberCookieHeader,
  memberFromCookieStore,
} from "@/lib/members";
import { isEmailConfigured } from "@/lib/email";
import { sendCodeEmail } from "@/lib/email-verification";
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

  if (!isEmailConfigured()) {
    return NextResponse.json(
      { error: "Email confirmation isn't set up yet. Ask the site owner to finish it." },
      { status: 503 }
    );
  }

  const session = await memberFromCookieStore(cookies());
  if (!session) {
    return NextResponse.json({ error: "Log in first." }, { status: 401 });
  }

  if (session.emailVerified) {
    return NextResponse.json({ error: "This email address is already confirmed." }, { status: 409 });
  }

  const body = await request.json().catch(() => ({}));
  const requested = typeof body.email === "string" ? body.email.trim() : "";
  let member = session;
  let reissued = false;

  if (requested) {
    const attached = await attachEmail(session.username, requested);
    if (attached.error) {
      return NextResponse.json({ error: attached.error }, { status: 400 });
    }
    member = attached.member;
    reissued = true;
  } else if (!session.email) {
    return NextResponse.json({ error: "Add your email address first." }, { status: 400 });
  }

  const sent = await sendCodeEmail(member);
  if (sent.error === "cooldown") {
    return NextResponse.json(
      { error: `Wait ${sent.waitSeconds}s before asking for another code.`, waitSeconds: sent.waitSeconds },
      { status: 429 }
    );
  }
  if (sent.error) {
    return NextResponse.json(
      { error: "We couldn't send the email. Try again in a minute." },
      { status: 502 }
    );
  }

  await logActivity({
    area: "website",
    action: "verify-code-sent",
    username: member.username,
    detail: `Sent a confirmation code to ${member.email}`,
    request,
  });

  const response = NextResponse.json({ ok: true, email: member.email });
  if (reissued) {
    response.headers.append("Set-Cookie", memberCookieHeader(createMemberToken(member)));
  }
  return response;
}
