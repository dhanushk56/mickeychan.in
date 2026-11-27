import { NextResponse } from "next/server";
import { authorize } from "@/lib/admin-guard";
import { logActivity } from "@/lib/activity-log";
import { listReports, removeReport, setReportStatus } from "@/lib/reports";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

export async function GET() {
  const gate = await authorize("forums.moderate");
  if (gate.response) return gate.response;

  return NextResponse.json(
    { reports: await listReports() },
    { headers: NO_STORE }
  );
}

export async function PATCH(request) {
  const gate = await authorize("forums.moderate");
  if (gate.response) return gate.response;

  const body = await request.json().catch(() => ({}));
  const result = await setReportStatus({
    id: String(body?.id || "").slice(0, 40),
    status: body?.status,
    handledBy: gate.access.username,
  });

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  await logActivity({
    area: "admin",
    action: "report-handled",
    username: gate.access.username,
    detail: `Marked the report on "${result.report.threadTitle}" as ${result.report.status}`,
    request,
  });

  return NextResponse.json({ report: result.report }, { headers: NO_STORE });
}

export async function DELETE(request) {
  const gate = await authorize("forums.moderate");
  if (gate.response) return gate.response;

  const id = new URL(request.url).searchParams.get("id") || "";
  const reports = await listReports();
  const found = reports.find((entry) => entry.id === id);

  const result = await removeReport(id);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  await logActivity({
    area: "admin",
    action: "report-deleted",
    username: gate.access.username,
    detail: found ? `Deleted the report on "${found.threadTitle}"` : "Deleted a report",
    request,
  });

  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}
