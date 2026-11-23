import { NextResponse } from "next/server";
import { clearSessionCookieHeader, getSessionFromCookies } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";

function sameOriginNavigation(request) {
  const site = request.headers.get("sec-fetch-site");
  if (site) return site === "same-origin";

  const referer = request.headers.get("referer");
  if (!referer) return false;
  try {
    const refererHost = new URL(referer).host;
    const hosts = [request.headers.get("host"), request.headers.get("x-forwarded-host")];
    try {
      hosts.push(new URL(request.url).host);
    } catch {
      return false;
    }
    return hosts.filter(Boolean).includes(refererHost);
  } catch {
    return false;
  }
}

async function endSession(request, response) {
  const session = await getSessionFromCookies();
  response.headers.append("Set-Cookie", clearSessionCookieHeader());
  await logActivity({
    area: "admin",
    action: "logout",
    username: session?.user?.username || "Unknown",
    detail: "Locked the admin console",
    request,
  });
  return response;
}

export async function GET(request) {
  if (!sameOriginNavigation(request)) {
    return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  }
  return endSession(request, NextResponse.redirect(new URL("/", request.url)));
}

export async function POST(request) {
  return endSession(
    request,
    NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } })
  );
}
