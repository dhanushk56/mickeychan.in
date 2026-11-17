import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { can, resolveAdmin } from "@/lib/roles";

function denied(message, status) {
  return { response: NextResponse.json({ error: message }, { status }) };
}

export async function authorize(permission) {
  const session = getSessionFromCookies();
  if (!session) return denied("Unauthorized", 401);
  const access = await resolveAdmin(session.user.username);
  if (!access) return denied("Your admin access has been removed.", 403);
  if (permission && !can(access, permission)) {
    return denied("Your role doesn't allow that.", 403);
  }
  return { session, access };
}

export async function authorizeAny(permissions) {
  const session = getSessionFromCookies();
  if (!session) return denied("Unauthorized", 401);
  const access = await resolveAdmin(session.user.username);
  if (!access) return denied("Your admin access has been removed.", 403);
  const list = Array.isArray(permissions) ? permissions : [permissions];
  if (!list.some((permission) => can(access, permission))) {
    return denied("Your role doesn't allow that.", 403);
  }
  return { session, access };
}
