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
  if (!MUTATING.has(request.method)) return NextResponse.next();
  if (sameOrigin(request)) return NextResponse.next();
  return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
}

export const config = { matcher: "/api/:path*" };
