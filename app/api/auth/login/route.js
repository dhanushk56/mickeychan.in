import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  checkPassword,
  createSessionToken,
  isPasswordConfigured,
  sessionCookieHeader,
} from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";
import { memberFromCookieStore } from "@/lib/members";
import { clearHits, limitReached, recordHit } from "@/lib/rate-limit";
import { resolveAdmin } from "@/lib/roles";

export const dynamic = "force-dynamic";

const LIMIT = { max: 8, windowMs: 10 * 60 * 1000 };

function clientKey(request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "local"
  );
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
  const limit = await limitReached("admin-login", key, LIMIT);
  if (limit.limited) {
    return NextResponse.json(
      { error: "Too many attempts. Try again in a few minutes." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
    );
  }

  const body = await request.json().catch(() => ({}));
  const password = typeof body.password === "string" ? body.password : "";

  const member = await memberFromCookieStore(cookies());
  if (!member) {
    await recordHit("admin-login", key, LIMIT);
    await logActivity({
      area: "admin",
      action: "login-blocked",
      username: "Unknown",
      detail: "Tried to unlock the console without a site account",
      ok: false,
      request,
    });
    return NextResponse.json(
      {
        error: "Log in to your site account first, then unlock the console.",
        code: "login_required",
      },
      { status: 401 }
    );
  }

  if (!checkPassword(password)) {
    await recordHit("admin-login", key, LIMIT);
    await logActivity({
      area: "admin",
      action: "login-failed",
      username: member.username,
      detail: "Wrong admin password",
      ok: false,
      request,
    });
    return NextResponse.json({ error: "That password didn't work." }, { status: 401 });
  }

  const access = await resolveAdmin(member.username);
  if (!access) {
    await recordHit("admin-login", key, LIMIT);
    await logActivity({
      area: "admin",
      action: "login-denied",
      username: member.username,
      detail: "Site account has no console role",
      ok: false,
      request,
    });
    return NextResponse.json(
      {
        error: "Your account doesn't have access to the admin console.",
        code: "admin_not_allowed",
      },
      { status: 403 }
    );
  }

  await clearHits("admin-login", key, LIMIT);
  const response = NextResponse.json({
    ok: true,
    user: {
      username: access.username,
      role: access.roleName,
      owner: access.owner,
      permissions: access.permissions,
    },
  });
  response.headers.append(
    "Set-Cookie",
    sessionCookieHeader(createSessionToken(access.username, access))
  );
  await logActivity({
    area: "admin",
    action: "login",
    username: access.username,
    detail: `Signed in to the admin console as ${access.roleName}`,
    request,
  });
  return response;
}
