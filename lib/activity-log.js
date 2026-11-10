
import { kvPush, kvRange } from "@/lib/kv";
import { requestIps, requestLocation } from "@/lib/request-ips";

const LOG_KEY = "activity:log";
const MAX_ENTRIES = 5000;
const READ_LIMIT = 1000;

export const AREA_LABEL = { admin: "Admin console", website: "Website" };

function text(value, max) {
  return String(value === undefined || value === null ? "" : value).slice(0, max);
}

export async function logActivity({
  area = "website",
  action,
  username,
  detail = "",
  ok = true,
  request,
} = {}) {
  if (!action) return;
  try {
    const location = request ? requestLocation(request) : null;
    const ips = request ? requestIps(request) : [];
    await kvPush(
      LOG_KEY,
      {
        id: crypto.randomUUID(),
        at: Date.now(),
        area: area === "admin" ? "admin" : "website",
        action: text(action, 40),
        username: text(username, 60).trim() || "Unknown",
        detail: text(detail, 500),
        ok: ok !== false,
        ip: ips[0] || null,
        city: location?.city || null,
        country: location?.country || null,
        timezone: location?.timezone || null,
      },
      MAX_ENTRIES
    );
  } catch {
  }
}

export async function readActivity(limit = READ_LIMIT) {
  const size = Math.min(Math.max(Number(limit) || READ_LIMIT, 1), READ_LIMIT);
  try {
    const entries = await kvRange(LOG_KEY, 0, size - 1);
    return entries
      .filter((entry) => entry && typeof entry === "object" && typeof entry.at === "number")
      .map((entry) => ({
        id: entry.id || `${entry.at}-${entry.action || "event"}`,
        at: entry.at,
        area: entry.area === "admin" ? "admin" : "website",
        action: entry.action || "event",
        username: entry.username || "Unknown",
        detail: entry.detail || "",
        ok: entry.ok !== false,
        ip: entry.ip || null,
        city: entry.city || null,
        country: entry.country || null,
        timezone: entry.timezone || null,
      }));
  } catch {
    return [];
  }
}

export function formChangeSummary(before, after) {
  const questionsOf = (form) => (form?.sections || []).flatMap((section) => section.questions || []);
  const beforeQuestions = questionsOf(before);
  const afterQuestions = questionsOf(after);
  const beforeIds = new Set(beforeQuestions.map((question) => question.id));
  const afterIds = new Set(afterQuestions.map((question) => question.id));

  const added = afterQuestions.filter((question) => !beforeIds.has(question.id));
  const removed = beforeQuestions.filter((question) => !afterIds.has(question.id));
  const edited = afterQuestions.filter((question) => {
    const old = beforeQuestions.find((item) => item.id === question.id);
    if (!old) return false;
    return (
      old.title !== question.title ||
      old.type !== question.type ||
      Boolean(old.required) !== Boolean(question.required)
    );
  });

  const label = (question) => `“${text(question.title || "untitled question", 60)}”`;
  const list = (items) => (items.length === 1 ? label(items[0]) : `${items.length} questions`);

  const parts = [];
  if (added.length) parts.push(`added ${list(added)}`);
  if (removed.length) parts.push(`removed ${list(removed)}`);
  if (edited.length) parts.push(`edited ${list(edited)}`);
  if (before?.title !== after?.title) {
    parts.push(`renamed the form to “${text(after?.title || "Untitled form", 60)}”`);
  }
  if (Boolean(before?.published) !== Boolean(after?.published)) {
    parts.push(after?.published ? "published it" : "moved it back to draft");
  }
  const cooldownBefore = Number(before?.settings?.cooldownHours) || 0;
  const cooldownAfter = Number(after?.settings?.cooldownHours) || 0;
  if (cooldownBefore !== cooldownAfter) {
    parts.push(`set the reapply cooldown to ${cooldownAfter}h`);
  }

  if (parts.length === 0) {
    parts.push(`saved it (${afterQuestions.length} question${afterQuestions.length === 1 ? "" : "s"})`);
  }
  return parts.join(", ");
}
