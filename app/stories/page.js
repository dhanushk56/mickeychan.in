import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { kvGet } from "@/lib/kv";
import { STORIES_KEY, isPublic, readStories, sortStories, statusMeta } from "@/lib/stories";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Stories",
  description:
    "The story arcs from the channel, the clues people spotted, and the note that closed each one. A record of what happened, kept in order.",
  alternates: { canonical: "/stories" },
};

export default async function StoriesPage() {
  noStore();

  const stories = sortStories(readStories(await kvGet(STORIES_KEY, [])).filter(isPublic));
  const running = stories.filter((story) => story.status === "live");
  const wrapped = stories.filter((story) => story.status === "wrapped");

  function card(story) {
    const meta = statusMeta(story.status);
    return (
      <Link key={story.id} href={`/stories/${story.slug}`} className="glass-card p-5 grid gap-3 story-card">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`badge ${meta.badge}`}>{meta.label}</span>
          <span className="muted text-sm">
            {story.beats.length} beat{story.beats.length === 1 ? "" : "s"} · {story.clues.length} clue
            {story.clues.length === 1 ? "" : "s"}
          </span>
        </div>
        <p className="font-display font-bold text-lg">{story.title}</p>
        <p className="muted text-sm">{story.summary}</p>
        <span className="text-sm font-bold">Read the arc</span>
      </Link>
    );
  }

  return (
    <main className="page">
      <div className="shell grid gap-8">
        <header className="glass-card p-6 grid gap-4">
          <p className="kicker">Stories</p>
          <h1 className="display-lg">The story so far.</h1>
          <p className="muted" style={{ maxWidth: "44rem" }}>
            Each arc is written down in order, with the clues people spotted along the way and how it ended. It is
            the record of what happened, laid out plainly, with nothing to solve.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href="/forums" className="btn btn-primary btn-sm">
              Talk it over in the forums
            </Link>
            <Link href="/videos" className="btn btn-secondary btn-sm">
              Watch the videos
            </Link>
          </div>
        </header>

        {stories.length === 0 ? (
          <div className="empty-state">
            <p className="font-display font-bold">Nothing written up yet</p>
            <p className="muted text-sm max-w-md">
              When an arc opens, it lands here with its beats and clues. Until then, the forums are the place to
              talk.
            </p>
          </div>
        ) : (
          <>
            {running.length > 0 && (
              <section className="grid gap-4">
                <h2 className="font-display font-bold text-xl">Running now</h2>
                <div className="grid gap-4 story-grid">{running.map(card)}</div>
              </section>
            )}

            {wrapped.length > 0 && (
              <section className="grid gap-4">
                <h2 className="font-display font-bold text-xl">Finished arcs</h2>
                <div className="grid gap-4 story-grid">{wrapped.map(card)}</div>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
