import { cookies } from "next/headers";
import { verifySessionToken, isAllowedDiscordId, sessionCookieName } from "@/lib/discord-auth";

// Server-side session read for use inside Server Components (app/admin/page.js,
// app/form-builder/page.js) via next/headers — does NOT run in the browser.
export function getSession() {
  const token = cookies().get(sessionCookieName())?.value;
  const data = verifySessionToken(token);
  if (!data) return { authenticated: false, authorized: false, user: null };
  return { authenticated: true, authorized: isAllowedDiscordId(data.id), user: data };
}
