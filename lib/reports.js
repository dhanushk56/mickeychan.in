import { kvGet, kvSet } from "@/lib/kv";
import { MAX_NOTE, REPORT_REASONS, REPORT_STATUSES } from "@/lib/report-meta";

// One short queue for the people who moderate the forums. A report keeps who
// sent it and why, not a copy of the post, so deleting a thread leaves nothing
// of it here.

export const REPORTS_KEY = "forums:reports";
export const MAX_REPORTS = 300;

export { MAX_NOTE, REPORT_REASONS, REPORT_STATUSES } from "@/lib/report-meta";

export function reasonLabel(id) {
  return REPORT_REASONS.find((entry) => entry.id === id)?.label || "Something else";
}

const REASON_IDS = REPORT_REASONS.map((entry) => entry.id);

function text(value, max) {
  return String(value ?? "").trim().slice(0, max);
}

function stamp(value) {
  const at = new Date(value || Date.now()).getTime();
  return new Date(Number.isNaN(at) ? Date.now() : at).toISOString();
}

function normalizeReport(input = {}) {
  const reason = REASON_IDS.includes(input.reason) ? input.reason : "other";
  const status = REPORT_STATUSES.includes(input.status) ? input.status : "open";
  return {
    id: typeof input.id === "string" && input.id ? input.id.slice(0, 40) : `rep_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    at: stamp(input.at),
    threadId: text(input.threadId, 40),
    threadTitle: text(input.threadTitle, 120),
    replyId: text(input.replyId, 40) || null,
    reporter: text(input.reporter, 40),
    reason,
    note: text(input.note, MAX_NOTE),
    status,
    handledBy: text(input.handledBy, 40) || null,
    handledAt: input.handledAt ? stamp(input.handledAt) : null,
  };
}

export function readReports(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((entry) => entry && typeof entry === "object")
    .map(normalizeReport)
    .filter((entry) => entry.threadId && entry.reporter)
    .slice(0, MAX_REPORTS);
}

export async function listReports() {
  return readReports(await kvGet(REPORTS_KEY, [])).sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()
  );
}

async function persist(list) {
  await kvSet(REPORTS_KEY, list.slice(0, MAX_REPORTS));
}

export async function createReport({
  reporter,
  threadId,
  threadTitle,
  replyId = "",
  reason,
  note = "",
}) {
  const who = text(reporter, 40);
  if (!who) return { error: "Log in to report a post." };

  const reports = await listReports();
  const same = reports.find(
    (entry) =>
      entry.status === "open" &&
      entry.reporter.toLowerCase() === who.toLowerCase() &&
      entry.threadId === threadId &&
      (entry.replyId || "") === (replyId || "")
  );
  if (same) return { report: same, duplicate: true };

  const report = normalizeReport({
    reporter: who,
    threadId,
    threadTitle,
    replyId,
    reason,
    note,
  });
  await persist([report, ...reports]);
  return { report };
}

export async function setReportStatus({ id, status, handledBy }) {
  if (!REPORT_STATUSES.includes(status)) return { error: "That is not a report state." };
  const reports = await listReports();
  const report = reports.find((entry) => entry.id === id);
  if (!report) return { error: "That report is gone." };
  const updated = {
    ...report,
    status,
    handledBy: status === "handled" ? text(handledBy, 40) || null : null,
    handledAt: status === "handled" ? new Date().toISOString() : null,
  };
  await persist(reports.map((entry) => (entry.id === id ? updated : entry)));
  return { report: updated };
}

export async function removeReport(id) {
  const reports = await listReports();
  const found = reports.some((entry) => entry.id === id);
  if (!found) return { error: "That report is gone." };
  await persist(reports.filter((entry) => entry.id !== id));
  return { ok: true };
}

// Handled reports are kept for a while so patterns are visible, then dropped.
// Open ones stay until someone acts on them.
export async function pruneReports(days = 90) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const reports = await listReports();
  const kept = reports.filter(
    (entry) => entry.status !== "handled" || new Date(entry.at).getTime() >= cutoff
  );
  if (kept.length === reports.length) return { removed: 0, kept: kept.length };
  await persist(kept);
  return { removed: reports.length - kept.length, kept: kept.length };
}
