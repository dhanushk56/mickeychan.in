import { getSessionFromCookies } from "@/lib/auth";

export function getSession() {
  const data = getSessionFromCookies();
  if (!data) return { authenticated: false, user: null };
  return { authenticated: true, user: data.user };
}
