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

// --- Recruitment stages -----------------------------------------------------
// One list drives the admin buttons, the applicant-facing copy and the
// timeline, so a stage can never look or behave differently in two places.

export const APPLICATION_STATUSES = [
  {
    id: "pending",
    label: "Pending",
    badge: "badge-pending",
    title: "You've already responded",
    applicant: "Your application is in the queue.",
    done: false,
  },
  {
    id: "shortlist",
    label: "Shortlisted",
    badge: "badge-pending",
    title: "You've been shortlisted",
    applicant: "You've been shortlisted. The team will be in touch about the next step.",
    done: false,
  },
  {
    id: "interview",
    label: "Interview",
    badge: "badge-neutral",
    title: "You've reached the interview",
    applicant: "You've reached the interview stage. Watch your inbox for a time to talk.",
    done: false,
  },
  {
    id: "accepted",
    label: "Accepted",
    badge: "badge-accepted",
    title: "You've been accepted",
    applicant:
      "You've been accepted for this role. Your application is locked, and an admin would need to delete it before you could apply again.",
    done: true,
  },
  {
    id: "denied",
    label: "Rejected",
    badge: "badge-denied",
    title: "Your application was rejected",
    applicant: "Your application was rejected.",
    done: true,
  },
  {
    id: "withdrawn",
    label: "Withdrawn",
    badge: "badge-neutral",
    title: "You withdrew this application",
    applicant: "You withdrew this application. You can apply again whenever you like.",
    done: true,
  },
];

const STATUS_IDS = APPLICATION_STATUSES.map((entry) => entry.id);

export function isValidStatus(status) {
  return STATUS_IDS.includes(status);
}

export function statusMeta(status) {
  return APPLICATION_STATUSES.find((entry) => entry.id === status) || APPLICATION_STATUSES[0];
}

export const STATUS_TEXT = Object.fromEntries(
  APPLICATION_STATUSES.map((entry) => [entry.id, entry.applicant])
);

// --- Job metadata -----------------------------------------------------------
// Stored in form.settings.job so the application form keeps working exactly as
// it did before this existed (every field is optional).

export const JOB_FIELDS = [
  { id: "department", label: "Department", placeholder: "e.g. Editing", multiline: false },
  { id: "location", label: "Location", placeholder: "e.g. Remote", multiline: false },
  { id: "commitment", label: "Time commitment", placeholder: "e.g. 6–8 hours a week", multiline: false },
  { id: "availability", label: "Availability", placeholder: "e.g. Weekday evenings, IST", multiline: false },
  { id: "deadline", label: "Applications close", placeholder: "", multiline: false, type: "date" },
  { id: "responsibilities", label: "Responsibilities", placeholder: "One per line", multiline: true },
  { id: "requirements", label: "Requirements", placeholder: "One per line", multiline: true },
];

const JOB_MAX = {
  department: 80,
  location: 80,
  commitment: 80,
  availability: 80,
  deadline: 10,
  responsibilities: 1200,
  requirements: 1200,
};

export function normalizeJob(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  const job = {};
  for (const field of JOB_FIELDS) {
    const value = String(source[field.id] ?? "").trim().slice(0, JOB_MAX[field.id]);
    job[field.id] = field.type === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(value) ? "" : value;
  }
  return job;
}

export function jobMeta(form) {
  return normalizeJob(form?.settings?.job);
}

export function jobDeadline(form) {
  const job = jobMeta(form);
  if (!job.deadline) return null;
  const date = new Date(`${job.deadline}T23:59:59.999`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function jobIsOpen(form, now = Date.now()) {
  const deadline = jobDeadline(form);
  if (!deadline) return true;
  return deadline.getTime() >= now;
}

export function jobLines(value) {
  return String(value || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function jobSummary(form) {
  const job = jobMeta(form);
  const rows = [];
  if (job.department) rows.push({ label: "Department", value: job.department });
  if (job.location) rows.push({ label: "Location", value: job.location });
  if (job.commitment) rows.push({ label: "Commitment", value: job.commitment });
  if (job.availability) rows.push({ label: "Availability", value: job.availability });
  if (job.deadline) {
    const date = new Date(`${job.deadline}T23:59:59.999`);
    rows.push({
      label: "Applications close",
      value: Number.isNaN(date.getTime()) ? job.deadline : date.toLocaleDateString(),
    });
  }
  return rows;
}

// --- Application timeline ---------------------------------------------------

function normalizeEvent(event) {
  if (!event || typeof event !== "object") return null;
  const status = isValidStatus(event.status) ? event.status : "pending";
  const at = new Date(event.at || Date.now()).getTime();
  return {
    status,
    at: new Date(Number.isNaN(at) ? Date.now() : at).toISOString(),
    by: typeof event.by === "string" && event.by ? event.by.slice(0, 60) : "",
    note: typeof event.note === "string" ? event.note.slice(0, 500) : "",
  };
}

export function submissionTimeline(submission) {
  const events = Array.isArray(submission?.events)
    ? submission.events.map(normalizeEvent).filter(Boolean)
    : [];
  if (events.length) return events;
  if (!submission?.createdAt) return [];
  return [{ status: "pending", at: submission.createdAt, by: "", note: "" }];
}

export function withTimelineEvent(submission, event) {
  const next = normalizeEvent(event);
  if (!next) return submission;
  const events = [...submissionTimeline(submission), next].slice(-40);
  return { ...submission, events };
}

// --- Applicant gate ---------------------------------------------------------

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

  if (submission.status === "withdrawn") {
    return { status: "withdrawn", canApply: true, submission, availableAt: null };
  }

  if (submission.status === "accepted") {
    return { status: "accepted", canApply: false, submission, availableAt: null };
  }

  if (submission.status === "denied") {
    const availableAt = reapplyAvailableAt(form, submission);
    const ready = !availableAt || new Date(availableAt).getTime() <= now;
    return { status: "denied", canApply: ready, submission, availableAt };
  }

  const status = isValidStatus(submission.status) ? submission.status : "pending";
  return { status, canApply: false, submission, availableAt: null };
}
