import { NextResponse } from "next/server";
import { refreshPublic } from "@/lib/revalidate";
import { kvGet, kvSet } from "@/lib/kv";
import { emptyForm } from "@/lib/form-builder/schema";
import { duplicateForm, formFromTemplate } from "@/lib/form-builder/templates";
import { getSessionFromCookies } from "@/lib/auth";
import { authorize } from "@/lib/admin-guard";
import { logActivity } from "@/lib/activity-log";

const INDEX_KEY = "formbuilder:index";

export const dynamic = "force-dynamic";

export async function GET() {
  const gate = await authorize("forms.view");
  if (gate.response) return gate.response;

  const index = await kvGet(INDEX_KEY, []);
  return NextResponse.json(index, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request) {
  const gate = await authorize("forms.create");
  if (gate.response) return gate.response;

  const body = await request.json().catch(() => null);
  let form = null;
  let source = "";

  if (body && typeof body.templateId === "string") {
    form = formFromTemplate(body.templateId);
    if (!form) {
      return NextResponse.json({ error: "That template is not available." }, { status: 400 });
    }
    source = " from a template";
  } else if (body && typeof body.fromFormId === "string") {
    const original = await kvGet(`formbuilder:form:${body.fromFormId}`, null);
    if (!original) {
      return NextResponse.json({ error: "That form is gone already." }, { status: 404 });
    }
    form = duplicateForm(original);
    source = ` as a copy of "${original.title || "Untitled form"}"`;
  }

  if (!form) form = emptyForm();

  const id = crypto.randomUUID().slice(0, 8);
  const now = new Date().toISOString();
  form = { ...form, id, title: form.title || "Untitled form", published: false, createdAt: now, updatedAt: now };

  await kvSet(`formbuilder:form:${id}`, form);

  const index = await kvGet(INDEX_KEY, []);
  index.unshift({ id, title: form.title, published: false, createdAt: now, updatedAt: now });
  await kvSet(INDEX_KEY, index);
  refreshPublic("forms");

  await logActivity({
    area: "admin",
    action: "form-created",
    username: (await getSessionFromCookies())?.user?.username || "Admin",
    detail: `Created a new form (/${id})${source}, saved as a draft`,
    request,
  });

  return NextResponse.json({ id });
}
