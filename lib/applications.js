import { clearRecords, deleteRecord, listRecords, saveRecord } from "@/lib/record-store";

const SUBMISSIONS_PREFIX = "submissions:applications:";

function submissionsKey(formId) {
  return `${SUBMISSIONS_PREFIX}${formId}`;
}

function submissionsRecordsKey(formId) {
  return `${SUBMISSIONS_PREFIX}${formId}:records`;
}

export function listSubmissions(formId) {
  return listRecords(submissionsKey(formId), submissionsRecordsKey(formId));
}

export function saveSubmission(formId, submission) {
  return saveRecord(submissionsRecordsKey(formId), submission.id, submission);
}

export function deleteSubmission(formId, id) {
  return deleteRecord(submissionsRecordsKey(formId), id);
}

export function clearSubmissions(formId) {
  return clearRecords(submissionsRecordsKey(formId), submissionsKey(formId));
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

function reapplyAvailableAt(form, submission) {
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
