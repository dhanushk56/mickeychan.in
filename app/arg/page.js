import Link from "next/link";
import { cookies } from "next/headers";
import { memberFromCookieStore } from "@/lib/members";
import { socialMeta } from "@/lib/metadata";
import {
  achievementsFor,
  cluesForViewer,
  listClues,
  listPuzzles,
  listStorylines,
  readProgress,
  storyProgress,
  storyStatusMeta,
} from "@/lib/arg";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const TITLE = "The ARG";
const DESCRIPTION =
  "Follow the mysteries: clues hidden in videos, locks that need a real answer, and progress that is saved to your account.";

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/arg" },
  ...socialMeta({ title: `${TITLE} | Mickey Chan`, description: DESCRIPTION, path: "/arg" }),
};

export default async function ArgPage() {
  const member = await memberFromCookieStore(await cookies()).catch(() => null);
  const [storylines, clues, puzzles] = await Promise.all([listStorylines(), listClues(), listPuzzles()]);
  const progress = await readProgress(member?.username);

  const active = storylines.filter((storyline) => storyline.status === "active");
  const upcoming = storylines.filter((storyline) => storyline.status === "upcoming");
  const finished = storylines.filter(
    (storyline) => storyline.status === "completed" || storyline.status === "archived"
  );
  const featured = active[0] || upcoming[0] || finished[0] || null;

  const visibleClues = cluesForViewer(clues, progress).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const recentClues = visibleClues.filter((clue) => !clue.locked).slice(0, 4);
  const solvedTotal = progress.solved.length;
  const achievements = achievementsFor({ storylines, puzzles, progress, clues });

  return (
    <main className="page">
      <div className="shell">
        <div className="arg-head">
          <p className="kicker">Alternate reality game</p>
          <h1 className="display-lg mt-3 mb-4">Something under the world is talking.</h1>
          <p className="muted text-lg leading-relaxed">
            Clues are hidden in videos and in plain sight. Each mystery has locks that need a real
            answer, and everything you open is kept on your account so you can pick it up later.
          </p>
          <div className="flex flex-wrap gap-2 mt-5">
            {featured ? (
              <Link href={`/arg/${featured.slug}`} className="btn btn-primary btn-sm">
                {active.length > 0 ? "Start the current mystery" : "See the first mystery"}
              </Link>
            ) : null}
            <Link href="/forums?category=theories" className="btn btn-ghost btn-sm">
              Compare theories
            </Link>
            {!member && (
              <Link href="/login?next=%2Farg" className="btn btn-secondary btn-sm">
                Log in to keep progress
              </Link>
            )}
          </div>
        </div>

        {member && (
          <div className="arg-status glass-card">
            <div>
              <p className="faint text-xs uppercase tracking-widest">Your trail</p>
              <p className="font-display font-bold text-lg">
                {solvedTotal} {solvedTotal === 1 ? "lock open" : "locks open"}
                {progress.found.length > 0 ? ` · ${progress.found.length} clues found` : ""}
              </p>
            </div>
            <ul className="arg-badges">
              {achievements.length === 0 ? (
                <li className="badge badge-neutral">No badges yet</li>
              ) : (
                achievements.map((badge) => (
                  <li key={badge.id} className="badge badge-accepted">
                    {badge.label}
                  </li>
                ))
              )}
            </ul>
          </div>
        )}

        {storylines.length === 0 ? (
          <div className="glass-card hub-empty">
            <p className="font-display font-bold">Nothing is running yet</p>
            <p className="muted text-sm">
              The first mystery is being written. Until then, the theories board is where the
              speculation lives.
            </p>
            <Link href="/forums?category=theories" className="btn btn-secondary btn-sm">
              Open the theories board
            </Link>
          </div>
        ) : (
          <>
            <section className="arg-section" aria-labelledby="arg-running">
              <div className="arg-section-head">
                <h2 id="arg-running" className="font-display font-bold text-xl">
                  {active.length > 0 ? "Running now" : "Next up"}
                </h2>
                <span className="faint text-xs">
                  {active.length + upcoming.length} {active.length + upcoming.length === 1 ? "mystery" : "mysteries"}
                </span>
              </div>

              <div className="arg-grid">
                {[...active, ...upcoming].map((storyline) => (
                  <MysteryCard
                    key={storyline.id}
                    storyline={storyline}
                    progress={storyProgress(storyline, puzzles, progress)}
                    signedIn={Boolean(member)}
                  />
                ))}
              </div>
            </section>

            {finished.length > 0 && (
              <section className="arg-section" aria-labelledby="arg-finished">
                <div className="arg-section-head">
                  <h2 id="arg-finished" className="font-display font-bold text-xl">
                    Closed cases
                  </h2>
                  <span className="faint text-xs">Read at your own pace</span>
                </div>
                <div className="arg-grid">
                  {finished.map((storyline) => (
                    <MysteryCard
                      key={storyline.id}
                      storyline={storyline}
                      progress={storyProgress(storyline, puzzles, progress)}
                      signedIn={Boolean(member)}
                    />
                  ))}
                </div>
              </section>
            )}

            <section className="arg-section" aria-labelledby="arg-clues">
              <div className="arg-section-head">
                <h2 id="arg-clues" className="font-display font-bold text-xl">
                  Recently found
                </h2>
                <span className="faint text-xs">Only clues you have opened</span>
              </div>

              {recentClues.length === 0 ? (
                <div className="glass-card hub-empty">
                  <p className="font-display font-bold">No clues on your trail yet</p>
                  <p className="muted text-sm">
                    Open a mystery and the first clue is waiting at the top of its page.
                  </p>
                </div>
              ) : (
                <ul className="arg-clue-list">
                  {recentClues.map((clue) => (
                    <li key={clue.id} className="glass-card arg-clue">
                      <p className="font-semibold">{clue.title}</p>
                      <p className="muted text-sm mt-1">{clue.body}</p>
                      {clue.source ? <p className="faint text-xs mt-2">{clue.source}</p> : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function MysteryCard({ storyline, progress, signedIn }) {
  const status = storyStatusMeta(storyline.status);
  const percent =
    progress.total > 0 ? Math.round((progress.opened / progress.total) * 100) : 0;

  return (
    <article className="glass-card arg-card lift">
      <div className="arg-card-top">
        <span className={`badge ${status.badge}`}>{status.label}</span>
        <span className="faint text-xs">{storyline.difficulty}</span>
      </div>
      <h3 className="font-display font-bold text-lg mt-2">{storyline.title}</h3>
      <p className="muted text-sm mt-1">{storyline.blurb}</p>

      <div className="arg-progress" aria-hidden="true">
        <span style={{ width: `${percent}%` }} />
      </div>
      <p className="faint text-xs mt-1">
        {progress.total === 0
          ? "Clues only, no locks yet"
          : signedIn
            ? `${progress.opened} of ${progress.total} locks open`
            : `${progress.total} ${progress.total === 1 ? "lock" : "locks"} to open`}
      </p>

      <Link href={`/arg/${storyline.slug}`} className="btn btn-secondary btn-sm mt-4">
        {progress.complete ? "Walk it back" : "Open the mystery"}
      </Link>
    </article>
  );
}
