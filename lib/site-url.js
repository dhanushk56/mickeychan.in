export function siteOrigin(request) {
  const configured = process.env.SITE_URL;
  if (configured) return configured.replace(/\/+$/, "");

  try {
    return new URL(request.url).origin;
  } catch {
    return "";
  }
}

export function safeNextPath(value, fallback = "/positions") {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}
