import { NextResponse } from "next/server";
import { authorize } from "@/lib/admin-guard";
import { logActivity } from "@/lib/activity-log";
import {
  listClues,
  listPuzzles,
  listStorylines,
  removeClue,
  removePuzzle,
  removeStoryline,
  upsertClue,
  upsertPuzzle,
  upsertStoryline,
} from "@/lib/arg";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

async function everything() {
  const [storylines, clues, puzzles] = await Promise.all([listStorylines(), listClues(), listPuzzles()]);
  return { ok: true, storylines, clues, puzzles };
}

export async function GET() {
  const gate = await authorize("arg.view");
  if (gate.response) return gate.response;
  return NextResponse.json(await everything(), { headers: NO_STORE });
}

export async function POST(request) {
  const gate = await authorize("arg.manage");
  if (gate.response) return gate.response;
  const actor = gate.session?.user?.username || "Admin";

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request." }, { status: 400, headers: NO_STORE });
  }

  const entity = String(body.entity || "");
  const action = String(body.action || "save");
  const values = body.values && typeof body.values === "object" ? body.values : {};

  let result;
  if (entity === "storyline") {
    result = action === "delete" ? await removeStoryline(String(body.id || "")) : await upsertStoryline(values);
  } else if (entity === "clue") {
    result = action === "delete" ? await removeClue(String(body.id || "")) : await upsertClue(values);
  } else if (entity === "puzzle") {
    result = action === "delete" ? await removePuzzle(String(body.id || "")) : await upsertPuzzle(values);
  } else {
    return NextResponse.json({ error: "Unknown ARG record." }, { status: 400, headers: NO_STORE });
  }

  if (result?.error) {
    return NextResponse.json({ error: result.error }, { status: 400, headers: NO_STORE });
  }

  await logActivity({
    area: "admin",
    action: "arg",
    username: actor,
    detail: `${action === "delete" ? "Deleted" : "Saved"} ARG ${entity}`,
  });

  return NextResponse.json({ ...(await everything()), result }, { headers: NO_STORE });
}
