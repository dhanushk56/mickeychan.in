import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { addJoinMessage } from "@/lib/join-messages";
import { memberFromCookieStore } from "@/lib/members";
import { logActivity } from "@/lib/activity-log";
import { EMAIL_VERIFICATION_REQUIRED } from "@/lib/features";
import { blacklistEntry } from "@/lib/blacklist";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const member = await memberFromCookieStore(cookies());
  if (!member) {
    return NextResponse.json({ error: "Please log in to send a message." }, { status: 401 });
  }

  if (EMAIL_VERIFICATION_REQUIRED && member.emailVerified !== true) {
    return NextResponse.json(
      {
        error: "Confirm your email address before sending a message. Open Verify your account from the menu.",
        code: "email_unverified",
      },
      { status: 403 }
    );
  }

  const block = await blacklistEntry(member.username);
  if (block) {
    await logActivity({
      area: "website",
      action: "form-blocked",
      username: member.username,
      detail: "Blocked: this account can't send messages",
      ok: false,
      request,
    });
    return NextResponse.json(
      {
        error: "Your account can't submit forms right now. Contact the team if you think this is a mistake.",
        code: "blacklisted",
      },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const role = typeof body.role === "string" ? body.role.trim() : "Community";
  if (!name || !email || !message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Please provide a valid name, email, and message." }, { status: 400 });
  }

  await addJoinMessage({
    id: crypto.randomUUID(),
    memberUsername: member.username,
    memberName: member.name,
    name,
    email,
    role,
    message,
    createdAt: new Date().toISOString(),
  });

  await logActivity({
    area: "website",
    action: "message",
    username: member.username,
    detail: `Sent a "join us" message (${role})`,
    request,
  });

  return NextResponse.json({ ok: true });
}
