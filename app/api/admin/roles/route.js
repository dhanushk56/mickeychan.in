import { NextResponse } from "next/server";
import { authorize } from "@/lib/admin-guard";
import {
  OWNER_ROLE_ID,
  PERMISSION_GROUPS,
  buildRole,
  loadGrants,
  loadRoles,
  normalizeRole,
  saveGrants,
  saveRoles,
  sanitizeGrants,
} from "@/lib/roles";
import { logActivity } from "@/lib/activity-log";

export const dynamic = "force-dynamic";

function payload(roles) {
  return roles.map((role) => ({
    id: role.id,
    name: role.name,
    description: role.description,
    permissions: role.permissions,
    locked: role.locked,
    members: 0,
  }));
}

export async function GET() {
  const gate = await authorize("roles.view");
  if (gate.response) return gate.response;

  const roles = await loadRoles();
  const grants = await loadGrants();
  const counts = new Map();
  for (const grant of Object.values(grants)) {
    if (!grant || typeof grant !== "object") continue;
    counts.set(grant.roleId, (counts.get(grant.roleId) || 0) + 1);
  }

  return NextResponse.json(
    {
      roles: payload(roles).map((role) => ({
        ...role,
        members: role.id === OWNER_ROLE_ID ? 1 : counts.get(role.id) || 0,
      })),
      catalog: PERMISSION_GROUPS,
    },
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
    detail: `Created the role “${role.name}” with ${role.permissions.length} permission${role.permissions.length === 1 ? "" : "s"}`,
    request,
  });

  return NextResponse.json(
    { ok: true, roles: payload(next), role },
    { status: 201, headers: { "Cache-Control": "no-store" } }
  );
}

export async function PATCH(request) {
  const gate = await authorize("roles.manage");
  if (gate.response) return gate.response;

  const body = await request.json().catch(() => ({}));
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
    detail: `Edited the role “${updated.name}” — ${updated.permissions.length} permission${updated.permissions.length === 1 ? "" : "s"}`,
    request,
  });

  return NextResponse.json(
    { ok: true, roles: payload(roles), role: updated },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function DELETE(request) {
  const gate = await authorize("roles.manage");
  if (gate.response) return gate.response;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id") || "";
  const roles = await loadRoles();
  const target = roles.find((entry) => entry.id === id);
  if (!target) return NextResponse.json({ error: "No role with that id." }, { status: 404 });
  if (target.locked) {
    return NextResponse.json({ error: "The Super owner role can't be deleted." }, { status: 400 });
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
    detail: `Deleted the role “${target.name}”${moved ? ` — ${moved} admin${moved === 1 ? "" : "s"} moved to Viewer` : ""}`,
    request,
  });

  return NextResponse.json(
    { ok: true, roles: payload(next) },
    { headers: { "Cache-Control": "no-store" } }
  );
}
