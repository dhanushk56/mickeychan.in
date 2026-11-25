import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { kvGet } from "@/lib/kv";
import { validateResponses } from "@/lib/form-builder/schema";
import { memberFromCookieStore } from "@/lib/members";
import {
  STATUS_TEXT,
  applicationGate,
  listSubmissions,
  memberSubmission,
  saveSubmission,
} from "@/lib/applications";
import { logActivity } from "@/lib/activity-log";
import { EMAIL_VERIFICATION_REQUIRED } from "@/lib/features";
import { blacklistEntry } from "@/lib/blacklist";
import { CLOSED_ERROR, submissionsClosed } from "@/lib/maintenance";

export const dynamic = "force-dynamic";

function flattenQuestions(form) {
  const list = [];
  for (const section of form.sections || []) {
    for (const q of section.questions || []) {
      list.push({ id: q.id, title: q.title || "Untitled question" });
    }
  }
  return list;
}

export async function POST(request) {
  if (await submissionsClosed()) {
    return NextResponse.json({ error: CLOSED_ERROR }, { status: 503 });
  }

  const member = await memberFromCookieStore(cookies());
  if (!member) {
    return NextResponse.json({ error: "Please log in to submit an application." }, { status: 401 });
  }

  if (EMAIL_VERIFICATION_REQUIRED && member.emailVerified !== true) {
    return NextResponse.json(
      {
        error: "Confirm your email address before applying. Open Verify your account from the menu.",
        code: "email_unverified",
      },
      { status: 403 }
    );
  }

  const block = await blacklistEntry(member.username);
  if (block) {
    await logActivity({
      area: "website",
      action: "form-blocked",
      username: member.username,
      detail: "Blocked: this account can't submit forms",
      ok: false,
      request,
    });
    return NextResponse.json(
      {
        error: "Your account can't submit forms right now. Contact the team if you think this is a mistake.",
        code: "blacklisted",
      },
      { status: 403 }
    );
  }

  const origin = request.headers.get("origin");
  if (origin) {
    let originHost;
    try {
      originHost = new URL(origin).host;
    } catch {
      return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
    }
    const hosts = [request.headers.get("host"), request.headers.get("x-forwarded-host")];
    try {
      hosts.push(new URL(request.url).host);
    } catch {
    }
    if (!hosts.filter(Boolean).includes(originHost)) {
      return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
    }
  }

  const body = await request.json().catch(() => ({}));
  const formId = typeof body.formId === "string" ? body.formId : "";
  const responses = body && typeof body.responses === "object" ? body.responses : null;

  if (!formId || !responses) {
    return NextResponse.json({ error: "Missing form or responses." }, { status: 400 });
  }

  const form = await kvGet(`formbuilder:form:${formId}`, null);
  if (!form) {
    return NextResponse.json({ error: "This form is no longer available." }, { status: 404 });
  }

  if (form.published === false) {
    return NextResponse.json({ error: "This form isn't open right now." }, { status: 409 });
  }

  const submissions = await listSubmissions(formId);
  const gate = applicationGate(form, memberSubmission(submissions, member.username));

  if (!gate.canApply) {
    const available = gate.availableAt
      ? new Date(gate.availableAt).toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
          hour12: true,
        })
      : null;
    const message =
      gate.status === "denied"
        ? `${STATUS_TEXT.denied}${available ? ` You can reapply after ${available}.` : ""}`
        : STATUS_TEXT[gate.status] || "You've already applied to this role.";
    return NextResponse.json(
      { error: message, status: gate.status, availableAt: gate.availableAt },
      { status: 409 }
    );
  }

  const errors = validateResponses(form, responses);
  if (Object.keys(errors).length > 0) {
    return NextResponse.json(
      { error: Object.values(errors)[0], errors },
      { status: 400 }
    );
  }

  await saveSubmission(formId, {
    id: crypto.randomUUID(),
    formId,
    formTitle: form.title,
    questions: flattenQuestions(form),
    responses,
    status: "pending",
    createdAt: new Date().toISOString(),
    memberUsername: member.username,
    memberName: member.name,
  });

  await logActivity({
    area: "website",
    action: "application",
    username: member.username,
    detail: `Submitted an application for "${form.title || formId}"`,
    request,
  });

  return NextResponse.json({ ok: true });
}
