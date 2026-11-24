import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  bindMemberIps,
  createMemberToken,
  findMember,
  findMemberByEmail,
  hasMembers,
  memberCookieHeader,
  memberFromCookieStore,
  publicMember,
  verifyMemberPassword,
} from "@/lib/members";
import { clientKey, requestIps, requestLocation } from "@/lib/request-ips";
import { logActivity } from "@/lib/activity-log";
import { clearHits, limitReached, recordHit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const LIMIT = { max: 10, windowMs: 10 * 60 * 1000 };

// Stand-in credentials so a miss costs the same scrypt work as a wrong password.
const DUMMY_SALT = "0".repeat(32);
const DUMMY_HASH = "0".repeat(128);

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

export async function GET() {
  const member = await memberFromCookieStore(cookies());
  return NextResponse.json(
    { member: publicMember(member) },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}

export async function POST(request) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  }

  if (!(await hasMembers())) {
    return NextResponse.json(
      { error: "No accounts exist yet. Create one, then log in." },
      { status: 401 }
    );
  }

  const key = clientKey(request);
  const limit = await limitReached("member-login", key, LIMIT);
  if (limit.limited) {
    return NextResponse.json(
      { error: "Too many attempts. Try again in a few minutes." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
    );
  }

  const body = await request.json().catch(() => ({}));
  const username = typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  const member = (await findMember(username)) || (await findMemberByEmail(username));
  const external = Boolean(
    member && (member.provider === "google" || member.provider === "discord")
  );

  // Every miss answers the same way. An unknown account, a wrong password and an
  // OAuth-only account must be indistinguishable to someone who does not hold it;
  // the audit log keeps the distinction for operators.
  if (!member || external) {
    verifyMemberPassword({ salt: DUMMY_SALT, hash: DUMMY_HASH }, password);
  }

  if (!member || external || !verifyMemberPassword(member, password)) {
    await recordHit("member-login", key, LIMIT);
    await logActivity({
      area: "website",
      action: external ? "login-blocked" : "login-failed",
      username: member?.username || username || "Unknown",
      detail: external
        ? `Tried to use a password on a ${member.provider === "discord" ? "Discord" : "Google"} account`
        : "Wrong username or password",
      ok: false,
      request,
    });
    return NextResponse.json({ error: "That username and password don't match." }, { status: 401 });
  }

  await clearHits("member-login", key, LIMIT);
  const signedIn =
    (await bindMemberIps(member.username, requestIps(request), requestLocation(request))) || member;
  const response = NextResponse.json({ ok: true, member: publicMember(signedIn) });
  response.headers.append("Set-Cookie", memberCookieHeader(createMemberToken(signedIn)));
  await logActivity({
    area: "website",
    action: "login",
    username: member.username,
    detail: "Signed in to the site",
    request,
  });
  return response;
}
