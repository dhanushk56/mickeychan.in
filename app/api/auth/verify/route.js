import { NextResponse } from "next/server";
import { consumeEmailToken } from "@/lib/email-verification";
import {
  clearEmailClaimCookieHeader,
  createMemberToken,
  markEmailVerified,
  memberCookieHeader,
} from "@/lib/members";
import { logActivity } from "@/lib/activity-log";
import { safeNextPath, siteOrigin } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const origin = siteOrigin(request);
  const url = new URL(request.url);
  const next = safeNextPath(url.searchParams.get("next"));

  const record = await consumeEmailToken(url.searchParams.get("token"));
  if (!record) return NextResponse.redirect(`${origin}/login?error=verify_invalid`);

  const member = await markEmailVerified(record.username);
  if (!member) return NextResponse.redirect(`${origin}/login?error=verify_invalid`);

  await logActivity({
    area: "website",
    action: "email-verified",
    username: member.username,
    detail: "Confirmed their email address",
    request,
  });

  const response = NextResponse.redirect(`${origin}${next}`);
  response.headers.append("Set-Cookie", memberCookieHeader(createMemberToken(member)));
  response.headers.append("Set-Cookie", clearEmailClaimCookieHeader());
  return response;
}
