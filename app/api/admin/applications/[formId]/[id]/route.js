import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { kvGet, kvSet } from "@/lib/kv";
import { verifySessionToken, isAllowedDiscordId, sessionCookieName } from "@/lib/discord-auth";

function isAuthorizedRequest() {
  const token = cookies().get(sessionCookieName())?.value;
  const session = verifySessionToken(token);
  return Boolean(session && isAllowedDiscordId(session.id));
}

export async function PATCH(request, { params }) {
  if (!isAuthorizedRequest()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { status } = body;

  if (!status || !["pending", "accepted", "denied"].includes(status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const submissionsKey = `submissions:applications:${params.formId}`;
  const submissions = await kvGet(submissionsKey, []);

  const index = submissions.findIndex((s) => s.id === params.id);
  if (index === -1) {
    return NextResponse.json({ error: "Application not found." }, { status: 404 });
  }

  submissions[index] = { ...submissions[index], status };
  await kvSet(submissionsKey, submissions);

  return NextResponse.json({ ok: true });
}
