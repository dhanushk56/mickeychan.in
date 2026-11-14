import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import MemberRegister from "@/components/MemberRegister";
import { memberFromCookieStore } from "@/lib/members";
import { isGoogleConfigured } from "@/lib/google";

export const dynamic = "force-dynamic";

export const metadata = { title: "Register" };

function safeNext(value) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return "/positions";
  return value;
}

export default async function RegisterPage({ searchParams }) {
  const next = safeNext(searchParams?.next);
  const member = await memberFromCookieStore(cookies());
  if (member) redirect(next);

  return <MemberRegister next={next} googleEnabled={isGoogleConfigured()} />;
}
