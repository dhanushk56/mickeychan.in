import crypto from "node:crypto";
import { kvDel, kvGet, kvSet } from "@/lib/kv";
import { sendEmail, verificationEmail } from "@/lib/email";
import { safeNextPath } from "@/lib/site-url";

const TOKEN_PREFIX = "members:verify:";
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export async function createEmailToken(member) {
  if (!member || !member.email) return null;
  const token = crypto.randomBytes(32).toString("hex");
  await kvSet(`${TOKEN_PREFIX}${token}`, {
    username: member.username,
    email: member.email,
    expires: Date.now() + TOKEN_TTL_MS,
  });
  return token;
}

export async function readEmailToken(token) {
  const value = String(token || "");
  if (!/^[a-f0-9]{64}$/.test(value)) return null;
  const record = await kvGet(`${TOKEN_PREFIX}${value}`, null);
  if (!record || typeof record !== "object") return null;
  if (!record.username || !record.expires || record.expires < Date.now()) return null;
  return record;
}

export async function consumeEmailToken(token) {
  const record = await readEmailToken(token);
  if (!record) return null;
  await kvDel(`${TOKEN_PREFIX}${String(token)}`);
  return record;
}

export async function sendVerificationEmail({ member, origin, next = "/positions" }) {
  const token = await createEmailToken(member);
  if (!token) return { error: "no_email" };
  const link = `${origin}/api/auth/verify?token=${token}&next=${encodeURIComponent(safeNextPath(next))}`;
  const message = verificationEmail({ username: member.name || member.username, url: link });
  return sendEmail({ to: member.email, subject: message.subject, html: message.html, text: message.text });
}
