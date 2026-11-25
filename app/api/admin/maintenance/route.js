import { NextResponse } from "next/server";
import { authorize } from "@/lib/admin-guard";
import { logActivity } from "@/lib/activity-log";
import { refreshMaintenance } from "@/lib/revalidate";
import { loadRoles, OWNER_ROLE_ID } from "@/lib/roles";
import {
  BYPASS_PERMISSION,
  MAINTENANCE_PERMISSION,
  MAX_MESSAGE,
  getMaintenance,
  saveMaintenance,
} from "@/lib/maintenance";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

function bypassRoles(roles) {
  return (roles || [])
    .filter((role) => role.id === OWNER_ROLE_ID || (role.permissions || []).includes(BYPASS_PERMISSION))
    .map((role) => ({ id: role.id, name: role.name }));
}

export async function GET() {
  const gate = await authorize(MAINTENANCE_PERMISSION);
  if (gate.response) return gate.response;

  const [state, roles] = await Promise.all([getMaintenance(), loadRoles()]);

  return NextResponse.json(
    { ok: true, state, roles: bypassRoles(roles), maxMessage: MAX_MESSAGE },
    { headers: NO_STORE }
  );
}

export async function PUT(request) {
  const gate = await authorize(MAINTENANCE_PERMISSION);
  if (gate.response) return gate.response;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "Invalid maintenance settings." },
      { status: 400, headers: NO_STORE }
    );
  }

  const state = await saveMaintenance(
    { enabled: body.enabled === true, message: body.message },
    gate.access.username
  );
  refreshMaintenance();

  await logActivity({
    area: "admin",
    action: "maintenance",
    username: gate.access.username,
    detail: state.enabled ? "turned maintenance mode on" : "turned maintenance mode off",
    request,
  });

  return NextResponse.json({ ok: true, state }, { headers: NO_STORE });
}
