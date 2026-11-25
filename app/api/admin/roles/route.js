import { NextResponse } from "next/server";
import { authorize } from "@/lib/admin-guard";
import {
  OWNER_ROLE_ID,
  PERMISSION_GROUPS,
  buildRole,
  loadGrants,
  loadOwners,
  loadRoles,
  normalizeRole,
  roleRank,
  saveGrants,
  saveRoles,
  sanitizeGrants,
} from "@/lib/roles";
import { logActivity } from "@/lib/activity-log";

export const dynamic = "force-dynamic";

function payload(roles, access, grants, ownerCount) {
  const counts = new Map();
  for (const grant of Object.values(grants)) {
    if (!grant || typeof grant !== "object") continue;
    counts.set(grant.roleId, (counts.get(grant.roleId) || 0) + 1);
  }
  const actorRank = roleRank(roles, access.roleId);
  return roles.map((role, index) => ({
    id: role.id,
    name: role.name,
    description: role.description,
    permissions: role.permissions,
    locked: role.locked,
    rank: index,
    members: role.id === OWNER_ROLE_ID ? ownerCount : counts.get(role.id) || 0,
    editable: role.locked ? false : access.root === true || index > actorRank,
  }));
}

async function snapshot(access) {
  const [roles, grants, owners] = await Promise.all([loadRoles(), loadGrants(), loadOwners()]);
  return payload(roles, access, grants, owners.length);
}

function denied(message) {
  return NextResponse.json({ error: message }, { status: 403 });
}

export async function GET() {
  const gate = await authorize("roles.view");
  if (gate.response) return gate.response;

  return NextResponse.json(
    { roles: await snapshot(gate.access), catalog: PERMISSION_GROUPS, canGrantOwner: gate.access.root === true },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}

export async function POST(request) {
  const gate = await authorize("roles.manage");
  if (gate.response) return gate.response;

  const body = await request.json().catch(() => ({}));
  const roles = await loadRoles();
  const role = buildRole(body, roles.map((entry) => entry.id));
  if (!role) {
    return NextResponse.json({ error: "Give the role a name of at least 2 characters." }, { status: 400 });
  }
  if (roles.some((entry) => entry.name.toLowerCase() === role.name.toLowerCase())) {
    return NextResponse.json({ error: "A role with that name already exists." }, { status: 409 });
  }

  const next = [...roles, role];
  await saveRoles(next);

  await logActivity({
    area: "admin",
    action: "role-created",
    username: gate.access.username,
    detail: `Created the role "${role.name}" with ${role.permissions.length} permission${role.permissions.length === 1 ? "" : "s"}`,
    request,
  });

  return NextResponse.json(
    { ok: true, roles: await snapshot(gate.access), role },
    { status: 201, headers: { "Cache-Control": "no-store" } }
  );
}

export async function PATCH(request) {
  const gate = await authorize("roles.manage");
  if (gate.response) return gate.response;

  const body = await request.json().catch(() => ({}));

  if (Array.isArray(body.order)) {
    const roles = await loadRoles();
    const fixed = roles.filter((role) => role.locked);
    const movable = roles.filter((role) => !role.locked);
    const byId = new Map(movable.map((role) => [role.id, role]));
    const ordered = [];
    for (const id of body.order) {
      const role = byId.get(id);
      if (!role) continue;
      ordered.push(role);
      byId.delete(id);
    }
    ordered.push(...byId.values());
    const next = [...fixed, ...ordered];
    if (gate.access.root !== true) {
      const actorRank = roleRank(roles, gate.access.roleId);
      const before = roles.slice(0, actorRank + 1).map((role) => role.id).join(",");
      const after = next.slice(0, actorRank + 1).map((role) => role.id).join(",");
      if (before !== after) return denied("You can't move a role above your own.");
    }
    await saveRoles(next);

    await logActivity({
      area: "admin",
      action: "roles-reordered",
      username: gate.access.username,
      detail: `Set the role hierarchy to ${next.map((role) => role.name).join(" › ")}`,
      request,
    });

    return NextResponse.json(
      { ok: true, roles: await snapshot(gate.access) },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "Pick a role first." }, { status: 400 });

  const roles = await loadRoles();
  const index = roles.findIndex((entry) => entry.id === id);
  if (index === -1) return NextResponse.json({ error: "No role with that id." }, { status: 404 });
  if (roles[index].locked) {
    return NextResponse.json(
      { error: "The Super owner role can't be changed." },
      { status: 400 }
    );
  }
  if (gate.access.root !== true && index <= roleRank(roles, gate.access.roleId)) {
    return denied("You can only change roles below your own.");
  }

  const name = typeof body.name === "string" ? body.name.trim().slice(0, 48) : roles[index].name;
  if (name.length < 2) {
    return NextResponse.json({ error: "Give the role a name of at least 2 characters." }, { status: 400 });
  }
  if (roles.some((entry) => entry.id !== id && entry.name.toLowerCase() === name.toLowerCase())) {
    return NextResponse.json({ error: "A role with that name already exists." }, { status: 409 });
  }

  const updated = normalizeRole({
    id,
    name,
    description: typeof body.description === "string" ? body.description : roles[index].description,
    permissions: Array.isArray(body.permissions) ? body.permissions : roles[index].permissions,
  });
  roles[index] = updated;
  await saveRoles(roles);

  await logActivity({
    area: "admin",
    action: "role-edited",
    username: gate.access.username,
    detail: `Edited the role "${updated.name}": ${updated.permissions.length} permission${updated.permissions.length === 1 ? "" : "s"}`,
    request,
  });

  return NextResponse.json(
    { ok: true, roles: await snapshot(gate.access), role: updated },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function DELETE(request) {
  const gate = await authorize("roles.manage");
  if (gate.response) return gate.response;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id") || "";
  const roles = await loadRoles();
  const index = roles.findIndex((entry) => entry.id === id);
  if (index === -1) return NextResponse.json({ error: "No role with that id." }, { status: 404 });
  const target = roles[index];
  if (target.locked) {
    return NextResponse.json({ error: "The Super owner role can't be deleted." }, { status: 400 });
  }
  if (gate.access.root !== true && index <= roleRank(roles, gate.access.roleId)) {
    return denied("You can only delete roles below your own.");
  }

  const next = roles.filter((entry) => entry.id !== id);
  await saveRoles(next);

  const grants = await loadGrants();
  const shifted = sanitizeGrants(grants, id);
  const moved = Object.values(grants).filter((grant) => grant?.roleId === id).length;
  if (moved > 0) await saveGrants(shifted);

  await logActivity({
    area: "admin",
    action: "role-deleted",
    username: gate.access.username,
    detail: `Deleted the role "${target.name}"${moved ? `: ${moved} admin${moved === 1 ? "" : "s"} moved to Viewer` : ""}`,
    request,
  });

  return NextResponse.json(
    { ok: true, roles: await snapshot(gate.access) },
    { headers: { "Cache-Control": "no-store" } }
  );
}
