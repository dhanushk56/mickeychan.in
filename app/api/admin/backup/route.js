import { NextResponse } from "next/server";
import { authorize } from "@/lib/admin-guard";
import { kvGet, kvHashAll, kvRange } from "@/lib/kv";

export const dynamic = "force-dynamic";

// Every KV namespace the site writes to. Hash namespaces are dumped whole,
// plain values are read as-is, and submissions are read per form.
const HASH_NAMESPACES = [
  "members:registered:records",
  "members:overrides:records",
  "members:deleted:records",
  "submissions:join:records",
];

const VALUE_NAMESPACES = [
  "roles:list",
  "roles:grants",
  "roles:owners",
  "announcements:list",
  "content:videos",
  "content:form",
  "members:form-blacklist",
  "formbuilder:index",
];

// Pre-migration keys are included only while they still hold data.
const LEGACY_NAMESPACES = [
  "members:registered",
  "members:overrides",
  "members:deleted",
  "submissions:join",
];

function sizeOf(value) {
  if (Array.isArray(value)) return value.length;
  if (value && typeof value === "object") return Object.keys(value).length;
  return value === null || value === undefined ? 0 : 1;
}

export async function GET() {
  const gate = await authorize("audit.view");
  if (gate.response) return gate.response;

  const namespaces = {};
  const counts = {};

  await Promise.all(
    HASH_NAMESPACES.map(async (key) => {
      const value = await kvHashAll(key);
      namespaces[key] = value;
      counts[key] = sizeOf(value);
    })
  );

  await Promise.all(
    VALUE_NAMESPACES.map(async (key) => {
      const value = await kvGet(key, null);
      namespaces[key] = value;
      counts[key] = sizeOf(value);
    })
  );

  await Promise.all(
    LEGACY_NAMESPACES.map(async (key) => {
      const value = await kvGet(key, null);
      if (value === null || value === undefined) return;
      namespaces[key] = value;
      counts[key] = sizeOf(value);
    })
  );

  const forms = Array.isArray(namespaces["formbuilder:index"]) ? namespaces["formbuilder:index"] : [];
  await Promise.all(
    forms.map(async (form) => {
      const formId = String(form?.id || "").trim();
      if (!formId) return;
      const key = `submissions:applications:${formId}:records`;
      const value = await kvHashAll(key);
      namespaces[key] = value;
      counts[key] = sizeOf(value);
    })
  );

  const activity = await kvRange("activity:log", 0, -1);
  namespaces["activity:log"] = Array.isArray(activity) ? activity : [];
  counts["activity:log"] = namespaces["activity:log"].length;

  const exportedAt = new Date().toISOString();
  const body = JSON.stringify(
    { format: 1, exportedAt, source: "Vercel KV", counts, namespaces },
    null,
    2
  );

  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="mickeychan-backup-${exportedAt.slice(0, 10)}.json"`,
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
