import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { listMembers } from "@/lib/members";

export const dynamic = "force-dynamic";

// Protected — the admin console's account list (never includes hashes).
export async function GET() {
  if (!getSessionFromCookies()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(
    { accounts: await listMembers() },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
