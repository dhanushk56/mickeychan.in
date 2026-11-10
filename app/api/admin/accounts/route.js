import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { listMembers, publicMember, registerMember } from "@/lib/members";
import { logActivity } from "@/lib/activity-log";

export const dynamic = "force-dynamic";

function actor() {
  return getSessionFromCookies()?.user?.username || "Admin";
}

export async function GET() {
  if (!getSessionFromCookies()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(
    { accounts: await listMembers() },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}

export async function POST(request) {
  if (!getSessionFromCookies()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const username = typeof body.username === "string" ? body.username : "";
  const password = typeof body.password === "string" ? body.password : "";
  const name = typeof body.name === "string" ? body.name : "";

  const result = await registerMember({
    username,
    name,
    password,
    allowSharedIp: true,
    createdBy: "admin",
  });

  if (result.error) {
    const taken = result.error.includes("already taken");
    return NextResponse.json({ error: result.error }, { status: taken ? 409 : 400 });
  }

  await logActivity({
    area: "admin",
    action: "account-created",
    username: actor(),
    detail: `Created the account @${result.member.username}`,
    request,
  });

  return NextResponse.json(
    { ok: true, member: publicMember(result.member) },
    { status: 201, headers: { "Cache-Control": "no-store" } }
  );
}
