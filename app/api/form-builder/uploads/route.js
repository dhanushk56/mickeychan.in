import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { kvSet } from "@/lib/kv";
import { memberFromCookieStore } from "@/lib/members";
import { MAX_UPLOAD_BYTES } from "@/lib/form-builder/schema";

export const dynamic = "force-dynamic";

function safeName(value) {
  return String(value || "file")
    .replace(/[\\/:*?"<>|\r\n\t]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120) || "file";
}

// Attachments live with the answer, so they can be opened by a reviewer later
// and disappear with the response. Only signed-in members can upload, and every
// file is capped well below the size a single stored value can hold.
export async function POST(request) {
  const member = await memberFromCookieStore(cookies());
  if (!member) {
    return NextResponse.json({ error: "Log in before uploading a file." }, { status: 401 });
  }

  const data = await request.formData().catch(() => null);
  const file = data?.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "Choose a file to upload." }, { status: 400 });
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `Keep files under ${Math.round(MAX_UPLOAD_BYTES / 1024)} KB.` },
      { status: 413 }
    );
  }

  const name = safeName(file.name);
  const buffer = Buffer.from(await file.arrayBuffer());
  const id = crypto.randomUUID().slice(0, 12);

  await kvSet(`formbuilder:upload:${id}`, {
    id,
    name,
    type: typeof file.type === "string" && file.type ? file.type.slice(0, 100) : "application/octet-stream",
    size: buffer.length,
    owner: member.username,
    createdAt: new Date().toISOString(),
    data: buffer.toString("base64"),
  });

  return NextResponse.json(
    { id, name, size: buffer.length, type: file.type || "application/octet-stream" },
    { headers: { "Cache-Control": "no-store" } }
  );
}
