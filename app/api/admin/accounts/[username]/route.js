import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { deleteMember, setMemberPassword } from "@/lib/members";
import { logActivity } from "@/lib/activity-log";

export const dynamic = "force-dynamic";

function actor() {
  return getSessionFromCookies()?.user?.username || "Admin";
}

export async function PATCH(request, { params }) {
  if (!getSessionFromCookies()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const password = typeof body.password === "string" ? body.password : "";

  const result = await setMemberPassword(decodeURIComponent(params.username), password);
  if (result.error) {
    const missing = result.error.startsWith("No account");
    return NextResponse.json({ error: result.error }, { status: missing ? 404 : 400 });
  }

  await logActivity({
    area: "admin",
    action: "account-password",
    username: actor(),
    detail: `Changed the password for @${decodeURIComponent(params.username)}`,
    request,
  });

  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(request, { params }) {
  if (!getSessionFromCookies()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await deleteMember(decodeURIComponent(params.username));
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  await logActivity({
    area: "admin",
    action: "account-deleted",
    username: actor(),
    detail: `Deleted the account @${result.member.username}`,
    request,
  });

  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
