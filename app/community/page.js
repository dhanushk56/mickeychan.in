import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { listPolls, loadPollVotes, pollSummary } from "@/lib/polls";
import { listEvents, splitEvents } from "@/lib/events";
import { IDEA_STATUSES, ideaStatusMeta, listIdeas, rankIdeas } from "@/lib/ideas";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Community",
  description: "Polls, events and the idea board: everything you can take part in on MickeyChan.in.",
  alternates: { canonical: "/community" },
};

function dayParts(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { day: "?", month: "" };
  return {
    day: date.toLocaleDateString(undefined, { day: "numeric" }),
    month: date.toLocaleDateString(undefined, { month: "short" }),
  };
}

function timeLabel(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function CommunityPage() {
  noStore();

  const [polls, events, ideas] = await Promise.all([listPolls(), listEvents(), listIdeas()]);
  const openPolls = (
    await Promise.all(
      polls.map(async (poll) => pollSummary(poll, await loadPollVotes(poll.id), null))
    )
  ).filter((poll) => poll.open);
  const { upcoming } = splitEvents(events);
  const ranked = rankIdeas(ideas);
  const topIdeas = ranked.slice(0, 4);
  const next = upcoming[0] || null;
  const later = upcoming.slice(1, 4);
  const shipped = ideas.filter((idea) => idea.status === "shipped").length;

  return (
    <main className="page">
      <div className="shell hub-page">
        <header className="glass-card hub-hero">
          <div className="hub-hero-copy">
            <p className="kicker">Community</p>
            <h1 className="display-lg">Take part in what comes next.</h1>
            <p className="muted hub-hero-lead">
              Vote in a poll, back an idea you want made, or turn up to the next stream. Everything
              members can take part in lives here.
            </p>
            <div className="hub-actions">
              <Link href="/ideas" className="btn btn-primary btn-sm">
                Post an idea
              </Link>
              <Link href="/polls" className="btn btn-secondary btn-sm">
                Vote in a poll
              </Link>
            </div>
          </div>

          <ul className="hub-metrics">
            <li>
              <span className="hub-metric-value">{openPolls.length}</span>
              <span className="hub-metric-label">Polls open</span>
            </li>
            <li>
              <span className="hub-metric-value">{upcoming.length}</span>
              <span className="hub-metric-label">Events upcoming</span>
            </li>
            <li>
              <span className="hub-metric-value">{ideas.length}</span>
              <span className="hub-metric-label">Ideas on the board</span>
            </li>
            <li>
              <span className="hub-metric-value">{shipped}</span>
              <span className="hub-metric-label">Ideas shipped</span>
            </li>
          </ul>
        </header>

        <div className="hub-columns">
          <section className="glass-card hub-panel hub-panel-main">
            <header className="hub-panel-head">
              <div>
                <h2 className="font-display font-bold">Next on the calendar</h2>
                <p className="faint text-xs">Streams, sessions and anything else with a time on it.</p>
              </div>
              <Link href="/events" className="hub-panel-link">
                Full calendar
              </Link>
            </header>

            {next ? (
              <>
                <article className="hub-feature">
                  <span className="event-date" aria-hidden="true">
                    <span className="event-date-day">{dayParts(next.startsAt).day}</span>
                    <span className="event-date-month">{dayParts(next.startsAt).month}</span>
                  </span>
                  <div className="hub-feature-copy">
                    <h3 className="hub-feature-title">{next.title}</h3>
                    <p className="faint text-xs">{timeLabel(next.startsAt)}</p>
                    {next.location && <p className="muted text-sm">{next.location}</p>}
                    {next.description && <p className="hub-feature-note">{next.description}</p>}
                  </div>
                </article>

                {later.length > 0 && (
                  <ul className="hub-agenda">
                    {later.map((event) => (
                      <li key={event.id} className="hub-agenda-row">
                        <span className="hub-agenda-when">{timeLabel(event.startsAt)}</span>
                        <span className="hub-agenda-title">{event.title}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <p className="muted text-sm">
                Nothing is on the calendar right now. New streams get posted here first.
              </p>
            )}
          </section>

          <section className="glass-card hub-panel">
            <header className="hub-panel-head">
              <div>
                <h2 className="font-display font-bold">Open polls</h2>
                <p className="faint text-xs">One vote each, changeable while a poll runs.</p>
              </div>
              <Link href="/polls" className="hub-panel-link">
                All polls
              </Link>
            </header>

            {openPolls.length === 0 ? (
              <p className="muted text-sm">No polls are running right now.</p>
            ) : (
              <ul className="hub-rows">
                {openPolls.slice(0, 4).map((poll) => (
                  <li key={poll.id}>
                    <Link href="/polls" className="hub-row">
                      <span className="hub-row-title">{poll.question}</span>
                      <span className="hub-row-meta">
                        {poll.tally.total} {poll.tally.total === 1 ? "vote" : "votes"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <section className="glass-card hub-panel">
          <header className="hub-panel-head">
            <div>
              <h2 className="font-display font-bold">Most backed ideas</h2>
              <p className="faint text-xs">
                The board is ranked by backers, so the top of this list is what members want most.
              </p>
            </div>
            <Link href="/ideas" className="hub-panel-link">
              Open the board
            </Link>
          </header>

          {topIdeas.length === 0 ? (
            <p className="muted text-sm">The board is empty. Post the first idea.</p>
          ) : (
            <ol className="hub-ideas">
              {topIdeas.map((idea, index) => (
                <li key={idea.id} className="hub-idea">
                  <span className="hub-idea-rank">{index + 1}</span>
                  <div className="hub-idea-copy">
                    <span className="hub-idea-title">{idea.title}</span>
                    <span className="faint text-xs">
                      {idea.votes.length} {idea.votes.length === 1 ? "backer" : "backers"}
                    </span>
                  </div>
                  <span className={`badge ${ideaStatusMeta(idea.status).badge}`}>
                    {ideaStatusMeta(idea.status).label}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="hub-links" aria-label="Ways to take part">
          {[
            {
              href: "/polls",
              title: "Polls",
              copy: "Settle what gets made next with a single vote.",
            },
            {
              href: "/events",
              title: "Events",
              copy: "Every stream and session with a date and a time.",
            },
            {
              href: "/ideas",
              title: "Idea board",
              copy: "Suggest something and see how many members back it.",
            },
            {
              href: "/positions",
              title: "Open positions",
              copy: "Join the team behind the videos and the streams.",
            },
          ].map((entry) => (
            <Link key={entry.href} href={entry.href} className="glass-card hub-link">
              <span className="hub-link-title">{entry.title}</span>
              <span className="hub-link-copy">{entry.copy}</span>
              <span className="hub-link-go" aria-hidden="true">
                →
              </span>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
