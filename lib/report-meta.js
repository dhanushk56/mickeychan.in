// Labels and limits for forum reports. Kept apart from the storage module so a
// client component can import them without pulling in the key-value client.

export const MAX_NOTE = 300;

export const REPORT_REASONS = [
  { id: "spam", label: "Spam or advertising" },
  { id: "harassment", label: "Harassment" },
  { id: "private", label: "Shares private details" },
  { id: "unsafe", label: "Unsafe or adult content" },
  { id: "other", label: "Something else" },
];

export const REPORT_STATUSES = ["open", "handled"];

export function reasonLabel(id) {
  return REPORT_REASONS.find((entry) => entry.id === id)?.label || "Something else";
}
