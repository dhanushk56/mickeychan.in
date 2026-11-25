import Link from "next/link";
import { cookies } from "next/headers";
import { unstable_noStore as noStore } from "next/cache";
import { memberFromCookieStore } from "@/lib/members";
import { listPolls, loadPollVotes, pollSummary } from "@/lib/polls";
import PollCard from "@/components/polls/PollCard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Polls",
  description: "Quick votes from the community: what to cover next, which clips to revisit, and more.",
  alternates: { canonical: "/polls" },
};

export default async function PollsPage() {
  noStore();

  const session = await memberFromCookieStore(cookies());
  const username = session?.username || null;
  const polls = await listPolls();
  const rows = await Promise.all(
    polls.map(async (poll) => pollSummary(poll, await loadPollVotes(poll.id), username))
  );

  const open = rows
    .filter((poll) => poll.open)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const closed = rows
    .filter((poll) => !poll.open)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <main className="page">
      <div className="shell" style={{ maxWidth: "52rem" }}>
        <div className="max-w-2xl mb-8">
          <p className="kicker">Polls</p>
          <h1 className="display-lg mt-3 mb-4">Your call.</h1>
          <p className="muted text-lg leading-relaxed">
            Short votes on what to make next. One answer each unless a poll says otherwise, and you
            can change your mind while it is open.
          </p>
        </div>

        {open.length === 0 && closed.length === 0 ? (
          <div className="glass-card hub-empty">
            <p className="font-display font-bold mb-2">No polls running</p>
            <p className="muted text-sm">
              Nothing to vote on right now. The next one shows up here as soon as it opens.
            </p>
            <Link href="/community" className="btn btn-secondary btn-sm">
              Back to community
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {open.map((poll) => (
              <PollCard key={poll.id} poll={poll} signedIn={!!username} />
            ))}

            {closed.length > 0 && (
              <>
                <h2 className="font-display font-bold mt-4">Closed</h2>
                {closed.map((poll) => (
                  <PollCard key={poll.id} poll={poll} signedIn={!!username} />
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
