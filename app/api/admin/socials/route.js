import { NextResponse } from "next/server";
import { refreshPublic } from "@/lib/revalidate";
import { MAX_SOCIALS, getSocials, normalizeSocials, saveSocials } from "@/lib/socials";
import { authorize } from "@/lib/admin-guard";
import { logActivity } from "@/lib/activity-log";

export const dynamic = "force-dynamic";

export async function GET() {
  const gate = await authorize("content.view");
  if (gate.response) return gate.response;
  const socials = await getSocials();
  return NextResponse.json({ socials }, { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(request) {
  const gate = await authorize("content.edit");
  if (gate.response) return gate.response;

  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.socials)) {
    return NextResponse.json({ error: "Invalid socials list." }, { status: 400 });
  }

  if (body.socials.length > MAX_SOCIALS) {
    return NextResponse.json(
      { error: `Keep the list to ${MAX_SOCIALS} links or fewer.` },
      { status: 400 }
    );
  }

  const checked = normalizeSocials(body.socials);
  if (checked.length !== body.socials.length) {
    return NextResponse.json(
      { error: "Every row needs a name and a full https link or a mailto address." },
      { status: 400 }
    );
  }

  const socials = await saveSocials(checked);
  refreshPublic("content");

  await logActivity({
    area: "admin",
    action: "socials",
    username: gate.access.username,
    detail: `Updated the social links (${socials.length} link${socials.length === 1 ? "" : "s"})`,
    request,
  });

  return NextResponse.json({ ok: true, socials }, { headers: { "Cache-Control": "no-store" } });
}
