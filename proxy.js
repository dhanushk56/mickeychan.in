import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth";
import { getMaintenance, isOpenPath, sessionCanBypass } from "@/lib/maintenance";

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// Signing in and the nightly snapshot have to keep working while the site is
// closed, otherwise staff cannot get back in and turn it off.
const OPEN_API = ["/api/auth/", "/api/cron/"];

function hostOf(value) {
  try {
    return new URL(value).host;
  } catch {
    return "";
  }
}

function sameOrigin(request) {
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") return false;

  const origin = request.headers.get("origin");
  // Browsers always send Origin on a mutating request. No Origin means a
  // script, a webhook or a server calling the API directly.
  if (!origin) return true;

  const host = hostOf(origin);
  if (!host) return false;

  const candidates = [request.headers.get("host"), request.headers.get("x-forwarded-host")];
  try {
    candidates.push(new URL(request.url).host);
  } catch {
  }
  return candidates.filter(Boolean).includes(host);
}

export default async function proxy(request) {
  const headers = new Headers(request.headers);
  // The layout reads this to keep the console and the sign in pages open while
  // maintenance mode is on. It is always overwritten, so a visitor cannot choose
  // which path skips the gate.
  headers.set("x-mc-path", request.nextUrl.pathname);

  if (MUTATING.has(request.method) && !sameOrigin(request)) {
    return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  }

  const { pathname } = request.nextUrl;
  const maintenance = await getMaintenance();

  if (maintenance.enabled && !isOpenPath(pathname)) {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const bypass = await sessionCanBypass(token);

    if (!bypass) {
      if (pathname.startsWith("/api/") && !OPEN_API.some((prefix) => pathname.startsWith(prefix))) {
        return NextResponse.json(
          { error: "The site is closed for maintenance right now. Try again later." },
          { status: 503, headers: { "Cache-Control": "no-store, max-age=0" } }
        );
      }
      if (!pathname.startsWith("/api/")) {
        return NextResponse.rewrite(new URL("/maintenance", request.url), {
          request: { headers },
          headers: { "Cache-Control": "no-store, max-age=0" },
        });
      }
    }
  }

  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/((?!_next/|.*\\..*).*)"],
};
