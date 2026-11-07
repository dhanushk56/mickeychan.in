import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { kvGet, kvSet } from "@/lib/kv";
import { verifySessionToken, isAllowedDiscordId, sessionCookieName } from "@/lib/discord-auth";

const ALLOWED_STATUSES = ["pending", "accepted", "denied"];

function isAuthorizedRequest() {
  const token = cookies().get(sessionCookieName())?.value;
  const session = verifySessionToken(token);
  return Boolean(session && isAllowedDiscordId(session.id));
}

// Protected — updates one application's status within its form's submissions list.
export async function PATCH(request, { params }) {
  if (!isAuthorizedRequest()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const status = typeof body.status === "string" ? body.status : "";
  if (!ALLOWED_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const key = `submissions:applications:${params.formId}`;
  const submissions = await kvGet(key, []);
  const index = submissions.findIndex((entry) => entry.id === params.submissionId);
  if (index === -1) {
    return NextResponse.json({ error: "Submission not found." }, { status: 404 });
  }

  submissions[index] = { ...submissions[index], status };
  await kvSet(key, submissions);

  return NextResponse.json({ ok: true });
}
