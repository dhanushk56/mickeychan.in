import { cookies } from "next/headers";
import { verifySessionToken, sessionCookieName } from "@/lib/auth";

// Server-side session read for use inside Server Components (app/admin/page.js,
// app/form-builder/*) via next/headers — does NOT run in the browser.
export function getSession() {
  const token = cookies().get(sessionCookieName())?.value;
  const data = verifySessionToken(token);
  if (!data) return { authenticated: false, user: null };
  return { authenticated: true, user: data.user };
}
