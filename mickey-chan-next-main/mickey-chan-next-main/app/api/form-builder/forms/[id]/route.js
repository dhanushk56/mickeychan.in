import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { kvGet, kvSet, kvDel } from "@/lib/kv";
import { verifySessionToken, isAllowedDiscordId, sessionCookieName } from "@/lib/discord-auth";

const INDEX_KEY = "formbuilder:index";

function isAuthorizedRequest() {
  const token = cookies().get(sessionCookieName())?.value;
  const session = verifySessionToken(token);
  return Boolean(session && isAllowedDiscordId(session.id));
}

// Public — the public /form-builder/apply/[id] page needs to read this form.
export async function GET(request, { params }) {
  const form = await kvGet(`formbuilder:form:${params.id}`, null);
  if (!form) {
    return NextResponse.json(null, { status: 404 });
  }
  return NextResponse.json(form);
}

// Protected — only whitelisted Discord accounts can publish changes.
export async function PUT(request, { params }) {
  if (!isAuthorizedRequest()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  if (!body || typeof body.title !== "string" || !Array.isArray(body.sections)) {
    return NextResponse.json({ error: "Invalid form schema." }, { status: 400 });
  }

  const form = { ...body, id: params.id };
  await kvSet(`formbuilder:form:${params.id}`, form);

  const index = await kvGet(INDEX_KEY, []);
  const now = new Date().toISOString();
  const updatedIndex = index.some((entry) => entry.id === params.id)
    ? index.map((entry) =>
        entry.id === params.id ? { ...entry, title: form.title, updatedAt: now } : entry
      )
    : [{ id: params.id, title: form.title, createdAt: now, updatedAt: now }, ...index];

  await kvSet(INDEX_KEY, updatedIndex);

  return NextResponse.json({ ok: true });
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
