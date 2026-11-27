"use client";

import { useCallback, useEffect, useState } from "react";
import { useConfirm } from "@/components/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import EmptyState from "@/components/ui/EmptyState";

const EMPTY_STORY = { title: "", blurb: "", status: "active", difficulty: "Starter", slug: "" };
const EMPTY_CLUE = { storylineId: "", title: "", body: "", source: "", puzzleId: "" };
const EMPTY_LOCK = {
  storylineId: "",
  title: "",
  prompt: "",
  hint: "",
  answer: "",
  message: "",
  choices: "",
  points: 10,
};

export default function ArgPanel({ canManage }) {
  const [storylines, setStorylines] = useState([]);
  const [clues, setClues] = useState([]);
  const [puzzles, setPuzzles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [dialog, askConfirm] = useConfirm();
  const toast = useToast();

  const [story, setStory] = useState(EMPTY_STORY);
  const [storyId, setStoryId] = useState("");
  const [clue, setClue] = useState(EMPTY_CLUE);
  const [clueId, setClueId] = useState("");
  const [lock, setLock] = useState(EMPTY_LOCK);
  const [lockId, setLockId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/arg", { cache: "no-store" });
      if (response.status === 401) {
        setError("Your admin session expired. Sign in again.");
        return;
      }
      if (!response.ok) throw new Error("Could not load the ARG.");
      const data = await response.json();
      setStorylines(Array.isArray(data.storylines) ? data.storylines : []);
      setClues(Array.isArray(data.clues) ? data.clues : []);
      setPuzzles(Array.isArray(data.puzzles) ? data.puzzles : []);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function send(entity, action, values, id) {
    if (busy) return;
    setBusy(true);
    try {
      const response = await fetch("/api/admin/arg", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entity, action, values, id }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "That did not save.");
      setStorylines(Array.isArray(data.storylines) ? data.storylines : []);
      setClues(Array.isArray(data.clues) ? data.clues : []);
      setPuzzles(Array.isArray(data.puzzles) ? data.puzzles : []);
      toast.push(action === "delete" ? "Removed." : "Saved.");
      return true;
    } catch (err) {
      toast.push(err.message, "error");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function saveStory(event) {
    event.preventDefault();
    if (!story.title.trim()) return toast.push("Give the mystery a title.", "error");
    const ok = await send("storyline", "save", { ...story, id: storyId || undefined });
    if (ok) {
      setStory(EMPTY_STORY);
      setStoryId("");
    }
  }

  async function saveClue(event) {
    event.preventDefault();
    if (!clue.storylineId) return toast.push("Pick the mystery this clue belongs to.", "error");
    const ok = await send("clue", "save", {
      ...clue,
      puzzleId: clue.puzzleId || null,
      id: clueId || undefined,
    });
    if (ok) {
      setClue(EMPTY_CLUE);
      setClueId("");
    }
  }

  async function saveLock(event) {
    event.preventDefault();
    if (!lock.storylineId) return toast.push("Pick the mystery this lock belongs to.", "error");
    const choices = String(lock.choices || "")
      .split(",")
      .map((choice) => choice.trim())
      .filter(Boolean);
    const ok = await send("puzzle", "save", {
      ...lock,
      choices,
      points: Number(lock.points) || 10,
      id: lockId || undefined,
    });
    if (ok) {
      setLock(EMPTY_LOCK);
      setLockId("");
    }
  }

  async function remove(entity, id, label) {
    const confirmed = await askConfirm({
      title: `Delete this ${entity}?`,
      description:
        entity === "storyline"
          ? `"${label}" goes, along with its clues and locks. This cannot be undone.`
          : `"${label}" is removed from the ARG. This cannot be undone.`,
      confirmLabel: `Delete ${entity}`,
    });
    if (!confirmed) return;
    await send(entity, "delete", {}, id);
  }

  const storyOptions = storylines.map((entry) => (
    <option key={entry.id} value={entry.id}>
      {entry.title}
    </option>
  ));

  return (
    <div className="grid gap-3">
      {dialog}
      {toast.view}
      {error && <p className="badge badge-denied">{error}</p>}

      <p className="muted text-sm max-w-2xl">
        Mysteries appear on /arg as soon as they are set to active. Answers stay on the server, so
        nothing in the page source can give a lock away. Clues with a lock attached stay sealed
        until that member opens it.
      </p>

      <div className="glass-card application-card grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display font-bold">Mysteries</h3>
          <button type="button" className="btn btn-secondary btn-sm" onClick={load} disabled={loading}>
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>

        {canManage && (
          <form onSubmit={saveStory} className="grid gap-3">
            <div className="flex flex-wrap gap-2">
              <label className="field flex-1" style={{ minWidth: "14rem" }}>
                <span className="field-label">Title</span>
                <input
                  className="input"
                  value={story.title}
                  maxLength={100}
                  onChange={(event) => setStory((current) => ({ ...current, title: event.target.value }))}
                  placeholder="The Deepslate Transmission"
                  required
                />
              </label>
              <label className="field" style={{ minWidth: "9rem" }}>
                <span className="field-label">Status</span>
                <select
                  className="input"
                  value={story.status}
                  onChange={(event) => setStory((current) => ({ ...current, status: event.target.value }))}
                >
                  <option value="upcoming">Upcoming</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </select>
              </label>
              <label className="field" style={{ minWidth: "8rem" }}>
                <span className="field-label">Difficulty</span>
                <input
                  className="input"
                  value={story.difficulty}
                  maxLength={40}
                  onChange={(event) =>
                    setStory((current) => ({ ...current, difficulty: event.target.value }))
                  }
                />
              </label>
            </div>

            <label className="field">
              <span className="field-label">What it is, in a sentence or two</span>
              <textarea
                className="textarea"
                rows={2}
                value={story.blurb}
                maxLength={400}
                onChange={(event) => setStory((current) => ({ ...current, blurb: event.target.value }))}
                placeholder="A voice under the world keeps repeating a coordinate."
              />
            </label>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="faint text-xs">
                {storyId ? "Editing an existing mystery" : "A new mystery"}
              </span>
              <div className="flex gap-2">
                {storyId && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      setStory(EMPTY_STORY);
                      setStoryId("");
                    }}
                  >
                    Cancel
                  </button>
                )}
                <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
                  {storyId ? "Save mystery" : "Add mystery"}
                </button>
              </div>
            </div>
          </form>
        )}

        {loading ? (
          <p className="muted text-sm">Loading…</p>
        ) : storylines.length === 0 ? (
          <EmptyState title="No mysteries yet" description="Add one above and /arg starts working." />
        ) : (
          <ul className="grid gap-2">
            {storylines.map((entry) => (
              <li key={entry.id} className="arg-admin-row">
                <div style={{ minWidth: 0 }}>
                  <p className="font-semibold">{entry.title}</p>
                  <p className="faint text-xs">
                    /arg/{entry.slug} · {entry.status} ·{" "}
                    {clues.filter((clue) => clue.storylineId === entry.id).length} clues ·{" "}
                    {puzzles.filter((puzzle) => puzzle.storylineId === entry.id).length} locks
                  </p>
                </div>
                {canManage && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        setStory({
                          title: entry.title,
                          blurb: entry.blurb,
                          status: entry.status,
                          difficulty: entry.difficulty,
                          slug: entry.slug,
                        });
                        setStoryId(entry.id);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => remove("storyline", entry.id, entry.title)}
                      disabled={busy}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="glass-card application-card grid gap-3">
        <h3 className="font-display font-bold">Clues</h3>

        {canManage && storylines.length > 0 && (
          <form onSubmit={saveClue} className="grid gap-3">
            <div className="flex flex-wrap gap-2">
              <label className="field flex-1" style={{ minWidth: "12rem" }}>
                <span className="field-label">Mystery</span>
                <select
                  className="input"
                  value={clue.storylineId}
                  onChange={(event) => setClue((current) => ({ ...current, storylineId: event.target.value }))}
                  required
                >
                  <option value="">Pick one</option>
                  {storyOptions}
                </select>
              </label>
              <label className="field" style={{ minWidth: "10rem" }}>
                <span className="field-label">Sealed behind a lock</span>
                <select
                  className="input"
                  value={clue.puzzleId}
                  onChange={(event) => setClue((current) => ({ ...current, puzzleId: event.target.value }))}
                >
                  <option value="">No, readable by everyone</option>
                  {puzzles
                    .filter((puzzle) => !clue.storylineId || puzzle.storylineId === clue.storylineId)
                    .map((puzzle) => (
                      <option key={puzzle.id} value={puzzle.id}>
                        {puzzle.title}
                      </option>
                    ))}
                </select>
              </label>
            </div>

            <label className="field">
              <span className="field-label">Title</span>
              <input
                className="input"
                value={clue.title}
                maxLength={100}
                onChange={(event) => setClue((current) => ({ ...current, title: event.target.value }))}
                placeholder="The frame at 04:12"
                required
              />
            </label>

            <label className="field">
              <span className="field-label">The clue itself</span>
              <textarea
                className="textarea"
                rows={3}
                value={clue.body}
                maxLength={1200}
                onChange={(event) => setClue((current) => ({ ...current, body: event.target.value }))}
                placeholder="Count the obsidian down the left side. That number is the first key."
                required
              />
            </label>

            <label className="field">
              <span className="field-label">Where it was found (optional)</span>
              <input
                className="input"
                value={clue.source}
                maxLength={120}
                onChange={(event) => setClue((current) => ({ ...current, source: event.target.value }))}
                placeholder="Video, 04:12"
              />
            </label>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="faint text-xs">{clueId ? "Editing an existing clue" : "A new clue"}</span>
              <div className="flex gap-2">
                {clueId && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      setClue(EMPTY_CLUE);
                      setClueId("");
                    }}
                  >
                    Cancel
                  </button>
                )}
                <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
                  {clueId ? "Save clue" : "Add clue"}
                </button>
              </div>
            </div>
          </form>
        )}

        {storylines.length === 0 ? (
          <p className="muted text-sm">Add a mystery first.</p>
        ) : clues.length === 0 ? (
          <EmptyState title="No clues yet" description="Clues sit at the top of a mystery page." />
        ) : (
          <ul className="grid gap-2">
            {clues.map((entry) => (
              <li key={entry.id} className="arg-admin-row">
                <div style={{ minWidth: 0 }}>
                  <p className="font-semibold">{entry.title}</p>
                  <p className="faint text-xs">
                    {storylines.find((storyline) => storyline.id === entry.storylineId)?.title || "No mystery"} ·{" "}
                    {entry.puzzleId ? "sealed" : "open to everyone"}
                  </p>
                </div>
                {canManage && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        setClue({
                          storylineId: entry.storylineId,
                          title: entry.title,
                          body: entry.body,
                          source: entry.source,
                          puzzleId: entry.puzzleId || "",
                        });
                        setClueId(entry.id);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => remove("clue", entry.id, entry.title)}
                      disabled={busy}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="glass-card application-card grid gap-3">
        <h3 className="font-display font-bold">Locks</h3>

        {canManage && storylines.length > 0 && (
          <form onSubmit={saveLock} className="grid gap-3">
            <div className="flex flex-wrap gap-2">
              <label className="field flex-1" style={{ minWidth: "12rem" }}>
                <span className="field-label">Mystery</span>
                <select
                  className="input"
                  value={lock.storylineId}
                  onChange={(event) => setLock((current) => ({ ...current, storylineId: event.target.value }))}
                  required
                >
                  <option value="">Pick one</option>
                  {storyOptions}
                </select>
              </label>
              <label className="field" style={{ minWidth: "6rem" }}>
                <span className="field-label">Points</span>
                <input
                  className="input"
                  type="number"
                  min={0}
                  max={500}
                  value={lock.points}
                  onChange={(event) => setLock((current) => ({ ...current, points: event.target.value }))}
                />
              </label>
            </div>

            <label className="field">
              <span className="field-label">Title</span>
              <input
                className="input"
                value={lock.title}
                maxLength={100}
                onChange={(event) => setLock((current) => ({ ...current, title: event.target.value }))}
                placeholder="Two words in the dark"
                required
              />
            </label>

            <label className="field">
              <span className="field-label">The question</span>
              <textarea
                className="textarea"
                rows={2}
                value={lock.prompt}
                maxLength={500}
                onChange={(event) => setLock((current) => ({ ...current, prompt: event.target.value }))}
                placeholder="Enter the two words the recording repeats."
                required
              />
            </label>

            <label className="field">
              <span className="field-label">Accepted answer</span>
              <input
                className="input"
                value={lock.answer}
                maxLength={120}
                onChange={(event) => setLock((current) => ({ ...current, answer: event.target.value }))}
                placeholder="deepslate echo"
                required
              />
            </label>

            <label className="field">
              <span className="field-label">Choices (optional, comma separated)</span>
              <input
                className="input"
                value={lock.choices}
                onChange={(event) => setLock((current) => ({ ...current, choices: event.target.value }))}
                placeholder="Deepslate, Echo, Obsidian"
              />
            </label>

            <label className="field">
              <span className="field-label">Hint (optional)</span>
              <input
                className="input"
                value={lock.hint}
                maxLength={300}
                onChange={(event) => setLock((current) => ({ ...current, hint: event.target.value }))}
                placeholder="Listen at 04:12, then again at 04:40."
              />
            </label>

            <label className="field">
              <span className="field-label">What opening it says</span>
              <input
                className="input"
                value={lock.message}
                maxLength={400}
                onChange={(event) => setLock((current) => ({ ...current, message: event.target.value }))}
                placeholder="The frame lights up. A coordinate arrives in chat."
              />
            </label>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="faint text-xs">{lockId ? "Editing an existing lock" : "A new lock"}</span>
              <div className="flex gap-2">
                {lockId && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      setLock(EMPTY_LOCK);
                      setLockId("");
                    }}
                  >
                    Cancel
                  </button>
                )}
                <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
                  {lockId ? "Save lock" : "Add lock"}
                </button>
              </div>
            </div>
          </form>
        )}

        {storylines.length === 0 ? (
          <p className="muted text-sm">Add a mystery first.</p>
        ) : puzzles.length === 0 ? (
          <EmptyState title="No locks yet" description="A lock asks a question and checks the answer on the server." />
        ) : (
          <ul className="grid gap-2">
            {puzzles.map((entry) => (
              <li key={entry.id} className="arg-admin-row">
                <div style={{ minWidth: 0 }}>
                  <p className="font-semibold">{entry.title}</p>
                  <p className="faint text-xs">
                    {storylines.find((storyline) => storyline.id === entry.storylineId)?.title || "No mystery"} ·
                    answer: {entry.answer}
                  </p>
                </div>
                {canManage && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        setLock({
                          storylineId: entry.storylineId,
                          title: entry.title,
                          prompt: entry.prompt,
                          hint: entry.hint,
                          answer: entry.answer,
                          message: entry.message,
                          choices: entry.choices.join(", "),
                          points: entry.points,
                        });
                        setLockId(entry.id);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => remove("puzzle", entry.id, entry.title)}
                      disabled={busy}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
