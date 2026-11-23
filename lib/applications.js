import { kvGet, kvSet, kvDel, kvHashAll, kvHashSet, kvHashDel } from "@/lib/kv";

export const SUBMISSIONS_PREFIX = "submissions:applications:";

export function submissionsKey(formId) {
  return `${SUBMISSIONS_PREFIX}${formId}`;
}

export function submissionsRecordsKey(formId) {
  return `${SUBMISSIONS_PREFIX}${formId}:records`;
}

function newestFirst(a, b) {
  return new Date(b.createdAt) - new Date(a.createdAt);
}

export async function listSubmissions(formId) {
  const records = await kvHashAll(submissionsRecordsKey(formId));
  const legacy = await kvGet(submissionsKey(formId), []);
  const legacyList = Array.isArray(legacy) ? legacy.filter((entry) => entry?.id) : [];
  if (legacyList.length > 0) {
    const missing = legacyList.filter((entry) => !records[entry.id]);
    await Promise.all(
      missing.map((entry) => kvHashSet(submissionsRecordsKey(formId), entry.id, entry))
    );
    for (const entry of missing) records[entry.id] = entry;
    if (legacyList.every((entry) => records[entry.id])) await kvDel(submissionsKey(formId));
  }
  return Object.values(records).filter(Boolean).sort(newestFirst);
}

export async function saveSubmission(formId, submission) {
  await kvHashSet(submissionsRecordsKey(formId), submission.id, submission);
  return submission;
}

export async function deleteSubmission(formId, id) {
  await kvHashDel(submissionsRecordsKey(formId), id);
  const legacy = await kvGet(submissionsKey(formId), []);
  if (Array.isArray(legacy) && legacy.some((entry) => entry?.id === id)) {
    await kvSet(submissionsKey(formId), legacy.filter((entry) => entry?.id !== id));
  }
}

export async function clearSubmissions(formId) {
  const records = await kvHashAll(submissionsRecordsKey(formId));
  await Promise.all(Object.keys(records).map((field) => kvHashDel(submissionsRecordsKey(formId), field)));
  await kvDel(submissionsKey(formId));
}

export function cooldownHours(form) {
  const raw = form?.settings?.cooldownHours;
  const hours = Number(raw);
  return Number.isFinite(hours) && hours > 0 ? hours : 0;
}

export function memberSubmission(submissions, username) {
  if (!username) return null;
  return (
    (submissions || [])
      .filter((entry) => entry.memberUsername === username)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] || null
  );
}

export function reapplyAvailableAt(form, submission) {
  const hours = cooldownHours(form);
  if (!submission || hours <= 0) return null;
  const base = submission.reviewedAt || submission.createdAt;
  const time = new Date(base).getTime();
  if (Number.isNaN(time)) return null;
  return new Date(time + hours * 60 * 60 * 1000).toISOString();
}

export function applicationGate(form, submission, now = Date.now()) {
  if (!submission) return { status: "none", canApply: true, submission: null, availableAt: null };

  if (submission.status === "accepted") {
    return { status: "accepted", canApply: false, submission, availableAt: null };
  }

  if (submission.status === "denied") {
    const availableAt = reapplyAvailableAt(form, submission);
    const ready = !availableAt || new Date(availableAt).getTime() <= now;
    return { status: "denied", canApply: ready, submission, availableAt };
  }

  return { status: "pending", canApply: false, submission, availableAt: null };
}

export const STATUS_TEXT = {
  pending: "You've already responded. You will be contacted soon if you have been selected for the role.",
  accepted: "You've been accepted for this role. Your application is locked — an admin would need to delete it before you could apply again.",
  denied: "Your application was rejected.",
};
