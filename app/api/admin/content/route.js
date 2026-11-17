import { NextResponse } from "next/server";
import { kvGet, kvSet } from "@/lib/kv";
import { authorize } from "@/lib/admin-guard";
import { logActivity } from "@/lib/activity-log";

const VIDEOS_KEY = "content:videos";
const SUBMISSIONS_KEY = "submissions:join";
const FORM_KEY = "content:form";

export async function GET() {
  const gate = await authorize("content.view");
  if (gate.response) return gate.response;
  const [videos, submissions, form] = await Promise.all([
    kvGet(VIDEOS_KEY, []),
    kvGet(SUBMISSIONS_KEY, []),
    kvGet(FORM_KEY, {}),
  ]);
  return NextResponse.json({ videos, submissions, form });
}

export async function PUT(request) {
  const gate = await authorize("content.edit");
  if (gate.response) return gate.response;
  const body = await request.json();
  if (!Array.isArray(body.videos) || !body.form || typeof body.form !== "object") {
    return NextResponse.json({ error: "Invalid content payload." }, { status: 400 });
  }
  await Promise.all([kvSet(VIDEOS_KEY, body.videos), kvSet(FORM_KEY, body.form)]);

  await logActivity({
    area: "admin",
    action: "content",
    username: gate.access.username,
    detail: `Updated site content (${body.videos.length} video${body.videos.length === 1 ? "" : "s"} and the join form)`,
    request,
  });

  return NextResponse.json({ ok: true, videos: body.videos, form: body.form });
}
