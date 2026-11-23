import { NextResponse } from "next/server";
import { kvGet, kvSet } from "@/lib/kv";
import { emptyForm } from "@/lib/form-builder/schema";
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

  const id = crypto.randomUUID().slice(0, 8);
  const now = new Date().toISOString();
  const form = { ...emptyForm(), id, title: "Untitled form", published: false };

  await kvSet(`formbuilder:form:${id}`, form);

  const index = await kvGet(INDEX_KEY, []);
  index.unshift({ id, title: form.title, published: false, createdAt: now, updatedAt: now });
  await kvSet(INDEX_KEY, index);

  await logActivity({
    area: "admin",
    action: "form-created",
    username: (await getSessionFromCookies())?.user?.username || "Admin",
    detail: `Created a new form (/${id}), saved as a draft`,
    request,
  });

  return NextResponse.json({ id });
}
