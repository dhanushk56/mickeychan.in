import { NextResponse } from "next/server";
import { kvGet, kvSet } from "@/lib/kv";

const SUBMISSIONS_KEY = "submissions:join";

export async function POST(request) {
  const body = await request.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const role = typeof body.role === "string" ? body.role.trim() : "Community";
  if (!name || !email || !message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Please provide a valid name, email, and message." }, { status: 400 });
  }
  const submissions = await kvGet(SUBMISSIONS_KEY, []);
  submissions.unshift({ id: crypto.randomUUID(), name, email, role, message, createdAt: new Date().toISOString() });
  await kvSet(SUBMISSIONS_KEY, submissions);
  return NextResponse.json({ ok: true });
}
