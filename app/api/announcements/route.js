import { NextResponse } from "next/server";
import { kvGet } from "@/lib/kv";
import { ANNOUNCEMENTS_KEY, readAnnouncements, splitAnnouncements } from "@/lib/announcements";

export const dynamic = "force-dynamic";

// Public. The split is worked out per request, because "current" depends on how
// long ago each announcement was posted relative to right now.
export async function GET() {
  const list = readAnnouncements(await kvGet(ANNOUNCEMENTS_KEY, []));
  const now = Date.now();
  const { current, past } = splitAnnouncements(list, now);
  return NextResponse.json(
    { current, past, now },
    { headers: { "Cache-Control": "no-store" } }
  );
}
