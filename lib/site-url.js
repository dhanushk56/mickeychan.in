export function siteOrigin(request) {
  const configured = process.env.SITE_URL;
  if (configured) return configured.replace(/\/+$/, "");

  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (host) {
    const forwarded = request.headers.get("x-forwarded-proto");
    const local = /^(localhost|127\.|\[::1\])/.test(host);
    return `${forwarded || (local ? "http" : "https")}://${host}`;
  }

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
