import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import VerifyEmail from "@/components/VerifyEmail";
import { memberFromCookieStore } from "@/lib/members";
import { isEmailConfigured } from "@/lib/email";
import { EMAIL_VERIFICATION_REQUIRED } from "@/lib/features";

export const dynamic = "force-dynamic";

export const metadata = { title: "Verify your account" };

function safeNext(value) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return "/positions";
  return value;
}

export default async function VerifyPage({ searchParams }) {
  const next = safeNext(searchParams?.next);
  const member = await memberFromCookieStore(cookies());
  if (!member) redirect(`/login?next=${encodeURIComponent("/verify")}`);
  if (!EMAIL_VERIFICATION_REQUIRED || member.emailVerified) redirect(next);

  return (
    <VerifyEmail email={member.email || ""} next={next} emailConfigured={isEmailConfigured()} />
  );
}
