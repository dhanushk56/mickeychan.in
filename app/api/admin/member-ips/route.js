import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { bindMemberIps, findMember } from "@/lib/members";

export const dynamic = "force-dynamic";

export async function GET(request) {
  if (!getSessionFromCookies()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const username = new URL(request.url).searchParams.get("username") || "";
  const member = await findMember(username);
  if (!member) return NextResponse.json({ error: "No such account" }, { status: 404 });
  return NextResponse.json(
    {
      username: member.username,
      source: member.source,
      ips: Array.isArray(member.ips) ? member.ips : [],
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(request) {
  if (!getSessionFromCookies()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const updated = await bindMemberIps(body.username, Array.isArray(body.ips) ? body.ips : [], null);
  if (!updated) return NextResponse.json({ error: "No such account" }, { status: 404 });
  return NextResponse.json({
    username: updated.username,
    source: updated.source,
    ips: Array.isArray(updated.ips) ? updated.ips : [],
  });
}
