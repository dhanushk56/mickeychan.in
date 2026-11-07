import Link from "next/link";
import { cookies } from "next/headers";
import { memberFromCookieStore } from "@/lib/members";
import JoinForm from "@/components/JoinForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "Start a conversation" };

const nextTarget = "/join";

export default async function JoinPage() {
  const member = await memberFromCookieStore(cookies());

  // Messages are only accepted from signed-in accounts, so which account sent
  // what is never a guess.
  if (!member) {
    return (
      <main className="page">
        <div className="shell" style={{ maxWidth: "34rem" }}>
          <div className="glass-card p-8 grid gap-3 animate-rise">
            <p className="kicker">Start a conversation</p>
            <h1 className="font-display text-2xl font-bold">Log in to send a message</h1>
            <p className="muted text-sm leading-relaxed">
              Messages are tied to an account so the team always knows who they&apos;re replying to —
              and so an application&apos;s accept or reject always lands on the right person.
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              <Link
                href={`/login?next=${encodeURIComponent(nextTarget)}`}
                className="btn btn-primary btn-sm"
              >
                Log in <span aria-hidden="true">↗</span>
              </Link>
              <Link
                href={`/register?next=${encodeURIComponent(nextTarget)}`}
                className="btn btn-secondary btn-sm"
              >
                Register Now
              </Link>
            </div>
            <p className="faint text-xs mt-2">
              Prefer email? Business and sponsorship enquiries go to business@mickeychan.in.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return <JoinForm member={member} />;
}
