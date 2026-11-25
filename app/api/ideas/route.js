import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { kvGet, kvSet } from "@/lib/kv";
import { findMember, memberFromCookieStore } from "@/lib/members";
import {
  IDEAS_KEY,
  ideaVoteCount,
  MAX_IDEA_NOTE,
  MAX_IDEA_TITLE,
  MAX_IDEAS,
  listIdeas,
  normalizeIdea,
  rankIdeas,
  readIdeas,
} from "@/lib/ideas";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

async function viewer() {
  const session = await memberFromCookieStore(cookies());
  return session ? session.username : null;
}

export async function GET() {
  const username = await viewer();
  const ideas = rankIdeas(await listIdeas());

  return NextResponse.json(
    {
      ok: true,
      signedIn: !!username,
      ideas: ideas.map((idea) => {
        const { votes, ...rest } = idea;
        return {
          ...rest,
          voteCount: ideaVoteCount(idea),
          voted: username ? votes.includes(username) : false,
        };
      }),
    },
    { headers: NO_STORE }
  );
}

export async function POST(request) {
  const username = await viewer();
  if (!username) {
    return NextResponse.json({ error: "Log in to join the idea board." }, { status: 401, headers: NO_STORE });
  }

  const body = await request.json().catch(() => ({}));
  const action = String(body?.action || "");
  const ideas = readIdeas(await kvGet(IDEAS_KEY, []));

  if (action === "create") {
    const title = String(body?.title ?? "").trim();
    const note = String(body?.note ?? "").trim();
    if (title.length < 4) {
      return NextResponse.json({ error: "Give the idea a clear title." }, { status: 400, headers: NO_STORE });
    }
    if (note.length < 8) {
      return NextResponse.json({ error: "Add a sentence or two so it can be judged." }, { status: 400, headers: NO_STORE });
    }

    const member = await findMember(username);
    const idea = normalizeIdea({
      title: title.slice(0, MAX_IDEA_TITLE),
      note: note.slice(0, MAX_IDEA_NOTE),
      author: username,
      authorName: member?.name || username,
      votes: [username],
    });

    const next = [idea, ...ideas].slice(0, MAX_IDEAS);
    await kvSet(IDEAS_KEY, next);
    return NextResponse.json(
      { ok: true, idea: { ...idea, votes: undefined, voteCount: idea.votes.length, voted: true } },
      { headers: NO_STORE }
    );
  }

  if (action === "vote" || action === "unvote") {
    const id = String(body?.id || "");
    const target = ideas.find((idea) => idea.id === id);
    if (!target) {
      return NextResponse.json({ error: "That idea is gone." }, { status: 404, headers: NO_STORE });
    }

    const voted = target.votes.includes(username);
    const votes =
      action === "vote"
        ? voted
          ? target.votes
          : [...target.votes, username]
        : target.votes.filter((name) => name !== username);

    const next = ideas.map((idea) => (idea.id === id ? { ...idea, votes } : idea));
    await kvSet(IDEAS_KEY, next);

    return NextResponse.json(
      { ok: true, id, votes: votes.length, voted: action === "vote" ? true : false },
      { headers: NO_STORE }
    );
  }

  return NextResponse.json({ error: "That action isn't supported." }, { status: 400, headers: NO_STORE });
}
