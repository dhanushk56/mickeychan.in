import { NextResponse } from "next/server";
import { kvGet, kvSet, kvDel } from "@/lib/kv";
import { getSessionFromCookies } from "@/lib/auth";
import { formChangeSummary, logActivity } from "@/lib/activity-log";
import { normalizeRichText } from "@/lib/rich-text";

const INDEX_KEY = "formbuilder:index";

function actor() {
  return getSessionFromCookies()?.user?.username || "Admin";
}

function isAuthorizedRequest() {
  return Boolean(getSessionFromCookies());
}

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const form = await kvGet(`formbuilder:form:${params.id}`, null);
  if (!form) {
    return NextResponse.json(null, { status: 404 });
  }
  return NextResponse.json(form, { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(request, { params }) {
  if (!isAuthorizedRequest()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.title !== "string" || !Array.isArray(body.sections)) {
    return NextResponse.json({ error: "Invalid form schema." }, { status: 400 });
  }

  const existing = await kvGet(`formbuilder:form:${params.id}`, null);
  if (!existing) {
    return NextResponse.json({ error: "Form not found." }, { status: 404 });
  }

  const sections = body.sections.slice(0, 60).map((section) => ({
    ...section,
    description: normalizeRichText(section?.description),
    questions: (Array.isArray(section?.questions) ? section.questions : [])
      .slice(0, 100)
      .map((question) => ({ ...question, description: normalizeRichText(question?.description) })),
  }));

  const form = {
    ...body,
    description: normalizeRichText(body.description),
    sections,
    id: params.id,
    published: Boolean(body.published),
    createdAt: existing.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await kvSet(`formbuilder:form:${params.id}`, form);

  const index = await kvGet(INDEX_KEY, []);
  const now = form.updatedAt;
  const updatedIndex = index.some((entry) => entry.id === params.id)
    ? index.map((entry) =>
        entry.id === params.id
          ? { ...entry, title: form.title, published: form.published, updatedAt: now }
          : entry
      )
    : [
        { id: params.id, title: form.title, published: form.published, createdAt: now, updatedAt: now },
        ...index,
      ];

  await kvSet(INDEX_KEY, updatedIndex);

  await logActivity({
    area: "admin",
    action: "form-saved",
    username: actor(),
    detail: `Edited “${form.title || "Untitled form"}”: ${formChangeSummary(existing, form)}`,
    request,
  });

  return NextResponse.json({ ok: true, form }, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(request, { params }) {
  if (!isAuthorizedRequest()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await kvGet(`formbuilder:form:${params.id}`, null);
  await kvDel(`formbuilder:form:${params.id}`);
  const index = await kvGet(INDEX_KEY, []);
  await kvSet(INDEX_KEY, index.filter((entry) => entry.id !== params.id));

  await logActivity({
    area: "admin",
    action: "form-deleted",
    username: actor(),
    detail: `Deleted the form “${existing?.title || params.id}”`,
    request,
  });

  return NextResponse.json({ ok: true });
}
