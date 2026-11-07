import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import MemberLogin from "@/components/MemberLogin";
import { hasMembers, memberFromCookieStore } from "@/lib/members";

export const dynamic = "force-dynamic";

export const metadata = { title: "Log in" };

function safeNext(value) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return "/positions";
  return value;
}

export default async function LoginPage({ searchParams }) {
  const next = safeNext(searchParams?.next);
  const member = await memberFromCookieStore(cookies());
  if (member) redirect(next);

  return <MemberLogin next={next} hasAccounts={await hasMembers()} />;
}
