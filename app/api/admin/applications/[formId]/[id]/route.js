import { NextResponse } from "next/server";
import { authorize } from "@/lib/admin-guard";
import {
  deleteSubmission,
  isValidStatus,
  listSubmissions,
  saveSubmission,
  withTimelineEvent,
} from "@/lib/applications";
import { logActivity } from "@/lib/activity-log";

export const dynamic = "force-dynamic";

export async function PATCH(request, { params }) {
  const { formId, id } = await params;
  const gate = await authorize("applications.review");
  if (gate.response) return gate.response;
  const session = gate.session;

  const body = await request.json().catch(() => ({}));
  const status = typeof body.status === "string" ? body.status : "";
  if (!isValidStatus(status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const note = typeof body.note === "string" ? body.note.trim().slice(0, 500) : "";

  const submissions = await listSubmissions(formId);
  const index = submissions.findIndex((entry) => entry.id === id);
  if (index === -1) {
    return NextResponse.json({ error: "Application not found." }, { status: 404 });
  }

  const at = new Date().toISOString();
  submissions[index] = {
    ...withTimelineEvent(submissions[index], {
      status,
      note,
      by: session.user.username,
      at,
    }),
    status,
    reviewNote: status === "pending" ? "" : note,
    reviewedAt: status === "pending" ? null : at,
    reviewedBy: status === "pending" ? null : session.user.username,
  };
  await saveSubmission(formId, submissions[index]);

  const applicant = submissions[index].memberUsername;
  await logActivity({
    area: "admin",
    action: "application-status",
    username: session.user.username,
    detail: `Marked ${applicant ? `@${applicant}'s` : "an applicant's"} application ` +
      `for “${submissions[index].formTitle || formId}” as ${status}`,
    request,
  });

  return NextResponse.json(
    { ok: true, application: submissions[index] },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function DELETE(request, { params }) {
  const { formId, id } = await params;
  const gate = await authorize("applications.delete");
  if (gate.response) return gate.response;
  const session = gate.session;

  const submissions = await listSubmissions(formId);
  const target = submissions.find((entry) => entry.id === id);
  const next = submissions.filter((entry) => entry.id !== id);
  if (next.length === submissions.length) {
    return NextResponse.json({ error: "Application not found." }, { status: 404 });
  }

  await deleteSubmission(formId, id);

  await logActivity({
    area: "admin",
    action: "application-deleted",
    username: session.user.username,
    detail: `Deleted ${target?.memberUsername ? `@${target.memberUsername}'s` : "an applicant's"} ` +
      `application for “${target?.formTitle || formId}”`,
    request,
  });

  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
