import { NextResponse } from "next/server";
import { kvGet } from "@/lib/kv";
import { authorize, authorizeAny } from "@/lib/admin-guard";
import { clearSubmissions, listSubmissions } from "@/lib/applications";
import { listJoinMessages } from "@/lib/join-messages";
import { listMembers } from "@/lib/members";
import { annotateBlacklist } from "@/lib/blacklist";
import { logActivity } from "@/lib/activity-log";

export const dynamic = "force-dynamic";

export async function GET() {
  const gate = await authorizeAny([
    "applications.view",
    "messages.view",
    "forms.view",
    "accounts.view",
  ]);
  if (gate.response) return gate.response;

  const [join, index, members] = await Promise.all([
    listJoinMessages(),
    kvGet("formbuilder:index", []),
    listMembers(),
  ]);
  const accounts = await annotateBlacklist(members);

  const perForm = await Promise.all(
    index.map(async (entry) => {
      const submissions = await listSubmissions(entry.id);
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
  const gate = await authorize("applications.clear");
  if (gate.response) return gate.response;
  const session = gate.session;

  const index = await kvGet("formbuilder:index", []);
  const cleared = await Promise.all(
    index.map(async (entry) => {
      const submissions = await listSubmissions(entry.id);
      await clearSubmissions(entry.id);
      return submissions.length;
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
