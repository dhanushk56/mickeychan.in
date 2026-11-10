import { NextResponse } from "next/server";
import { kvGet, kvSet } from "@/lib/kv";
import { getSessionFromCookies } from "@/lib/auth";
import { submissionsKey } from "@/lib/applications";
import { listMembers } from "@/lib/members";
import { logActivity } from "@/lib/activity-log";

function isAuthorizedRequest() {
  return Boolean(getSessionFromCookies());
}

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isAuthorizedRequest()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [join, index, accounts] = await Promise.all([
    kvGet("submissions:join", []),
    kvGet("formbuilder:index", []),
    listMembers(),
  ]);

  const perForm = await Promise.all(
    index.map(async (entry) => {
      const submissions = await kvGet(`submissions:applications:${entry.id}`, []);
      return submissions.map((submission) => ({
        ...submission,
        status: submission.status || "pending",
        formTitle: submission.formTitle || entry.title,
      }));
    })
  );

  const applications = perForm
    .flat()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const forms = index.map((entry, i) => ({
    ...entry,
    submissions: perForm[i].length,
    pending: perForm[i].filter((s) => s.status === "pending").length,
  }));

  return NextResponse.json(
    {
      join,
      applications,
      forms,
      accounts,
      generatedAt: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}

export async function DELETE(request) {
  const session = getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const index = await kvGet("formbuilder:index", []);
  const cleared = await Promise.all(
    index.map(async (entry) => {
      const key = submissionsKey(entry.id);
      const submissions = await kvGet(key, []);
      await kvSet(key, []);
      return Array.isArray(submissions) ? submissions.length : 0;
    })
  );
  const total = cleared.reduce((sum, count) => sum + count, 0);

  await logActivity({
    area: "admin",
    action: "applications-cleared",
    username: session.user.username,
    detail:
      `Deleted all ${total} application${total === 1 ? "" : "s"} across ` +
      `${index.length} form${index.length === 1 ? "" : "s"}`,
    request,
  });

  return NextResponse.json(
    { ok: true, cleared: index.length },
    { headers: { "Cache-Control": "no-store" } }
  );
}
