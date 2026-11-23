import { getSessionFromCookies } from "@/lib/auth";

export async function getSession() {
  const data = await getSessionFromCookies();
  if (!data) return { authenticated: false, user: null };
  return { authenticated: true, user: data.user };
}
