import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { listEvents, splitEvents } from "@/lib/events";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Events",
  description: "Streams, premieres and meet-ups coming up, plus everything that has already happened.",
  alternates: { canonical: "/events" },
};

const DAY = new Intl.DateTimeFormat("en-GB", { day: "2-digit" });
const MONTH = new Intl.DateTimeFormat("en-GB", { month: "short" });

function whenLabel(event) {
  const start = new Date(event.startsAt);
  if (Number.isNaN(start.getTime())) return "";
  const startText = start.toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  if (!event.endsAt) return startText;
  const end = new Date(event.endsAt);
  if (Number.isNaN(end.getTime())) return startText;
  return `${startText} to ${end.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`;
}

function EventCard({ event, past }) {
  const start = new Date(event.startsAt);
  const day = Number.isNaN(start.getTime()) ? "-" : DAY.format(start);
  const month = Number.isNaN(start.getTime()) ? "" : MONTH.format(start).toUpperCase();

  return (
    <article className="glass-card event-card" data-past={past}>
      <div className="event-head">
        <div className="event-when">
          <span className="event-date" aria-hidden="true">
            <span className="event-date-day">{day}</span>
            <span className="event-date-month">{month}</span>
          </span>
          <span>{whenLabel(event)}</span>
        </div>
        <span className={`badge ${past ? "badge-neutral" : "badge-accepted"}`}>
          {past ? "Finished" : "Upcoming"}
        </span>
      </div>

      <h2 className="font-display font-bold event-title">{event.title}</h2>
      {event.description && <p className="muted text-sm leading-relaxed">{event.description}</p>}

      <div className="event-meta">
        {event.location && <span className="badge badge-neutral">{event.location}</span>}
        {event.url && (
          <a href={event.url} className="btn btn-secondary btn-sm" rel="noreferrer noopener" target="_blank">
            Details
          </a>
        )}
      </div>
    </article>
  );
}

export default async function EventsPage() {
  noStore();

  const events = await listEvents();
  const { upcoming, past } = splitEvents(events);

  return (
    <main className="page">
      <div className="shell" style={{ maxWidth: "52rem" }}>
        <div className="max-w-2xl mb-8">
          <p className="kicker">Events</p>
          <h1 className="display-lg mt-3 mb-4">Where to be.</h1>
          <p className="muted text-lg leading-relaxed">
            Streams, premieres and meet-ups, soonest first. Nothing here is a maybe, only events
            that are actually on the calendar.
          </p>
        </div>

        {upcoming.length === 0 && past.length === 0 ? (
          <div className="glass-card hub-empty">
            <p className="font-display font-bold">Nothing on the calendar</p>
            <p className="muted text-sm">The next stream or meet-up lands here once it is set.</p>
            <Link href="/hub" className="btn btn-secondary btn-sm">
              Back to hub
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            <h2 className="font-display font-bold">Upcoming</h2>
            {upcoming.length === 0 ? (
              <p className="muted text-sm">Nothing upcoming right now.</p>
            ) : (
              upcoming.map((event) => <EventCard key={event.id} event={event} past={false} />)
            )}

            {past.length > 0 && (
              <>
                <h2 className="font-display font-bold mt-4">Past</h2>
                {past.map((event) => (
                  <EventCard key={event.id} event={event} past />
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
