import { NextResponse } from "next/server";
import { kvDel, kvGet, kvSet } from "@/lib/kv";
import { collectBackup, SNAPSHOT_INDEX_KEY } from "@/lib/backup";
import { pruneActivity } from "@/lib/activity-log";
import { pruneReports } from "@/lib/reports";

export const dynamic = "force-dynamic";

const KEEP = 14;

export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured." },
      { status: 503 }
    );
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // The snapshot keeps the record; retention keeps the live keys small.
  const activity = await pruneActivity(180);
  const reports = await pruneReports(90);

  const backup = await collectBackup();
  const body = JSON.stringify(backup);
  const key = `backup:snapshot:${backup.exportedAt.replace(/[:.]/g, "-")}`;
  await kvSet(key, body);

  const previous = await kvGet(SNAPSHOT_INDEX_KEY, []);
  const entries = (Array.isArray(previous) ? previous : []).filter(
    (entry) => entry && typeof entry.key === "string" && entry.key !== key
  );
  const kept = [{ key, at: backup.exportedAt, bytes: body.length }, ...entries].slice(0, KEEP);
  const dropped = entries.filter(
    (entry) => !kept.some((snapshot) => snapshot.key === entry.key)
  );

  for (const entry of dropped) await kvDel(entry.key);
  await kvSet(SNAPSHOT_INDEX_KEY, kept);

  return NextResponse.json(
    {
      ok: true,
      key,
      bytes: body.length,
      kept: kept.length,
      dropped: dropped.map((entry) => entry.key),
      retention: { activity, reports },
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
