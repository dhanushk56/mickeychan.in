import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { kvGet } from "@/lib/kv";
import { verifySessionToken, isAllowedDiscordId, sessionCookieName } from "@/lib/discord-auth";

function isAuthorizedRequest() {
  const token = cookies().get(sessionCookieName())?.value;
  const session = verifySessionToken(token);
  return Boolean(session && isAllowedDiscordId(session.id));
}

export async function GET() {
  if (!isAuthorizedRequest()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [join, index] = await Promise.all([
    kvGet("submissions:join", []),
    kvGet("formbuilder:index", []),
  ]);

  const perForm = await Promise.all(
    index.map((entry) => kvGet(`submissions:applications:${entry.id}`, []))
  );
  const applications = perForm
    .flat()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return NextResponse.json({ join, applications });
}
