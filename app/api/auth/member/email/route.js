import { NextResponse } from "next/server";
import {
  attachEmail,
  clearEmailClaimCookieHeader,
  findMember,
  parseEmailClaimToken,
} from "@/lib/members";
import { isEmailConfigured } from "@/lib/email";
import { sendVerificationEmail } from "@/lib/email-verification";
import { logActivity } from "@/lib/activity-log";
import { safeNextPath, siteOrigin } from "@/lib/site-url";

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

function expired(response) {
  response.headers.append("Set-Cookie", clearEmailClaimCookieHeader());
  return response;
}

export async function POST(request) {
  if (!isEmailConfigured()) {
    return NextResponse.json({ error: "Email confirmation isn't set up yet." }, { status: 503 });
  }

  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  }

  const claims = parseEmailClaimToken(request.cookies.get("mc_member_pending")?.value);
  if (!claims) {
    return expired(
      NextResponse.json(
        { error: "That step expired. Log in again to add your email address." },
        { status: 401 }
      )
    );
  }

  const member = await findMember(claims.sub);
  if (!member || member.provider === "google") {
    return expired(
      NextResponse.json({ error: "Log in again to add your email address." }, { status: 401 })
    );
  }

  const revision = member.updatedAt || member.createdAt || "v1";
  if (claims.rev !== undefined && claims.rev !== revision) {
    return expired(
      NextResponse.json({ error: "Log in again to add your email address." }, { status: 401 })
    );
  }

  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email : "";
  const next = safeNextPath(body.next);

  const result = await attachEmail(member.username, email);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const sent = await sendVerificationEmail({
    member: result.member,
    origin: siteOrigin(request),
    next,
  });
  if (sent.error) {
    return NextResponse.json(
      { error: "We couldn't send the confirmation email. Please try again in a minute." },
      { status: 502 }
    );
  }

  await logActivity({
    area: "website",
    action: "email-attached",
    username: member.username,
    detail: "Added an email address and asked for confirmation",
    request,
  });

  const response = NextResponse.json({ ok: true, email: result.member.email });
  response.headers.append("Set-Cookie", clearEmailClaimCookieHeader());
  return response;
}
