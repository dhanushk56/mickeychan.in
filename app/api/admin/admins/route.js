import { NextResponse } from "next/server";
import { authorize } from "@/lib/admin-guard";
import {
  OWNER_ROLE_ID,
  SUPER_OWNER,
  adminRank,
  isRootOwner,
  listAdmins,
  loadGrants,
  loadOwners,
  loadRoles,
  normalizeUsername,
  outranks,
  roleRank,
  saveGrants,
  saveOwners,
} from "@/lib/roles";
import { findMember } from "@/lib/members";
import { logActivity } from "@/lib/activity-log";

export const dynamic = "force-dynamic";

function roleChoices(roles, access) {
  return roles
    .filter((role) => role.id !== OWNER_ROLE_ID || access.root === true)
    .map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      permissions: role.permissions,
      locked: role.locked,
    }));
}

async function adminsPayload(access) {
  const [roles, admins] = await Promise.all([loadRoles(), listAdmins()]);
  return {
    admins: admins.map((entry) => ({
      ...entry,
      manageable: outranks(access, roles, adminRank(roles, entry)),
    })),
    roles: roleChoices(roles, access),
  };
}

function denied(message) {
  return NextResponse.json({ error: message }, { status: 403 });
}

export async function GET() {
  const gate = await authorize("admins.view");
  if (gate.response) return gate.response;

  return NextResponse.json(await adminsPayload(gate.access), {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

export async function POST(request) {
  const gate = await authorize("admins.manage");
  if (gate.response) return gate.response;

  const body = await request.json().catch(() => ({}));
  const username = normalizeUsername(body.username);
  const roleId = typeof body.roleId === "string" ? body.roleId : "";

  if (!username) return NextResponse.json({ error: "Pick an account first." }, { status: 400 });
  if (isRootOwner(username)) {
    return denied("The super owner's access and role can't be changed.");
  }
  if (roleId === OWNER_ROLE_ID && gate.access.root !== true) {
    return denied(`Only @${SUPER_OWNER} can make someone a super owner.`);
  }

  const [roles, grants, owners] = await Promise.all([loadRoles(), loadGrants(), loadOwners()]);
  const role = roles.find((entry) => entry.id === roleId);
  if (!role) return NextResponse.json({ error: "Pick a role for that account." }, { status: 400 });

  const targetOwner = owners.includes(username);
  const currentRoleId = targetOwner ? OWNER_ROLE_ID : grants[username]?.roleId || null;
  const targetRank = targetOwner ? 0 : currentRoleId ? roleRank(roles, currentRoleId) : roles.length;
  if (!outranks(gate.access, roles, targetRank)) {
    return denied("You can only change admins below your own role.");
  }
  if (
    gate.access.root !== true &&
    roleRank(roles, role.id) <= roleRank(roles, gate.access.roleId)
  ) {
    return denied("You can't give an account a role at or above your own.");
  }

  const member = targetOwner || grants[username] ? true : await findMember(username);
  if (!member) {
    return NextResponse.json({ error: "No account with that username." }, { status: 404 });
  }

  if (role.id === OWNER_ROLE_ID) {
    await saveOwners([...owners, username]);
    if (grants[username]) {
      delete grants[username];
      await saveGrants(grants);
    }
  } else {
    if (targetOwner) await saveOwners(owners.filter((name) => name !== username));
    grants[username] = {
      roleId: role.id,
      grantedBy: gate.access.username,
      grantedAt: new Date().toISOString(),
    };
    await saveGrants(grants);
  }

  const previousRole = currentRoleId
    ? roles.find((entry) => entry.id === currentRoleId)?.name || currentRoleId
    : null;
  const detail =
    role.id === OWNER_ROLE_ID
      ? `Made @${username} a super owner`
      : previousRole
        ? `Moved @${username} from ${previousRole} to the ${role.name} role`
        : `Gave @${username} console access as ${role.name}`;

  await logActivity({
    area: "admin",
    action: previousRole ? "admin-role" : "admin-granted",
    username: gate.access.username,
    detail,
    request,
  });

  return NextResponse.json(
    { ok: true, ...(await adminsPayload(gate.access)) },
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
  if (isRootOwner(username)) {
    return denied("The super owner can't be removed from the console.");
  }

  const [roles, grants, owners] = await Promise.all([loadRoles(), loadGrants(), loadOwners()]);
  const targetOwner = owners.includes(username);
  if (targetOwner && gate.access.root !== true) {
    return denied(`Only @${SUPER_OWNER} can remove a super owner.`);
  }
  if (!targetOwner && !grants[username]) {
    return NextResponse.json(
      { error: "That account doesn't have console access." },
      { status: 400 }
    );
  }

  const targetRank = targetOwner ? 0 : roleRank(roles, grants[username].roleId);
  if (!outranks(gate.access, roles, targetRank)) {
    return denied("You can only remove admins below your own role.");
  }

  if (targetOwner) {
    await saveOwners(owners.filter((name) => name !== username));
  } else {
    delete grants[username];
    await saveGrants(grants);
  }

  await logActivity({
    area: "admin",
    action: "admin-revoked",
    username: gate.access.username,
    detail: `Removed console access from @${username}`,
    request,
  });

  return NextResponse.json(
    { ok: true, ...(await adminsPayload(gate.access)) },
    { headers: { "Cache-Control": "no-store" } }
  );
}
