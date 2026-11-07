import { NextResponse } from "next/server";
import { kvGet } from "@/lib/kv";
import { getSessionFromCookies } from "@/lib/auth";

function isAuthorizedRequest() {
  return Boolean(getSessionFromCookies());
}

// Backs the live admin dashboard — polled every few seconds, so it must never
// be cached by the browser or the Next data cache.
export const dynamic = "force-dynamic";

export async function GET() {
  if (!isAuthorizedRequest()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [join, index] = await Promise.all([
    kvGet("submissions:join", []),
    kvGet("formbuilder:index", []),
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
      generatedAt: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
