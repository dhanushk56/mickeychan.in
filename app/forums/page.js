import Link from "next/link";
import { cookies } from "next/headers";
import { memberFromCookieStore } from "@/lib/members";
import {
  FORUM_CATEGORIES,
  categoryMeta,
  lastReplyAt,
  listThreads,
  sortThreads,
} from "@/lib/forums";
import LocalTime from "@/components/LocalTime";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Forums",
  description:
    "Threads from the community: questions about the videos, feedback on what to make next, and everything that does not fit a comment box.",
  alternates: { canonical: "/forums" },
};

const VALID = new Set(FORUM_CATEGORIES.map((entry) => entry.id));

export default async function ForumsPage({ searchParams }) {
  const query = await searchParams;
  const category = VALID.has(query?.category) ? query.category : "";
  const member = await memberFromCookieStore(await cookies()).catch(() => null);

  const threads = sortThreads(await listThreads());
  const shown = category ? threads.filter((thread) => thread.category === category) : threads;
  const open = shown.filter((thread) => !thread.locked);

  return (
    <main className="page">
      <div className="shell" style={{ maxWidth: "52rem" }}>
        <div className="max-w-2xl mb-6">
          <p className="kicker">Forums</p>
          <h1 className="display-lg mt-3 mb-4">Talk about the videos.</h1>
          <p className="muted text-lg leading-relaxed">
            Threads for questions, feedback and whatever else needs more room than a comment. Reading
            is open to everyone; posting needs an account.
          </p>
          <div className="flex flex-wrap gap-2 mt-5">
            <Link
              href={member ? "/forums/new" : "/login?next=%2Fforums%2Fnew"}
              className="btn btn-primary btn-sm"
            >
              Start a thread
            </Link>
            <Link href="/hub" className="btn btn-ghost btn-sm">
              Hub
            </Link>
          </div>
        </div>

        <nav className="flex flex-wrap gap-2 mb-5" aria-label="Boards">
          <Link
            href="/forums"
            className={`btn btn-sm ${category ? "btn-secondary" : "btn-primary"}`}
          >
            All boards
          </Link>
          {FORUM_CATEGORIES.map((entry) => (
            <Link
              key={entry.id}
              href={`/forums?category=${entry.id}`}
              className={`btn btn-sm ${category === entry.id ? "btn-primary" : "btn-secondary"}`}
            >
              {entry.label}
            </Link>
          ))}
        </nav>

        {shown.length === 0 ? (
          <div className="glass-card hub-empty">
            <p className="font-display font-bold">No threads here yet</p>
            <p className="muted text-sm">
              {category
                ? "This board is empty. Start the first thread and it will show up here."
                : "The first thread sets the tone. Ask something about a video, or leave feedback on what to make next."}
            </p>
            <Link
              href={member ? "/forums/new" : "/login?next=%2Fforums%2Fnew"}
              className="btn btn-secondary btn-sm"
            >
              Start a thread
            </Link>
          </div>
        ) : (
          <>
            <p className="faint text-xs mb-2">
              {shown.length} {shown.length === 1 ? "thread" : "threads"}, {open.length} open
            </p>
            <ul className="panel-list">
              {shown.map((thread) => {
                const meta = categoryMeta(thread.category);
                return (
                  <li key={thread.id} className="glass-card panel-card">
                    <div className="panel-card-head">
                      <Link href={`/forums/${thread.id}`} className="font-semibold hover:underline">
                        {thread.pinned ? "📌 " : ""}
                        {thread.title}
                      </Link>
                      <span className="badge badge-neutral">{meta.label}</span>
                    </div>
                    <p className="faint text-xs">
                      {thread.authorName || thread.author} · {thread.replies.length}{" "}
                      {thread.replies.length === 1 ? "reply" : "replies"} · last activity{" "}
                      <LocalTime iso={lastReplyAt(thread)} />
                      {thread.locked ? " · locked" : ""}
                    </p>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </main>
  );
}
