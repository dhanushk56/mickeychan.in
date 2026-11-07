import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { kvGet, kvSet } from "@/lib/kv";
import { emptyForm } from "@/lib/form-builder/schema";
import { verifySessionToken, isAllowedDiscordId, sessionCookieName } from "@/lib/discord-auth";

const INDEX_KEY = "formbuilder:index";

function isAuthorizedRequest() {
  const token = cookies().get(sessionCookieName())?.value;
  const session = verifySessionToken(token);
  return Boolean(session && isAllowedDiscordId(session.id));
}

export async function GET() {
  if (!isAuthorizedRequest()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const index = await kvGet(INDEX_KEY, []);
  return NextResponse.json(index);
}

export async function POST() {
  if (!isAuthorizedRequest()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = crypto.randomUUID().slice(0, 8);
  const now = new Date().toISOString();
  const form = { ...emptyForm(), id, title: "Untitled form" };

  await kvSet(`formbuilder:form:${id}`, form);

  const index = await kvGet(INDEX_KEY, []);
  index.unshift({ id, title: form.title, createdAt: now, updatedAt: now });
  await kvSet(INDEX_KEY, index);

  return NextResponse.json({ id });
}
