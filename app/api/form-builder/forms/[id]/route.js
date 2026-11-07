import { NextResponse } from "next/server";
import { kvGet, kvSet, kvDel } from "@/lib/kv";
import { getSessionFromCookies } from "@/lib/auth";

const INDEX_KEY = "formbuilder:index";

function isAuthorizedRequest() {
  return Boolean(getSessionFromCookies());
}

export const dynamic = "force-dynamic";

// Public — the /form-builder/apply/[id] page needs to read this form.
export async function GET(request, { params }) {
  const form = await kvGet(`formbuilder:form:${params.id}`, null);
  if (!form) {
    return NextResponse.json(null, { status: 404 });
  }
  return NextResponse.json(form, { headers: { "Cache-Control": "no-store" } });
}

// Protected — requires a valid admin password session.
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

  const form = {
    ...body,
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

  return NextResponse.json({ ok: true, form }, { headers: { "Cache-Control": "no-store" } });
}

// Protected — removes a form from the list. Its past submissions are kept.
export async function DELETE(request, { params }) {
  if (!isAuthorizedRequest()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await kvDel(`formbuilder:form:${params.id}`);
  const index = await kvGet(INDEX_KEY, []);
  await kvSet(INDEX_KEY, index.filter((entry) => entry.id !== params.id));

  return NextResponse.json({ ok: true });
}
