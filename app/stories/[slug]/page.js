import Link from "next/link";
import { notFound } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { kvGet } from "@/lib/kv";
import Breadcrumbs from "@/components/Breadcrumbs";
import { STORIES_KEY, findStory, isPublic, readStories, sortedBeats, statusMeta } from "@/lib/stories";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function dayLabel(value) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const story = findStory(readStories(await kvGet(STORIES_KEY, [])), slug);
  if (!story || !isPublic(story)) return { title: "Story not found" };
  return {
    title: story.title,
    description: story.summary,
    alternates: { canonical: `/stories/${story.slug}` },
  };
}

export default async function StoryPage({ params }) {
  noStore();

  const { slug } = await params;
  const story = findStory(readStories(await kvGet(STORIES_KEY, [])), slug);
  if (!story || !isPublic(story)) notFound();

  const beats = sortedBeats(story);
  const meta = statusMeta(story.status);

  return (
    <main className="page">
      <div className="shell grid gap-6">
        <Breadcrumbs items={[{ label: "Stories", href: "/stories" }, { label: story.title }]} />

        <header className="glass-card p-6 grid gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="kicker">Story</p>
            <span className={`badge ${meta.badge}`}>{meta.label}</span>
          </div>
          <h1 className="display-lg">{story.title}</h1>
          <p className="muted" style={{ maxWidth: "44rem" }}>
            {story.summary}
          </p>
        </header>

        <section className="glass-card p-6 grid gap-4">
          <h2 className="font-display font-bold text-xl">What happened</h2>
          {beats.length === 0 ? (
            <p className="muted text-sm">No beats written down yet.</p>
          ) : (
            <div className="panel-list">
              {beats.map((beat) => (
                <article key={beat.id} className="panel-item grid gap-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-display font-bold">{beat.title || "Untitled beat"}</p>
                    {beat.at && <span className="muted text-sm">{dayLabel(beat.at)}</span>}
                  </div>
                  {beat.text && <p className="text-sm" style={{ whiteSpace: "pre-line" }}>{beat.text}</p>}
                </article>
              ))}
            </div>
          )}
        </section>

        <div className="glass-card p-6 grid gap-3">
          <p className="font-display font-bold">Spot something we missed?</p>
          <p className="muted text-sm">
            Threads about this arc go in the forums, where everyone can add to them.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href="/forums" className="btn btn-primary btn-sm">
              Open the forums
            </Link>
            <Link href="/stories" className="btn btn-secondary btn-sm">
              Back to all stories
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
