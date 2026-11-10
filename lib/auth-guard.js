import { cookies } from "next/headers";
import { verifySessionToken, sessionCookieName } from "@/lib/auth";

export function getSession() {
  const token = cookies().get(sessionCookieName())?.value;
  const data = verifySessionToken(token);
  if (!data) return { authenticated: false, user: null };
  return { authenticated: true, user: data.user };
}
