import { createRecord, deleteRecord, listRecords, saveRecord } from "@/lib/record-store";
import { kvHashDel, kvHashSetOnce } from "@/lib/kv";
import {
  MAX_MESSAGE,
  MAX_NOTE,
  MAX_SUBJECT,
  categoryMeta,
  isEnquiryCategory,
  isEnquiryStatus,
  statusMeta,
} from "@/lib/enquiry-meta";

export {
  ENQUIRY_CATEGORIES,
  ENQUIRY_STATUSES,
  MAX_MESSAGE,
  MAX_NOTE,
  MAX_SUBJECT,
  categoryMeta,
  isEnquiryCategory,
  isEnquiryStatus,
  statusMeta,
} from "@/lib/enquiry-meta";

const LEGACY_KEY = "enquiries:list";
const RECORDS_KEY = "enquiries:records";
const REFS_KEY = "enquiry:refs";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REFERENCE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function normalizeEnquiry(input = {}) {
  const created = new Date(input.createdAt || Date.now()).getTime();
  const category = isEnquiryCategory(input.category) ? input.category : "general";
  return {
    id: typeof input.id === "string" && input.id ? input.id.slice(0, 60) : crypto.randomUUID(),
    reference: typeof input.reference === "string" ? input.reference.slice(0, 16) : "",
    name: String(input.name ?? "").trim().slice(0, 80),
    email: String(input.email ?? "").trim().toLowerCase().slice(0, 254),
    category,
    subject: String(input.subject ?? "").trim().slice(0, MAX_SUBJECT),
    message: String(input.message ?? "").trim().slice(0, MAX_MESSAGE),
    status: isEnquiryStatus(input.status) ? input.status : "new",
    note: String(input.note ?? "").trim().slice(0, MAX_NOTE),
    memberUsername: input.memberUsername ? String(input.memberUsername).slice(0, 40) : null,
    ip: input.ip ? String(input.ip).slice(0, 60) : null,
    city: input.city ? String(input.city).slice(0, 80) : null,
    country: input.country ? String(input.country).slice(0, 80) : null,
    handledBy: input.handledBy ? String(input.handledBy).slice(0, 40) : null,
    createdAt: new Date(Number.isNaN(created) ? Date.now() : created).toISOString(),
    updatedAt: input.updatedAt ? new Date(input.updatedAt).toISOString() : null,
  };
}

export function enquiryProblem({ name, email, subject, message }) {
  if (String(name || "").trim().length < 2) return "Tell us the name we should reply to.";
  if (!EMAIL_PATTERN.test(String(email || "").trim())) return "That email address doesn't look right.";
  if (String(subject || "").trim().length < 3) return "Add a short subject.";
  if (String(message || "").trim().length < 10) return "Add a little more detail to your message.";
  return null;
}

export function listEnquiries() {
  return listRecords(LEGACY_KEY, RECORDS_KEY);
}

export async function findEnquiry(id) {
  if (!id) return null;
  const list = await listEnquiries();
  return list.find((entry) => entry.id === id) || null;
}

function newReference() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  let body = "";
  for (const byte of bytes) body += REFERENCE_ALPHABET[byte % REFERENCE_ALPHABET.length];
  return `MC-${body}`;
}

export async function createEnquiry(input) {
  const enquiry = normalizeEnquiry(input);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    // The ref hash gives us a unique handle for people who wrote in without an
    // account, without exposing the internal record id.
    const reference = newReference();
    const claimed = await kvHashSetOnce(REFS_KEY, reference, enquiry.id);
    if (!claimed) continue;

    enquiry.reference = reference;
    const created = await createRecord(RECORDS_KEY, enquiry.id, enquiry);
    if (!created) {
      await kvHashDel(REFS_KEY, reference);
      return null;
    }
    return enquiry;
  }

  return null;
}

export async function updateEnquiry(id, patch = {}) {
  const existing = await findEnquiry(id);
  if (!existing) return null;

  const next = normalizeEnquiry({
    ...existing,
    ...(isEnquiryStatus(patch.status) ? { status: patch.status } : {}),
    ...(patch.note !== undefined ? { note: patch.note } : {}),
    handledBy: patch.handledBy || existing.handledBy,
    updatedAt: new Date().toISOString(),
  });

  await saveRecord(RECORDS_KEY, next.id, next);
  return next;
}

export async function deleteEnquiry(id) {
  const existing = await findEnquiry(id);
  if (!existing) return null;
  await deleteRecord(RECORDS_KEY, id);
  if (existing.reference) await kvHashDel(REFS_KEY, existing.reference);
  return existing;
}
