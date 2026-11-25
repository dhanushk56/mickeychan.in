// Client-safe metadata only — no storage imports in this file.

export const ENQUIRY_CATEGORIES = [
  { id: "general", label: "General" },
  { id: "collaboration", label: "Collaboration" },
  { id: "sponsorship", label: "Sponsorship" },
  { id: "business", label: "Business" },
  { id: "suggestions", label: "Suggestions" },
  { id: "support", label: "Support" },
];

export const ENQUIRY_STATUSES = [
  { id: "new", label: "New", badge: "badge-pending" },
  { id: "open", label: "In progress", badge: "badge-neutral" },
  { id: "replied", label: "Replied", badge: "badge-accepted" },
  { id: "closed", label: "Closed", badge: "badge-neutral" },
  { id: "spam", label: "Spam", badge: "badge-denied" },
];

export const MAX_SUBJECT = 140;
export const MAX_MESSAGE = 5000;
export const MAX_NOTE = 1000;

export function categoryMeta(id) {
  return ENQUIRY_CATEGORIES.find((entry) => entry.id === id) || ENQUIRY_CATEGORIES[0];
}

export function statusMeta(id) {
  return ENQUIRY_STATUSES.find((entry) => entry.id === id) || ENQUIRY_STATUSES[0];
}

export function isEnquiryCategory(value) {
  return ENQUIRY_CATEGORIES.some((entry) => entry.id === value);
}

export function isEnquiryStatus(value) {
  return ENQUIRY_STATUSES.some((entry) => entry.id === value);
}
