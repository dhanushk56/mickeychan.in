import { NextResponse } from "next/server";
import { refreshPublic } from "@/lib/revalidate";
import { kvDel, kvGet, kvSet } from "@/lib/kv";
import { getSessionFromCookies } from "@/lib/auth";
import { authorize } from "@/lib/admin-guard";
import { logActivity } from "@/lib/activity-log";
import {
  MAX_OPTIONS,
  MAX_POLLS,
  POLLS_KEY,
  normalizePoll,
  pollVotesKey,
  pollWithStatus,
  readPolls,
} from "@/lib/polls";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

async function actor() {
  return (await getSessionFromCookies())?.user?.username || "Admin";
}

export async function GET() {
  const gate = await authorize("polls.view");
  if (gate.response) return gate.response;
  return NextResponse.json(
    { ok: true, polls: readPolls(await kvGet(POLLS_KEY, [])).map((poll) => pollWithStatus(poll)) },
    { headers: NO_STORE }
  );
}

export async function POST(request) {
  const gate = await authorize("polls.create");
  if (gate.response) return gate.response;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid poll." }, { status: 400, headers: NO_STORE });
  }

  const poll = normalizePoll({
    question: body.question,
    blurb: body.blurb,
    options: body.options,
    multiple: body.multiple,
    closesAt: body.closesAt || null,
    author: await actor(),
  });

  if (!poll.question) {
    return NextResponse.json({ error: "Add a question." }, { status: 400, headers: NO_STORE });
  }
  if (poll.options.length < 2) {
    return NextResponse.json(
      { error: `Add at least two options (up to ${MAX_OPTIONS}).` },
      { status: 400, headers: NO_STORE }
    );
  }

  const existing = readPolls(await kvGet(POLLS_KEY, []));
  await kvSet(POLLS_KEY, [poll, ...existing].slice(0, MAX_POLLS));
  refreshPublic("polls");

  await logActivity({
    area: "admin",
    action: "poll",
    username: await actor(),
    detail: `Opened the poll "${poll.question}" with ${poll.options.length} options`,
    request,
  });

  return NextResponse.json({ ok: true, poll }, { headers: NO_STORE });
}

export async function PATCH(request) {
  const gate = await authorize("polls.create");
  if (gate.response) return gate.response;

  const body = await request.json().catch(() => ({}));
  const id = String(body?.id || "");
  const closed = body?.closed !== false;

  const existing = readPolls(await kvGet(POLLS_KEY, []));
  const index = existing.findIndex((poll) => poll.id === id);
  if (index === -1) {
    return NextResponse.json({ error: "That poll is gone." }, { status: 404, headers: NO_STORE });
  }

  // A poll that closed by passing its deadline has to lose that deadline to be
  // reopened, otherwise it would still read as closed the moment it is saved.
  const clearDeadline = body?.closesAt === null;
  const next = existing.map((poll) =>
    poll.id === id ? { ...poll, closed, ...(clearDeadline ? { closesAt: null } : {}) } : poll
  );
  await kvSet(POLLS_KEY, next);
  refreshPublic("polls");

  await logActivity({
    area: "admin",
    action: "poll-closed",
    username: await actor(),
    detail: `${closed ? "Closed" : "Reopened"} the poll "${existing[index].question}"`,
    request,
  });

  return NextResponse.json(
    { ok: true, polls: next.map((poll) => pollWithStatus(poll)) },
    { headers: NO_STORE }
  );
}

export async function DELETE(request) {
  const gate = await authorize("polls.delete");
  if (gate.response) return gate.response;

  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Which poll?" }, { status: 400, headers: NO_STORE });
  }

  const existing = readPolls(await kvGet(POLLS_KEY, []));
  const target = existing.find((poll) => poll.id === id);
  if (!target) {
    return NextResponse.json({ error: "That poll is gone." }, { status: 404, headers: NO_STORE });
  }

  await kvSet(POLLS_KEY, existing.filter((poll) => poll.id !== id));
  refreshPublic("polls");
  await kvDel(pollVotesKey(id));

  await logActivity({
    area: "admin",
    action: "poll-deleted",
    username: await actor(),
    detail: `Deleted the poll "${target.question}" and its votes`,
    request,
  });

  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}
