import { NextResponse } from "next/server";
import { authorizeAny } from "@/lib/admin-guard";
import { logActivity } from "@/lib/activity-log";
import {
  deleteEnquiry,
  isEnquiryStatus,
  listEnquiries,
  statusMeta,
  updateEnquiry,
} from "@/lib/enquiries";

export const dynamic = "force-dynamic";

const VIEW_PERMISSIONS = ["enquiries.view", "messages.view"];
const MANAGE_PERMISSIONS = ["enquiries.manage", "messages.delete"];
const DELETE_PERMISSIONS = ["enquiries.delete", "messages.delete"];

export async function GET() {
  const gate = await authorizeAny(VIEW_PERMISSIONS);
  if (gate.response) return gate.response;
  const enquiries = await listEnquiries();
  return NextResponse.json({ enquiries }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request) {
  const gate = await authorizeAny(MANAGE_PERMISSIONS);
  if (gate.response) return gate.response;

  const body = await request.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "Which enquiry?" }, { status: 400 });

  if (body.status !== undefined && !isEnquiryStatus(body.status)) {
    return NextResponse.json({ error: "Unknown status." }, { status: 400 });
  }

  const updated = await updateEnquiry(id, {
    status: body.status,
    note: typeof body.note === "string" ? body.note : undefined,
    handledBy: gate.access?.username || "Admin",
  });

  if (!updated) return NextResponse.json({ error: "That enquiry is gone." }, { status: 404 });

  await logActivity({
    area: "admin",
    action: "enquiry-updated",
    username: gate.access?.username || "Admin",
    detail: `Updated enquiry ${updated.reference || updated.id} to ${statusMeta(updated.status).label}`,
    request,
  });

  return NextResponse.json({ ok: true, enquiry: updated }, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(request) {
  const gate = await authorizeAny(DELETE_PERMISSIONS);
  if (gate.response) return gate.response;

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Which enquiry?" }, { status: 400 });

  const removed = await deleteEnquiry(id);
  if (!removed) return NextResponse.json({ error: "That enquiry is gone." }, { status: 404 });

  await logActivity({
    area: "admin",
    action: "enquiry-deleted",
    username: gate.access?.username || "Admin",
    detail: `Deleted enquiry ${removed.reference || removed.id} from ${removed.name}`,
    request,
  });

  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
