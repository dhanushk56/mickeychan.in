import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { memberFromCookieStore } from "@/lib/members";
import { readProfileSettings, saveProfileSettings } from "@/lib/profile";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

function reply(body, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

async function currentUsername() {
  const session = await memberFromCookieStore(cookies());
  return session ? session.username : null;
}

export async function GET() {
  const username = await currentUsername();
  if (!username) return reply({ error: "Log in to manage your profile." }, 401);
  return reply({ ok: true, settings: await readProfileSettings(username) });
}

export async function POST(request) {
  const username = await currentUsername();
  if (!username) return reply({ error: "Log in to manage your profile." }, 401);

  const body = await request.json().catch(() => ({}));
  if (typeof body?.visible !== "boolean") {
    return reply({ error: "Say whether the profile should be public." }, 400);
  }

  const settings = await saveProfileSettings(username, { profileVisible: body.visible });
  return reply({ ok: true, settings });
}
