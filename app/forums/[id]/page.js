import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import { categoryMeta, findThread } from "@/lib/forums";
import { memberFromCookieStore } from "@/lib/members";
import { can, resolveAdmin } from "@/lib/roles";
import LocalTime from "@/components/LocalTime";
import ReplyForm from "@/components/forums/ReplyForm";
import { ReplyDelete, ThreadTools } from "@/components/forums/ThreadTools";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({ params }) {
  const { id } = await params;
  const thread = await findThread(id);
  if (!thread) return { title: "Thread not found" };
  return {
    title: thread.title,
    description: `${thread.title}, a thread on the Mickey Chan forums.`,
    alternates: { canonical: `/forums/${thread.id}` },
  };
}

function paragraphs(body) {
  return String(body || "")
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export default async function ThreadPage({ params }) {
  const { id } = await params;
  const thread = await findThread(id);
  if (!thread) notFound();

  const member = await memberFromCookieStore(await cookies()).catch(() => null);
  const session = await getSessionFromCookies();
  const access = session ? await resolveAdmin(session.user.username) : null;
  const canModerate = Boolean(access && can(access, "content.edit"));
  const meta = categoryMeta(thread.category);
  const isAuthor =
    Boolean(member) && thread.author.toLowerCase() === member.username.toLowerCase();

  return (
    <main className="page">
      <div className="shell" style={{ maxWidth: "52rem" }}>
        <Link href="/forums" className="faint text-xs hover:underline">
          ← Back to forums
        </Link>

        <article className="glass-card p-5 mt-4 grid gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge badge-neutral">{meta.label}</span>
            {thread.pinned && <span className="badge badge-pending">Pinned</span>}
            {thread.locked && <span className="badge badge-neutral">Locked</span>}
          </div>
          <h1 className="display-lg">{thread.title}</h1>
          <p className="faint text-xs">
            {thread.authorName || thread.author} (@{thread.author}) · <LocalTime iso={thread.createdAt} />
          </p>
          <div className="grid gap-3">
            {paragraphs(thread.body).map((part) => (
              <p key={part.slice(0, 24)} className="muted leading-relaxed whitespace-pre-line">
                {part}
              </p>
            ))}
          </div>
          <ThreadTools
            threadId={thread.id}
            pinned={thread.pinned}
            locked={thread.locked}
            canModerate={canModerate}
            canRemove={isAuthor || canModerate}
          />
        </article>

        <h2 className="font-display font-bold mt-8 mb-3">
          {thread.replies.length === 0
            ? "No replies yet"
            : `${thread.replies.length} ${thread.replies.length === 1 ? "reply" : "replies"}`}
        </h2>

        {thread.replies.length > 0 && (
          <ul className="grid gap-3">
            {thread.replies.map((reply) => {
              const owns = Boolean(member) && reply.author.toLowerCase() === member.username.toLowerCase();
              return (
                <li key={reply.id} className="glass-card p-4 grid gap-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold">
                      {reply.authorName || reply.author}{" "}
                      <span className="faint font-normal">@{reply.author}</span>
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="faint text-xs">
                        <LocalTime iso={reply.createdAt} />
                      </span>
                      {(owns || canModerate) && (
                        <ReplyDelete threadId={thread.id} replyId={reply.id} />
                      )}
                    </div>
                  </div>
                  <p className="muted text-sm leading-relaxed whitespace-pre-line">{reply.body}</p>
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-6">
          {member ? (
            <ReplyForm threadId={thread.id} locked={thread.locked} />
          ) : (
            <p className="muted text-sm">
              <Link href={`/login?next=${encodeURIComponent(`/forums/${thread.id}`)}`} className="hover:underline">
                Log in
              </Link>{" "}
              to reply. Reading stays open to everyone.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
