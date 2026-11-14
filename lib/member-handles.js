import crypto from "node:crypto";
import { isUsernameTaken } from "@/lib/members";

const MAX_BASE = 20;

function sanitize(value) {
  return String(value || "")
    .replace(/[^A-Za-z0-9._-]/g, "")
    .replace(/^[._-]+/, "")
    .slice(0, MAX_BASE);
}

export function suggestedBase(email, name) {
  const local = String(email || "").split("@")[0] || "";
  let base = sanitize(local);

  if (base.length < 3) {
    const fromName = sanitize(name);
    base = fromName.length >= 3 ? fromName : "member";
  }
  if (!/^[A-Za-z0-9]/.test(base)) base = `m${base}`.slice(0, MAX_BASE);
  return base;
}

async function unique(base) {
  let candidate = base;
  let suffix = 2;
  while (await isUsernameTaken(candidate)) {
    if (suffix > 40) {
      candidate = `member-${crypto.randomBytes(3).toString("hex")}`;
      break;
    }
    candidate = `${base.slice(0, 12)}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

export async function availableUsername(email, name) {
  return unique(suggestedBase(email, name));
}

export async function availableUsernameFrom(preferred, email, name) {
  const base = sanitize(preferred);
  if (base.length >= 3) return unique(base);
  return availableUsername(email, name);
}
