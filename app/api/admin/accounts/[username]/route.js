import { NextResponse } from "next/server";
import { authorize } from "@/lib/admin-guard";
import { adminUpdateMember, deleteMember, publicMember } from "@/lib/members";
import { isOwnerAccount, isRootOwner } from "@/lib/roles";
import { logActivity } from "@/lib/activity-log";

export const dynamic = "force-dynamic";

export async function PATCH(request, { params }) {
  const { username } = await params;
  const gate = await authorize("accounts.password");
  if (gate.response) return gate.response;

  const target = decodeURIComponent(username);
  if ((await isOwnerAccount(target)) && gate.access.root !== true) {
    return NextResponse.json(
      { error: "Only the owner can change a super owner's password." },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const patch = {};
  for (const field of ["name", "phone", "email", "username", "password"]) {
    if (typeof body?.[field] === "string") patch[field] = body[field];
  }
  if (typeof body?.emailVerified === "boolean") patch.emailVerified = body.emailVerified;

  const result = await adminUpdateMember(target, patch);
  if (result.error) {
    const missing = result.error.startsWith("No account");
    return NextResponse.json({ error: result.error }, { status: missing ? 404 : 400 });
  }

  const fields = Object.keys(patch).filter((field) => field !== "password");
  if (patch.password) fields.push("password");

  await logActivity({
    area: "admin",
    action: patch.password && fields.length === 1 ? "account-password" : "account-update",
    username: gate.access.username,
    detail:
      fields.length > 0
        ? `Updated ${fields.join(", ")} for @${target}${result.renamed ? ` (now @${result.member.username})` : ""}`
        : `Updated the account @${target}`,
    request,
  });

  return NextResponse.json(
    { ok: true, member: publicMember(result.member), renamed: Boolean(result.renamed) },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function DELETE(request, { params }) {
  const { username } = await params;
  const gate = await authorize("accounts.delete");
  if (gate.response) return gate.response;

  const target = decodeURIComponent(username);
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
