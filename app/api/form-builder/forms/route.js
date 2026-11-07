import { NextResponse } from "next/server";
import { kvGet, kvSet } from "@/lib/kv";
import { emptyForm } from "@/lib/form-builder/schema";
import { getSessionFromCookies } from "@/lib/auth";

const INDEX_KEY = "formbuilder:index";

function isAuthorizedRequest() {
  return Boolean(getSessionFromCookies());
}

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isAuthorizedRequest()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const index = await kvGet(INDEX_KEY, []);
  return NextResponse.json(index, { headers: { "Cache-Control": "no-store" } });
}

export async function POST() {
  if (!isAuthorizedRequest()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = crypto.randomUUID().slice(0, 8);
  const now = new Date().toISOString();
  const form = { ...emptyForm(), id, title: "Untitled form", published: true };

  await kvSet(`formbuilder:form:${id}`, form);

  const index = await kvGet(INDEX_KEY, []);
  index.unshift({ id, title: form.title, published: true, createdAt: now, updatedAt: now });
  await kvSet(INDEX_KEY, index);

  return NextResponse.json({ id });
}
