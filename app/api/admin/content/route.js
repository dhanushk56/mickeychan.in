import { NextResponse } from "next/server";
import { kvGet, kvSet } from "@/lib/kv";
import { getSessionFromCookies } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";

const VIDEOS_KEY = "content:videos";
const SUBMISSIONS_KEY = "submissions:join";
const FORM_KEY = "content:form";

function isAuthorizedRequest() {
  return Boolean(getSessionFromCookies());
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

  await logActivity({
    area: "admin",
    action: "content",
    username: getSessionFromCookies()?.user?.username || "Admin",
    detail: `Updated site content (${body.videos.length} video${body.videos.length === 1 ? "" : "s"} and the join form)`,
    request,
  });

  return NextResponse.json({ ok: true, videos: body.videos, form: body.form });
}
