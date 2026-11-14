import crypto from "node:crypto";
import { kvDel, kvGet, kvSet } from "@/lib/kv";
import { otpEmail, sendEmail } from "@/lib/email";

const OTP_PREFIX = "members:otp:";
const OTP_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 30 * 1000;
const MAX_ATTEMPTS = 6;

function secret() {
  return process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || "dev-secret-change-me";
}

function keyFor(username) {
  return `${OTP_PREFIX}${String(username || "").trim().toLowerCase()}`;
}

function digest(username, code) {
  return crypto
    .createHmac("sha256", secret())
    .update(`${String(username).trim().toLowerCase()}:${code}`)
    .digest("hex");
}

export function normalizeCode(value) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length === 6 ? digits : "";
}

async function issueCode(member) {
  const key = keyFor(member.username);
  const existing = await kvGet(key, null);
  const now = Date.now();

  if (existing && existing.sentAt && now - existing.sentAt < RESEND_COOLDOWN_MS) {
    return {
      error: "cooldown",
      waitSeconds: Math.max(1, Math.ceil((RESEND_COOLDOWN_MS - (now - existing.sentAt)) / 1000)),
    };
  }

  const code = crypto.randomInt(0, 1000000).toString().padStart(6, "0");
  await kvSet(key, {
    hash: digest(member.username, code),
    email: member.email,
    expires: now + OTP_TTL_MS,
    attempts: 0,
    sentAt: now,
  });
  return { code };
}

export async function sendCodeEmail(member) {
  if (!member || !member.email) return { error: "no_email" };

  const issued = await issueCode(member);
  if (issued.error) return issued;

  const message = otpEmail({ username: member.name || member.username, code: issued.code });
  const sent = await sendEmail({
    to: member.email,
    subject: message.subject,
    html: message.html,
    text: message.text,
  });
  if (sent.error) return sent;

  return { ok: true };
}

export async function confirmCode(member, rawCode) {
  const code = normalizeCode(rawCode);
  if (!code) return { error: "Enter the 6-digit code from the email." };

  const key = keyFor(member.username);
  const record = await kvGet(key, null);
  if (!record || !record.expires || record.expires < Date.now()) {
    await kvDel(key);
    return { error: "That code has expired. Send a new one." };
  }
  if (record.attempts >= MAX_ATTEMPTS) {
    await kvDel(key);
    return { error: "Too many attempts. Send a new code." };
  }

  const expected = Buffer.from(String(record.hash || ""), "hex");
  const attempt = Buffer.from(digest(member.username, code), "hex");
  const matches =
    expected.length > 0 &&
    expected.length === attempt.length &&
    crypto.timingSafeEqual(expected, attempt);

  if (!matches) {
    await kvSet(key, { ...record, attempts: (record.attempts || 0) + 1 });
    return { error: "That code doesn't match. Check the email and try again." };
  }

  await kvDel(key);
  return { ok: true };
}
