import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { deleteMember, setMemberPassword } from "@/lib/members";

export const dynamic = "force-dynamic";

// Protected — set any account's password. That also invalidates the account's
// existing sessions, so the person has to log in again with the new password.
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

  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}

// Protected — delete any account. Their applications stay on file so the review
// history survives; they simply can't log in or apply again.
export async function DELETE(request, { params }) {
  if (!getSessionFromCookies()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await deleteMember(decodeURIComponent(params.username));
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
