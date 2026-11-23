import { NextResponse } from "next/server";
import { authorize } from "@/lib/admin-guard";
import { listMembers, publicMember, registerMember } from "@/lib/members";
import { annotateBlacklist } from "@/lib/blacklist";
import { logActivity } from "@/lib/activity-log";

export const dynamic = "force-dynamic";

export async function GET() {
  const gate = await authorize("accounts.view");
  if (gate.response) return gate.response;

  return NextResponse.json(
    { accounts: await annotateBlacklist(await listMembers()) },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}

export async function POST(request) {
  const gate = await authorize("accounts.create");
  if (gate.response) return gate.response;

  const body = await request.json().catch(() => ({}));
  const username = typeof body.username === "string" ? body.username : "";
  const password = typeof body.password === "string" ? body.password : "";
  const name = typeof body.name === "string" ? body.name : "";
  const email = typeof body.email === "string" ? body.email : "";
  const phone = typeof body.phone === "string" ? body.phone : "";
  const emailVerified = body.emailVerified === true;

  const result = await registerMember({
    username,
    name,
    email,
    phone,
    password,
    emailVerified,
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
    username: gate.access.username,
    detail: `Created the account @${result.member.username}`,
    request,
  });

  return NextResponse.json(
    { ok: true, member: publicMember(result.member) },
    { status: 201, headers: { "Cache-Control": "no-store" } }
  );
}
