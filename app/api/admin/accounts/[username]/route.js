import { NextResponse } from "next/server";
import { authorize } from "@/lib/admin-guard";
import { deleteMember, setMemberPassword } from "@/lib/members";
import { isOwnerAccount, isRootOwner } from "@/lib/roles";
import { logActivity } from "@/lib/activity-log";

export const dynamic = "force-dynamic";

export async function PATCH(request, { params }) {
  const gate = await authorize("accounts.password");
  if (gate.response) return gate.response;

  const target = decodeURIComponent(params.username);
  if ((await isOwnerAccount(target)) && gate.access.root !== true) {
    return NextResponse.json(
      { error: "Only the owner can change a super owner's password." },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const password = typeof body.password === "string" ? body.password : "";

  const result = await setMemberPassword(target, password);
  if (result.error) {
    const missing = result.error.startsWith("No account");
    return NextResponse.json({ error: result.error }, { status: missing ? 404 : 400 });
  }

  await logActivity({
    area: "admin",
    action: "account-password",
    username: gate.access.username,
    detail: `Changed the password for @${target}`,
    request,
  });

  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(request, { params }) {
  const gate = await authorize("accounts.delete");
  if (gate.response) return gate.response;

  const target = decodeURIComponent(params.username);
  if (await isOwnerAccount(target)) {
    return NextResponse.json(
      {
        error: isRootOwner(target)
          ? "The super owner account can't be deleted by anyone."
          : "Take the Super owner role away before deleting that account.",
      },
      { status: 403 }
    );
  }

  const result = await deleteMember(target);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  await logActivity({
    area: "admin",
    action: "account-deleted",
    username: gate.access.username,
    detail: `Deleted the account @${result.member.username}`,
    request,
  });

  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
