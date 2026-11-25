import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { memberFromCookieStore } from "@/lib/members";
import {
  listPolls,
  loadPollVotes,
  pollIsOpen,
  pollSummary,
  pollVotesKey,
  readPolls,
} from "@/lib/polls";
import { kvGet, kvHashSet } from "@/lib/kv";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

async function viewer() {
  const session = await memberFromCookieStore(cookies());
  return session ? session.username : null;
}

export async function GET() {
  const username = await viewer();
  const polls = await listPolls();
  const rows = await Promise.all(
    polls.map(async (poll) => pollSummary(poll, await loadPollVotes(poll.id), username))
  );
  return NextResponse.json({ ok: true, polls: rows, signedIn: !!username }, { headers: NO_STORE });
}

export async function POST(request) {
  const username = await viewer();
  if (!username) {
    return NextResponse.json({ error: "Log in to vote." }, { status: 401, headers: NO_STORE });
  }

  const body = await request.json().catch(() => ({}));
  const pollId = String(body?.pollId || "");
  const choices = Array.isArray(body?.choices) ? body.choices.map((id) => String(id)) : [];

  const polls = readPolls(await kvGet("polls:list", []));
  const poll = polls.find((entry) => entry.id === pollId);
  if (!poll) {
    return NextResponse.json({ error: "That poll is gone." }, { status: 404, headers: NO_STORE });
  }
  if (!pollIsOpen(poll)) {
    return NextResponse.json({ error: "This poll has closed." }, { status: 409, headers: NO_STORE });
  }

  const allowed = new Set(poll.options.map((option) => option.id));
  const picked = Array.from(new Set(choices)).filter((id) => allowed.has(id));
  if (picked.length === 0) {
    return NextResponse.json({ error: "Pick an option first." }, { status: 400, headers: NO_STORE });
  }
  if (!poll.multiple && picked.length > 1) {
    return NextResponse.json({ error: "This poll takes one answer." }, { status: 400, headers: NO_STORE });
  }

  await kvHashSet(pollVotesKey(poll.id), {
    [username]: JSON.stringify({ choices: picked, at: new Date().toISOString() }),
  });

  const votes = await loadPollVotes(poll.id);
  return NextResponse.json(
    { ok: true, poll: pollSummary(poll, votes, username) },
    { headers: NO_STORE }
  );
}
