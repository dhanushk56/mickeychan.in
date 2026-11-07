import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { kvGet, kvSet } from "@/lib/kv";
import { verifySessionToken, isAllowedDiscordId, sessionCookieName } from "@/lib/discord-auth";

const VIDEOS_KEY = "content:videos";
const SUBMISSIONS_KEY = "submissions:join";
const FORM_KEY = "content:form";

function isAuthorizedRequest() {
  const token = cookies().get(sessionCookieName())?.value;
  const session = verifySessionToken(token);
  return Boolean(session && isAllowedDiscordId(session.id));
}

export async function GET() {
  if (!isAuthorizedRequest()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [videos, submissions, form] = await Promise.all([
    kvGet(VIDEOS_KEY, []),
    kvGet(SUBMISSIONS_KEY, []),
    kvGet(FORM_KEY, {}),
  ]);
  return NextResponse.json({ videos, submissions, form });
}

export async function PUT(request) {
  if (!isAuthorizedRequest()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  if (!Array.isArray(body.videos) || !body.form || typeof body.form !== "object") {
    return NextResponse.json({ error: "Invalid content payload." }, { status: 400 });
  }
  await Promise.all([kvSet(VIDEOS_KEY, body.videos), kvSet(FORM_KEY, body.form)]);
  return NextResponse.json({ ok: true, videos: body.videos, form: body.form });
}
