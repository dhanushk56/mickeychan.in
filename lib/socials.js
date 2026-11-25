import { SOCIAL_ICON_IDS, socials as DEFAULT_SOCIALS } from "@/data/socials";
import { kvGet, kvSet } from "@/lib/kv";

export const SOCIALS_KEY = "content:socials";
export const MAX_SOCIALS = 12;
export const SOCIAL_ICONS = SOCIAL_ICON_IDS;

function text(value, max) {
  return String(value ?? "").trim().slice(0, max);
}

function safeHref(value) {
  const raw = text(value, 300);
  if (!raw) return "";
  if (/^mailto:/i.test(raw)) {
    return /^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(raw) ? raw : "";
  }
  try {
    const url = new URL(raw);
    if (!/^https?:$/.test(url.protocol)) return "";
    return url.toString();
  } catch {
    return "";
  }
}

function iconFor(entry, href) {
  if (SOCIAL_ICONS.includes(entry?.icon)) return entry.icon;
  const link = href.toLowerCase();
  if (link.startsWith("mailto:")) return "gmail";
  if (link.includes("youtube.com") || link.includes("youtu.be")) return "youtube";
  if (link.includes("instagram.com")) return "instagram";
  if (link.includes("discord.")) return "discord";
  return "";
}

export function defaultSocials() {
  return DEFAULT_SOCIALS.map((entry) => ({
    name: entry.name,
    short: entry.short || entry.name.split(" (")[0],
    href: entry.href,
    icon: entry.icon,
  }));
}

// A stored list is read through this, so a broken link or a missing label can
// never take the socials page down.
export function normalizeSocials(raw) {
  if (!Array.isArray(raw)) return defaultSocials();
  return raw
    .map((entry) => {
      const href = safeHref(entry?.href);
      const name = text(entry?.name, 80);
      if (!href || !name) return null;
      return {
        name,
        short: text(entry?.short, 40) || name.split(" (")[0],
        href,
        icon: iconFor(entry, href),
      };
    })
    .filter(Boolean)
    .slice(0, MAX_SOCIALS);
}

export async function getSocials() {
  const stored = await kvGet(SOCIALS_KEY, null);
  if (!Array.isArray(stored)) return defaultSocials();
  return normalizeSocials(stored);
}

export async function saveSocials(list) {
  const cleaned = normalizeSocials(list);
  await kvSet(SOCIALS_KEY, cleaned);
  return cleaned;
}
