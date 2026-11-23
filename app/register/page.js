import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AuthFlip from "@/components/AuthFlip";
import { memberFromCookieStore } from "@/lib/members";
import { isGoogleConfigured } from "@/lib/google";
import { isDiscordConfigured } from "@/lib/discord";

export const dynamic = "force-dynamic";

export const metadata = { title: "Register" };

function safeNext(value) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return "/positions";
  return value;
}

export default async function RegisterPage({ searchParams }) {
  const query = await searchParams;
  const next = safeNext(query?.next);
  const member = await memberFromCookieStore(cookies());
  if (member) redirect(next);

  return (
    <AuthFlip
      initialFace="register"
      next={next}
      googleEnabled={isGoogleConfigured()}
      discordEnabled={isDiscordConfigured()}
    />
  );
}
