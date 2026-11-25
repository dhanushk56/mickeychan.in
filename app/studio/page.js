import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { kvGet } from "@/lib/kv";
import { STUDIO_KEY, initials, readStudio, sortedNotes, sortedUpcoming } from "@/lib/studio";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Studio",
  description:
    "Who works on the channel, what is being made next, notes from behind the scenes, and what you need to write about it or work with it.",
  alternates: { canonical: "/studio" },
};

function dayLabel(value) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
}

export default async function StudioPage() {
  noStore();

  const studio = readStudio(await kvGet(STUDIO_KEY, {}));
  const upcoming = sortedUpcoming(studio);
  const notes = sortedNotes(studio);

  return (
    <main className="page">
      <div className="shell grid gap-8">
        <header className="glass-card p-6 grid gap-4">
          <p className="kicker">Studio</p>
          <h1 className="display-lg">The people and the work behind it.</h1>
          <p className="muted" style={{ maxWidth: "44rem" }}>
            Who works on the channel, what is on the way, notes from the edit, and the short version for anyone
            writing about the channel or working with it.
          </p>
          <nav className="flex flex-wrap gap-2" aria-label="Studio sections">
            <a href="#team" className="btn btn-secondary btn-sm">
              Team
            </a>
            <a href="#upcoming" className="btn btn-secondary btn-sm">
              Coming up
            </a>
            <a href="#behind-the-scenes" className="btn btn-secondary btn-sm">
              Behind the scenes
            </a>
            <a href="#media-kit" className="btn btn-secondary btn-sm">
              Media kit
            </a>
          </nav>
        </header>

        <section id="team" className="glass-card p-6 grid gap-4">
          <h2 className="font-display font-bold text-xl">Team</h2>
          {studio.team.length === 0 ? (
            <p className="muted text-sm">
              No profiles are up yet. When someone joins the channel and wants a page, they land here.
            </p>
          ) : (
            <div className="grid gap-4 story-grid">
              {studio.team.map((member) => (
                <article key={member.id} className="glass-inset p-5 grid gap-2">
                  <div className="flex items-center gap-3">
                    <span className="badge badge-neutral">{initials(member.name)}</span>
                    <div>
                      <p className="font-display font-bold">{member.name}</p>
                      {member.role && <p className="muted text-sm">{member.role}</p>}
                    </div>
                  </div>
                  {member.bio && <p className="text-sm">{member.bio}</p>}
                  {member.link && (
                    <a className="text-sm font-bold" href={member.link} rel="me noopener noreferrer">
                      Find them elsewhere
                    </a>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        <section id="upcoming" className="glass-card p-6 grid gap-4">
          <h2 className="font-display font-bold text-xl">Coming up</h2>
          {upcoming.length === 0 ? (
            <p className="muted text-sm">
              Nothing is scheduled in public yet. New videos show up on the videos page as they go out.
            </p>
          ) : (
            <div className="panel-list">
              {upcoming.map((entry) => (
                <article key={entry.id} className="panel-item grid gap-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-display font-bold">{entry.title}</p>
                    {entry.when && <span className="muted text-sm">{dayLabel(entry.when)}</span>}
                  </div>
                  {entry.note && <p className="muted text-sm">{entry.note}</p>}
                </article>
              ))}
            </div>
          )}
        </section>

        <section id="behind-the-scenes" className="glass-card p-6 grid gap-4">
          <h2 className="font-display font-bold text-xl">Behind the scenes</h2>
          {notes.length === 0 ? (
            <p className="muted text-sm">No notes yet.</p>
          ) : (
            <div className="panel-list">
              {notes.map((note) => (
                <article key={note.id} className="panel-item grid gap-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-display font-bold">{note.title || "Note"}</p>
                    {note.at && <span className="muted text-sm">{dayLabel(note.at)}</span>}
                  </div>
                  {note.text && (
                    <p className="text-sm" style={{ whiteSpace: "pre-line" }}>
                      {note.text}
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        <section id="media-kit" className="glass-card p-6 grid gap-4">
          <h2 className="font-display font-bold text-xl">Media kit</h2>
          <p className="muted text-sm" style={{ maxWidth: "44rem" }}>
            Mickey Chan makes Minecraft videos: builds, redstone, and the odd long-form project. Everything is
            published on the channel itself, with the same handle everywhere it appears.
          </p>
          <dl className="grid gap-3">
            <div>
              <dt className="field-label">What it covers</dt>
              <dd className="text-sm">Minecraft builds, redstone and survival projects, explained as they are made.</dd>
            </div>
            <div>
              <dt className="field-label">Where it publishes</dt>
              <dd className="text-sm">
                <Link href="/socials" className="font-bold">
                  Every platform is listed here
                </Link>
                .
              </dd>
            </div>
            <div>
              <dt className="field-label">Working together</dt>
              <dd className="text-sm">
                <Link href="/contact" className="font-bold">
                  Send a message
                </Link>{" "}
                and it reaches the inbox the channel reads. Ask for current audience figures there, since they move
                week to week.
              </dd>
            </div>
          </dl>
          <div className="flex flex-wrap gap-2">
            <Link href="/contact" className="btn btn-primary btn-sm">
              Get in touch
            </Link>
            <Link href="/videos" className="btn btn-secondary btn-sm">
              See the videos
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
