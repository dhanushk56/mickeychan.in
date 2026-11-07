import { NextResponse } from "next/server";
import { kvGet, kvSet } from "@/lib/kv";
import { getSessionFromCookies } from "@/lib/auth";
import { submissionsKey } from "@/lib/applications";

function readSession() {
  return getSessionFromCookies();
}

export const dynamic = "force-dynamic";

// Protected — updates one application's review status within its form's list.
export async function PATCH(request, { params }) {
  const session = readSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const status = typeof body.status === "string" ? body.status : "";
  if (!["pending", "accepted", "denied"].includes(status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const key = submissionsKey(params.formId);
  const submissions = await kvGet(key, []);
  const index = submissions.findIndex((entry) => entry.id === params.id);
  if (index === -1) {
    return NextResponse.json({ error: "Application not found." }, { status: 404 });
  }

  submissions[index] = {
    ...submissions[index],
    status,
    reviewedAt: status === "pending" ? null : new Date().toISOString(),
    reviewedBy: status === "pending" ? null : session.user.username,
  };
  await kvSet(key, submissions);

  return NextResponse.json(
    { ok: true, application: submissions[index] },
    { headers: { "Cache-Control": "no-store" } }
  );
}

// Protected — deletes one application. That also lifts the one-application
// lock, so the person is free to apply again.
export async function DELETE(request, { params }) {
  const session = readSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const key = submissionsKey(params.formId);
  const submissions = await kvGet(key, []);
  const next = submissions.filter((entry) => entry.id !== params.id);
  if (next.length === submissions.length) {
    return NextResponse.json({ error: "Application not found." }, { status: 404 });
  }

  await kvSet(key, next);
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
