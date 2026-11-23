import { NextResponse } from "next/server";
import { kvGet, kvSet, kvDel } from "@/lib/kv";
import { getSessionFromCookies } from "@/lib/auth";
import { authorize } from "@/lib/admin-guard";
import { formChangeSummary, logActivity } from "@/lib/activity-log";
import { normalizeRichText } from "@/lib/rich-text";

const INDEX_KEY = "formbuilder:index";

async function actor() {
  return (await getSessionFromCookies())?.user?.username || "Admin";
}

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const { id } = await params;
  const gate = await authorize("forms.view");
  if (gate.response) return gate.response;

  const form = await kvGet(`formbuilder:form:${id}`, null);
  if (!form) {
    return NextResponse.json(null, { status: 404 });
  }
  return NextResponse.json(form, { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(request, { params }) {
  const { id } = await params;
  const gate = await authorize("forms.edit");
  if (gate.response) return gate.response;

  const body = await request.json().catch(() => null);
  if (!body || typeof body.title !== "string" || !Array.isArray(body.sections)) {
    return NextResponse.json({ error: "Invalid form schema." }, { status: 400 });
  }

  const existing = await kvGet(`formbuilder:form:${id}`, null);
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
    id: id,
    published: Boolean(body.published),
    createdAt: existing.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await kvSet(`formbuilder:form:${id}`, form);

  const index = await kvGet(INDEX_KEY, []);
  const now = form.updatedAt;
  const updatedIndex = index.some((entry) => entry.id === id)
    ? index.map((entry) =>
        entry.id === id
          ? { ...entry, title: form.title, published: form.published, updatedAt: now }
          : entry
      )
    : [
        { id: id, title: form.title, published: form.published, createdAt: now, updatedAt: now },
        ...index,
      ];

  await kvSet(INDEX_KEY, updatedIndex);

  await logActivity({
    area: "admin",
    action: "form-saved",
    username: await actor(),
    detail: `Edited “${form.title || "Untitled form"}”: ${formChangeSummary(existing, form)}`,
    request,
  });

  return NextResponse.json({ ok: true, form }, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const gate = await authorize("forms.delete");
  if (gate.response) return gate.response;

  const existing = await kvGet(`formbuilder:form:${id}`, null);
  await kvDel(`formbuilder:form:${id}`);
  const index = await kvGet(INDEX_KEY, []);
  await kvSet(INDEX_KEY, index.filter((entry) => entry.id !== id));

  await logActivity({
    area: "admin",
    action: "form-deleted",
    username: await actor(),
    detail: `Deleted the form “${existing?.title || id}”`,
    request,
  });

  return NextResponse.json({ ok: true });
}
