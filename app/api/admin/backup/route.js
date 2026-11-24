import { NextResponse } from "next/server";
import { authorize } from "@/lib/admin-guard";
import { collectBackup } from "@/lib/backup";

export const dynamic = "force-dynamic";

export async function GET() {
  const gate = await authorize("admins.manage");
  if (gate.response) return gate.response;

  const backup = await collectBackup();
  const body = JSON.stringify(backup, null, 2);

  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="mickeychan-backup-${backup.exportedAt.slice(0, 10)}.json"`,
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
