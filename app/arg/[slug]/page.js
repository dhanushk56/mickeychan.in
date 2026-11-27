import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { memberFromCookieStore } from "@/lib/members";
import { socialMeta } from "@/lib/metadata";
import {
  cluesForViewer,
  listClues,
  listPuzzles,
  listStorylines,
  readProgress,
  storyProgress,
  storyStatusMeta,
} from "@/lib/arg";
import PuzzleCard from "@/components/arg/PuzzleCard";
import LocalTime from "@/components/LocalTime";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function findStoryline(slug) {
  const storylines = await listStorylines();
  return storylines.find((entry) => entry.slug === slug || entry.id === slug) || null;
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const storyline = await findStoryline(slug);
  if (!storyline) return { title: "Mystery not found" };

  const description = storyline.blurb || "A mystery on Mickey Chan: clues, locks and everything found so far.";
  return {
    title: storyline.title,
    description,
    alternates: { canonical: `/arg/${storyline.slug}` },
    // A mystery that has not opened yet stays out of search results until it is
    // running or closed, so a trail is never spoiled by a preview.
    robots:
      storyline.status === "upcoming"
        ? { index: false, follow: false }
        : { index: true, follow: true },
    ...socialMeta({
      title: `${storyline.title} | Mickey Chan`,
      description,
      path: `/arg/${storyline.slug}`,
    }),
  };
}

export default async function MysteryPage({ params }) {
  const { slug } = await params;
  const storyline = await findStoryline(slug);
  if (!storyline) notFound();

  const member = await memberFromCookieStore(await cookies()).catch(() => null);
  const [clues, puzzles] = await Promise.all([listClues(), listPuzzles()]);
  const progress = await readProgress(member?.username);

  const myClues = clues
    .filter((clue) => clue.storylineId === storyline.id)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const myPuzzles = puzzles
    .filter((puzzle) => puzzle.storylineId === storyline.id)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const view = cluesForViewer(myClues, progress);
  const stats = storyProgress(storyline, puzzles, progress);
  const status = storyStatusMeta(storyline.status);
  const percent = stats.total > 0 ? Math.round((stats.opened / stats.total) * 100) : 0;

  return (
    <main className="page">
      <div className="shell" style={{ maxWidth: "56rem" }}>
        <nav className="faint text-xs mb-4" aria-label="Breadcrumb">
          <Link href="/arg" className="hover:underline">
            The ARG
          </Link>
          <span aria-hidden="true"> / </span>
          <span>{storyline.title}</span>
        </nav>

        <header className="arg-detail-head">
          <div className="arg-card-top">
            <span className={`badge ${status.badge}`}>{status.label}</span>
            <span className="faint text-xs">{storyline.difficulty}</span>
          </div>
          <h1 className="display-lg mt-3 mb-3">{storyline.title}</h1>
          <p className="muted text-lg leading-relaxed">{storyline.blurb}</p>

          <dl className="arg-meta">
            <div>
              <dt>Opened</dt>
              <dd>{storyline.startedAt ? <LocalTime iso={storyline.startedAt} /> : "Not dated"}</dd>
            </div>
            <div>
              <dt>Closed</dt>
              <dd>{storyline.endedAt ? <LocalTime iso={storyline.endedAt} /> : "Still running"}</dd>
            </div>
            <div>
              <dt>Locks</dt>
              <dd>
                {member ? `${stats.opened} of ${stats.total}` : stats.total}
              </dd>
            </div>
          </dl>

          <div className="arg-progress" aria-hidden="true">
            <span style={{ width: `${percent}%` }} />
          </div>

          {!member && (
            <p className="faint text-xs mt-2">
              <Link href="/login?next=%2Farg" className="underline">
                Log in
              </Link>{" "}
              to open locks and keep your place.
            </p>
          )}
        </header>

        <section className="arg-section" aria-labelledby="clues-heading">
          <div className="arg-section-head">
            <h2 id="clues-heading" className="font-display font-bold text-xl">
              Clues
            </h2>
            <span className="faint text-xs">{view.length} in this trail</span>
          </div>

          {view.length === 0 ? (
            <div className="glass-card hub-empty">
              <p className="font-display font-bold">No clues published yet</p>
              <p className="muted text-sm">They appear here the moment they go up.</p>
            </div>
          ) : (
            <ol className="arg-clue-list">
              {view.map((clue, index) => (
                <li key={clue.id} className="glass-card arg-clue" data-locked={clue.locked}>
                  <p className="faint text-xs">Clue {index + 1}</p>
                  <p className="font-semibold">{clue.title}</p>
                  {clue.locked ? (
                    <p className="muted text-sm mt-1 arg-locked">
                      Sealed. Open the lock this clue hangs from and its text appears here.
                    </p>
                  ) : (
                    <p className="muted text-sm mt-1">{clue.body}</p>
                  )}
                  {!clue.locked && clue.source ? (
                    <p className="faint text-xs mt-2">Found in: {clue.source}</p>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="arg-section" aria-labelledby="locks-heading">
          <div className="arg-section-head">
            <h2 id="locks-heading" className="font-display font-bold text-xl">
              Locks
            </h2>
            <span className="faint text-xs">
              {myPuzzles.length} {myPuzzles.length === 1 ? "question" : "questions"}
            </span>
          </div>

          {myPuzzles.length === 0 ? (
            <div className="glass-card hub-empty">
              <p className="font-display font-bold">No locks in this one</p>
              <p className="muted text-sm">This trail is clues only, for now.</p>
            </div>
          ) : (
            <div className="arg-grid">
              {myPuzzles.map((puzzle) => (
                <PuzzleCard
                  key={puzzle.id}
                  puzzle={{
                    id: puzzle.id,
                    title: puzzle.title,
                    prompt: puzzle.prompt,
                    hint: puzzle.hint,
                    choices: puzzle.choices,
                    message: puzzle.message,
                    points: puzzle.points,
                  }}
                  solved={progress.solved.includes(puzzle.id)}
                  openedClues={view.filter((clue) => clue.puzzleId === puzzle.id && !clue.locked)}
                />
              ))}
            </div>
          )}
        </section>

        <section className="arg-section">
          <div className="glass-card arg-theories">
            <div>
              <p className="font-display font-bold">Working it out with other people</p>
              <p className="muted text-sm mt-1">
                The theories thread runs on the forums. Post what you have, read what you do not,
                and mark anything you solve so it can be checked.
              </p>
            </div>
            <Link href="/forums?category=theories" className="btn btn-secondary btn-sm">
              Open the theories board
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
