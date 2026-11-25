import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { memberFromCookieStore } from "@/lib/members";
import {
  clearHistory,
  createPlaylist,
  deletePlaylist,
  readLibrary,
  recordHistory,
  saveSettings,
  setPlaylistItem,
  toggleWatchLater,
  updatePlaylist,
} from "@/lib/library";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

function reply(body, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

async function currentMember() {
  const session = await memberFromCookieStore(cookies());
  if (!session) return null;
  return session.username;
}

export async function GET() {
  const username = await currentMember();
  if (!username) return reply({ error: "Log in to use your library." }, 401);
  return reply({ ok: true, library: await readLibrary(username) });
}

export async function POST(request) {
  const username = await currentMember();
  if (!username) return reply({ error: "Log in to use your library." }, 401);

  const body = await request.json().catch(() => ({}));
  const action = String(body?.action || "");
  let result;

  switch (action) {
    case "watch:toggle":
      result = await toggleWatchLater(username, body?.videoId, body?.save);
      break;
    case "history:record":
      result = await recordHistory(username, body?.videoId);
      break;
    case "history:clear":
      result = await clearHistory(username);
      break;
    case "settings:update":
      result = { settings: await saveSettings(username, body?.settings || {}) };
      break;
    case "playlist:create":
      result = await createPlaylist(username, body?.name);
      break;
    case "playlist:update":
      result = await updatePlaylist(username, body?.id, {
        name: body?.name,
        public: body?.public,
      });
      break;
    case "playlist:delete":
      result = await deletePlaylist(username, body?.id);
      break;
    case "playlist:item":
      result = await setPlaylistItem(username, body?.id, body?.videoId, body?.present !== false);
      break;
    default:
      return reply({ error: "That action isn't supported." }, 400);
  }

  if (result?.error) return reply({ error: result.error }, 400);
  return reply({ ok: true, ...result, library: await readLibrary(username) });
}
