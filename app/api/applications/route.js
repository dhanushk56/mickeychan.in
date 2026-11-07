import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { kvGet, kvSet } from "@/lib/kv";
import { validateResponses } from "@/lib/form-builder/schema";
import { memberFromCookieStore } from "@/lib/members";
import { STATUS_TEXT, applicationGate, memberSubmission, submissionsKey } from "@/lib/applications";

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
  // Every application belongs to a signed-in account: that's what makes
  // "one application per person" enforceable.
  const member = memberFromCookieStore(cookies());
  if (!member) {
    return NextResponse.json({ error: "Please log in to submit an application." }, { status: 401 });
  }

  // Same-origin guard that also works behind a proxy, where request.url still
  // points at the internal server rather than the public host.
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
      /* ignore */
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

  const key = submissionsKey(formId);
  const submissions = await kvGet(key, []);
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
    return NextResponse.json({ error: "Please fill in all required questions." }, { status: 400 });
  }

  submissions.unshift({
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
  await kvSet(key, submissions);

  return NextResponse.json({ ok: true });
}
