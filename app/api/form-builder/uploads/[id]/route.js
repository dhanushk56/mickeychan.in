import { kvGet } from "@/lib/kv";
import { authorize } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const gate = await authorize("forms.view");
  if (gate.response) return gate.response;

  const { id } = await params;
  if (!/^[a-z0-9]{6,24}$/i.test(String(id || ""))) {
    return new Response("Not found", { status: 404 });
  }

  const record = await kvGet(`formbuilder:upload:${id}`, null);
  if (!record?.data) {
    return new Response("Not found", { status: 404 });
  }

  const buffer = Buffer.from(record.data, "base64");
  const name = String(record.name || "file").replace(/["\r\n]/g, " ");

  return new Response(buffer, {
    headers: {
      "Content-Type": record.type || "application/octet-stream",
      "Content-Disposition": `inline; filename="${name}"`,
      "Content-Length": String(buffer.length),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
