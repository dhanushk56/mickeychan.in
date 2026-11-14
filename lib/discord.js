import { siteOrigin } from "@/lib/site-url";

export function isDiscordConfigured() {
  return Boolean(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET);
}

export function discordRedirectUri(request) {
  if (process.env.DISCORD_REDIRECT_URI) return process.env.DISCORD_REDIRECT_URI;
  return `${siteOrigin(request)}/api/auth/discord/callback`;
}

export function discordAuthorizationUrl({ redirectUri, state }) {
  const params = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID || "",
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "identify email",
    state,
  });
  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

export async function exchangeDiscordCode(code, redirectUri) {
  const response = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID || "",
      client_secret: process.env.DISCORD_CLIENT_SECRET || "",
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
    cache: "no-store",
  });
  if (!response.ok) return null;
  const data = await response.json().catch(() => null);
  return data && data.access_token ? data : null;
}

export async function discordProfile(accessToken) {
  const response = await fetch("https://discord.com/api/users/@me", {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) return null;
  const data = await response.json().catch(() => null);
  if (!data || !data.id) return null;
  return {
    id: String(data.id),
    email: typeof data.email === "string" ? data.email.trim().toLowerCase() : "",
    emailVerified: data.verified === true,
    username: typeof data.username === "string" ? data.username : "",
    name:
      typeof data.global_name === "string" && data.global_name
        ? data.global_name
        : typeof data.username === "string"
          ? data.username
          : "",
  };
}
