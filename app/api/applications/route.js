import { NextResponse } from "next/server";
import { kvGet, kvSet } from "@/lib/kv";
import { validateResponses } from "@/lib/form-builder/schema";

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
  const body = await request.json();
  const formId = typeof body.formId === "string" ? body.formId : "";
  const responses = body && typeof body.responses === "object" ? body.responses : null;

  if (!formId || !responses) {
    return NextResponse.json({ error: "Missing form or responses." }, { status: 400 });
  }

  const form = await kvGet(`formbuilder:form:${formId}`, null);
  if (!form) {
    return NextResponse.json({ error: "This form is no longer available." }, { status: 404 });
  }

  const errors = validateResponses(form, responses);
  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ error: "Please fill in all required questions." }, { status: 400 });
  }

  const submissionsKey = `submissions:applications:${formId}`;
  const submissions = await kvGet(submissionsKey, []);
  submissions.unshift({
    id: crypto.randomUUID(),
    formId,
    formTitle: form.title,
    questions: flattenQuestions(form),
    responses,
    createdAt: new Date().toISOString(),
  });
  await kvSet(submissionsKey, submissions);

  return NextResponse.json({ ok: true });
}
