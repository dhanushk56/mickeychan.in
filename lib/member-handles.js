import crypto from "node:crypto";
import { isUsernameTaken } from "@/lib/members";

export function suggestedBase(email, name) {
  const local = String(email || "").split("@")[0] || "";
  let base = local
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "")
    .replace(/^[._-]+/, "")
    .slice(0, 20);

  if (base.length < 3) {
    const fromName = String(name || "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 20);
    base = fromName.length >= 3 ? fromName : "member";
  }
  if (!/^[a-z0-9]/.test(base)) base = `m${base}`.slice(0, 20);
  return base;
}

export async function availableUsername(email, name) {
  const base = suggestedBase(email, name);
  let candidate = base;
  let suffix = 2;
  while (await isUsernameTaken(candidate)) {
    if (suffix > 40) {
      candidate = `member-${crypto.randomBytes(3).toString("hex")}`;
      break;
    }
    candidate = `${base.slice(0, 16)}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}
