import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { listPolls, loadPollVotes, pollSummary } from "@/lib/polls";
import { listEvents, splitEvents } from "@/lib/events";
import { listIdeas, rankIdeas } from "@/lib/ideas";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Community",
  description: "Polls, events and the idea board — everything you can take part in.",
  alternates: { canonical: "/community" },
};

export default async function CommunityPage() {
  noStore();

  const [polls, events, ideas] = await Promise.all([listPolls(), listEvents(), listIdeas()]);
  const openPolls = (await Promise.all(
    polls.map(async (poll) => pollSummary(poll, await loadPollVotes(poll.id), null))
  )).filter((poll) => poll.open);
  const { upcoming } = splitEvents(events);
  const topIdeas = rankIdeas(ideas).slice(0, 3);

  return (
    <main className="page">
      <div className="shell" style={{ maxWidth: "56rem" }}>
        <div className="max-w-2xl mb-8">
          <p className="kicker">Community</p>
          <h1 className="display-lg mt-3 mb-4">Take part.</h1>
          <p className="muted text-lg leading-relaxed">
            Vote on what comes next, see what is on the calendar, and back an idea you want made.
            Members can also share playlists and a public profile from the dashboard.
          </p>
        </div>

        <div className="hub-grid">
          <section className="glass-card hub-card">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display font-bold">Polls</h2>
              <span className="badge badge-neutral">{openPolls.length} open</span>
            </div>
            {openPolls.length === 0 ? (
              <p className="muted text-sm">No polls running right now.</p>
            ) : (
              <ul className="hub-list">
                {openPolls.slice(0, 3).map((poll) => (
                  <li key={poll.id}>
                    <Link href="/polls" className="hub-list-item">
                      <span className="hub-item-title">{poll.question}</span>
                      <span className="faint text-xs">
                        {poll.tally.total} {poll.tally.total === 1 ? "vote" : "votes"} so far
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/polls" className="btn btn-secondary btn-sm">
              All polls
            </Link>
          </section>

          <section className="glass-card hub-card">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display font-bold">Events</h2>
              <span className="badge badge-neutral">{upcoming.length} upcoming</span>
            </div>
            {upcoming.length === 0 ? (
              <p className="muted text-sm">Nothing on the calendar yet.</p>
            ) : (
              <ul className="hub-list">
                {upcoming.slice(0, 3).map((event) => (
                  <li key={event.id}>
                    <Link href="/events" className="hub-list-item">
                      <span className="hub-item-title">{event.title}</span>
                      <span className="faint text-xs">
                        {new Date(event.startsAt).toLocaleString(undefined, {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/events" className="btn btn-secondary btn-sm">
              Full calendar
            </Link>
          </section>

          <section className="glass-card hub-card">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display font-bold">Idea board</h2>
              <span className="badge badge-neutral">{ideas.length} ideas</span>
            </div>
            {topIdeas.length === 0 ? (
              <p className="muted text-sm">No ideas yet — be the first to post one.</p>
            ) : (
              <ul className="hub-list">
                {topIdeas.map((idea) => (
                  <li key={idea.id}>
                    <Link href="/ideas" className="hub-list-item">
                      <span className="hub-item-title">{idea.title}</span>
                      <span className="faint text-xs">
                        {idea.votes.length} {idea.votes.length === 1 ? "backer" : "backers"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/ideas" className="btn btn-secondary btn-sm">
              Open the board
            </Link>
          </section>

          <section className="glass-card hub-card">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display font-bold">Your profile</h2>
              <span className="badge badge-neutral">Members</span>
            </div>
            <p className="muted text-sm leading-relaxed">
              Publish a public profile with your shared playlists, track what you have watched, and
              collect achievements as you go.
            </p>
            <Link href="/dashboard?tab=community" className="btn btn-secondary btn-sm">
              Open my dashboard
            </Link>
          </section>
        </div>
      </div>
    </main>
  );
}
