import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createThread, listThreads, sortThreads } from "@/lib/forums";
import { logActivity } from "@/lib/activity-log";
import { memberFromCookieStore } from "@/lib/members";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ threads: sortThreads(await listThreads()) });
}

export async function POST(request) {
  const member = await memberFromCookieStore(await cookies()).catch(() => null);
  if (!member) {
    return NextResponse.json({ error: "Log in to start a thread." }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const result = await createThread({
    member,
    title: body?.title,
    body: body?.body,
    category: body?.category,
  });
  if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });

  await logActivity({
    area: "website",
    action: "forum",
    username: member.username,
    detail: `Started the thread "${result.thread.title}"`,
  });
  return NextResponse.json({ thread: result.thread });
}
