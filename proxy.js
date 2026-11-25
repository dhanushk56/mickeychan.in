import { NextResponse } from "next/server";

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

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

export default function proxy(request) {
  const headers = new Headers(request.headers);
  // The layout reads this to keep the console and the sign in pages open while
  // maintenance mode is on. It is always overwritten, so a visitor cannot choose
  // which path skips the gate.
  headers.set("x-mc-path", request.nextUrl.pathname);

  if (MUTATING.has(request.method) && !sameOrigin(request)) {
    return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  }

  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/((?!_next/|.*\\..*).*)"],
};
