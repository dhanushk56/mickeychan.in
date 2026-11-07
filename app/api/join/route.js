import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { kvGet, kvSet } from "@/lib/kv";
import { memberFromCookieStore } from "@/lib/members";

const SUBMISSIONS_KEY = "submissions:join";

export const dynamic = "force-dynamic";

// Proxy-aware same-origin check (request.url still points at the internal
// server behind a tunnel/custom domain).
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
    /* ignore */
  }
  return candidates.filter(Boolean).includes(originHost);
}

export async function POST(request) {
  // Every message is tied to a signed-in account so the team always knows who
  // they're replying to.
  const member = await memberFromCookieStore(cookies());
  if (!member) {
    return NextResponse.json({ error: "Please log in to send a message." }, { status: 401 });
  }

  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const role = typeof body.role === "string" ? body.role.trim() : "Community";
  if (!name || !email || !message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Please provide a valid name, email, and message." }, { status: 400 });
  }

  const submissions = await kvGet(SUBMISSIONS_KEY, []);
  submissions.unshift({
    id: crypto.randomUUID(),
    memberUsername: member.username,
    memberName: member.name,
    name,
    email,
    role,
    message,
    createdAt: new Date().toISOString(),
  });
  await kvSet(SUBMISSIONS_KEY, submissions);

  return NextResponse.json({ ok: true });
}
