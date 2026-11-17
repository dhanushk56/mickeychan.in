import { NextResponse } from "next/server";
import { authorize } from "@/lib/admin-guard";
import {
  OWNER_ROLE_ID,
  isSuperOwner,
  listAdmins,
  loadGrants,
  loadRoles,
  normalizeUsername,
  saveGrants,
} from "@/lib/roles";
import { findMember } from "@/lib/members";
import { logActivity } from "@/lib/activity-log";

export const dynamic = "force-dynamic";

async function roleChoices() {
  const roles = await loadRoles();
  return roles
    .filter((role) => role.id !== OWNER_ROLE_ID)
    .map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      permissions: role.permissions,
    }));
}

export async function GET() {
  const gate = await authorize("admins.view");
  if (gate.response) return gate.response;

  return NextResponse.json(
    { admins: await listAdmins(), roles: await roleChoices() },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}

export async function POST(request) {
  const gate = await authorize("admins.manage");
  if (gate.response) return gate.response;

  const body = await request.json().catch(() => ({}));
  const username = normalizeUsername(body.username);
  const roleId = typeof body.roleId === "string" ? body.roleId : "";

  if (!username) return NextResponse.json({ error: "Pick an account first." }, { status: 400 });
  if (isSuperOwner(username)) {
    return NextResponse.json(
      { error: "The super owner's access and role can't be changed." },
      { status: 403 }
    );
  }
  if (roleId === OWNER_ROLE_ID) {
    return NextResponse.json(
      { error: "Only the super owner holds the Super owner role." },
      { status: 403 }
    );
  }

  const roles = await loadRoles();
  const role = roles.find((entry) => entry.id === roleId);
  if (!role) return NextResponse.json({ error: "Pick a role for that account." }, { status: 400 });

  const member = await findMember(username);
  if (!member) {
    return NextResponse.json({ error: "No account with that username." }, { status: 404 });
  }

  const grants = await loadGrants();
  const previous = grants[username]?.roleId || null;
  grants[username] = {
    roleId: role.id,
    grantedBy: gate.access.username,
    grantedAt: new Date().toISOString(),
  };
  await saveGrants(grants);

  await logActivity({
    area: "admin",
    action: previous ? "admin-role" : "admin-granted",
    username: gate.access.username,
    detail: previous
      ? `Moved @${username} from ${previous} to the ${role.name} role`
      : `Gave @${username} console access as ${role.name}`,
    request,
  });

  return NextResponse.json(
    { ok: true, admins: await listAdmins() },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function PATCH(request) {
  return POST(request);
}

export async function DELETE(request) {
  const gate = await authorize("admins.manage");
  if (gate.response) return gate.response;

  const { searchParams } = new URL(request.url);
  const username = normalizeUsername(searchParams.get("username"));
  if (!username) return NextResponse.json({ error: "Pick an account first." }, { status: 400 });
  if (isSuperOwner(username)) {
    return NextResponse.json(
      { error: "The super owner can't be removed from the console." },
      { status: 403 }
    );
  }

  const grants = await loadGrants();
  if (!grants[username]) {
    return NextResponse.json(
      {
        error:
          "That account is built into the server allowlist. Change its role instead of removing it.",
      },
      { status: 400 }
    );
  }
  delete grants[username];
  await saveGrants(grants);

  await logActivity({
    area: "admin",
    action: "admin-revoked",
    username: gate.access.username,
    detail: `Removed console access from @${username}`,
    request,
  });

  return NextResponse.json(
    { ok: true, admins: await listAdmins() },
    { headers: { "Cache-Control": "no-store" } }
  );
}
