import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ThreadForm from "@/components/forums/ThreadForm";
import { memberFromCookieStore } from "@/lib/members";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "New thread",
  alternates: { canonical: "/forums/new" },
};

export default async function NewThreadPage() {
  const member = await memberFromCookieStore(await cookies()).catch(() => null);
  if (!member) redirect("/login?next=%2Fforums%2Fnew");

  return (
    <main className="page">
      <div className="shell" style={{ maxWidth: "46rem" }}>
        <Link href="/forums" className="faint text-xs hover:underline">
          ← Back to forums
        </Link>
        <div className="my-5">
          <p className="kicker">New thread</p>
          <h1 className="display-lg mt-3">Start with a title.</h1>
          <p className="muted text-sm mt-2">
            Posting as {member.name || member.username}. Plain text, paragraphs on blank lines.
          </p>
        </div>
        <ThreadForm />
      </div>
    </main>
  );
}
