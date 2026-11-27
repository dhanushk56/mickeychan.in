import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import PasswordReset from "@/components/PasswordReset";
import { memberFromCookieStore } from "@/lib/members";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Reset your password",
  robots: { index: false, follow: false },
};

export default async function ForgotPasswordPage() {
  const member = await memberFromCookieStore(cookies());
  if (member) redirect("/positions");

  return <PasswordReset />;
}
