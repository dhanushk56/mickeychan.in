"use client";

import { useEffect, useState } from "react";
import { STORY_STATUSES, statusMeta } from "@/lib/stories";

const EMPTY = { id: "", title: "", summary: "", status: "draft", beats: [] };

function blankBeat() {
  return { id: "", title: "", text: "", at: "" };
}

export default function StoriesPanel({ canEdit = false }) {
  const [stories, setStories] = useState([]);
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetch("/api/admin/stories", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (alive && data) setStories(data.stories || []);
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  function open(story) {
    setError("");
    setNote("");
    setDraft({
      ...EMPTY,
      ...story,
      beats: (story.beats || []).map((beat) => ({ ...beat })),
    });
  }

  function startNew() {
    setError("");
    setNote("");
    setDraft({ ...EMPTY, beats: [] });
  }

  function patch(fields) {
    setDraft((current) => ({ ...current, ...fields }));
  }

  function patchBeat(index, fields) {
    setDraft((current) => ({
      ...current,
      beats: current.beats.map((beat, position) => (position === index ? { ...beat, ...fields } : beat)),
    }));
  }

  async function save() {
    if (!draft || busy) return;
    setBusy(true);
    setError("");
    setNote("");
    try {
      const body = {
        title: draft.title,
        summary: draft.summary,
        status: draft.status,
        beats: draft.beats,
      };
      if (draft.id) body.id = draft.id;
      const response = await fetch("/api/admin/stories", {
        method: draft.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.error || "That did not save. Try again.");
        return;
      }
      setStories(data.stories || []);
      setDraft(null);
      setNote(draft.id ? "Story saved." : "Story created.");
    } catch {
      setError("That did not save. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id) {
    if (busy || !id) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/stories?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.error || "That did not delete. Try again.");
        return;
      }
      setStories(data.stories || []);
      setDraft(null);
      setNote("Story removed.");
    } catch {
      setError("That did not delete. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="glass-card p-5 grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-display font-bold text-lg">Story arcs</p>
            <p className="muted text-sm">
              What happened, beat by beat, and how it ended.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-secondary btn-sm" onClick={startNew} disabled={!canEdit}>
              New arc
            </button>
          </div>
        </div>

        {error && <p className="text-sm badge badge-denied">{error}</p>}
        {note && <p className="text-sm badge badge-accepted">{note}</p>}

        {loading ? (
          <p className="muted text-sm">Loading…</p>
        ) : stories.length === 0 ? (
          <div className="empty-state">
            <p className="font-display font-bold">No arcs yet</p>
            <p className="muted text-sm max-w-md">
              Start one, add the beats as they happen, and it shows on the stories page once it is running.
            </p>
          </div>
        ) : (
          <div className="panel-list">
            {stories.map((story) => (
              <div key={story.id} className="panel-item flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-display font-bold">{story.title}</p>
                  <p className="muted text-sm">
                    {story.beats.length} beat{story.beats.length === 1 ? "" : "s"} ·{" "}
                    {statusMeta(story.status).label}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => open(story)}>
                    {canEdit ? "Edit" : "View"}
                  </button>
                  {canEdit && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => remove(story.id)}
                      disabled={busy}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {draft && (
        <form
          className="glass-card p-5 grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
        >
          <p className="font-display font-bold text-lg">{draft.id ? "Edit arc" : "New arc"}</p>

          <label className="field">
            <span className="field-label">Title</span>
            <input
              className="input"
              value={draft.title}
              onChange={(event) => patch({ title: event.target.value })}
              maxLength={120}
              disabled={!canEdit}
              placeholder="What the arc was called"
            />
          </label>

          <label className="field">
            <span className="field-label">Summary</span>
            <textarea
              className="input"
              rows={3}
              value={draft.summary}
              onChange={(event) => patch({ summary: event.target.value })}
              maxLength={400}
              disabled={!canEdit}
              placeholder="One or two lines on what this arc was about"
            />
          </label>

          <label className="field" style={{ maxWidth: "16rem" }}>
            <span className="field-label">Status</span>
            <select
              className="input"
              value={draft.status}
              onChange={(event) => patch({ status: event.target.value })}
              disabled={!canEdit}
            >
              {STORY_STATUSES.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.label}
                </option>
              ))}
            </select>
            <span className="muted text-sm">{statusMeta(draft.status).note}</span>
          </label>

          <div className="grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-display font-bold">Beats</p>
              {canEdit && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => patch({ beats: [...draft.beats, blankBeat()] })}
                >
                  Add beat
                </button>
              )}
            </div>
            {draft.beats.length === 0 && <p className="muted text-sm">No beats yet.</p>}
            {draft.beats.map((beat, index) => (
              <div key={index} className="glass-inset p-4 grid gap-3">
                <div className="flex flex-wrap gap-3">
                  <label className="field flex-1" style={{ minWidth: "12rem" }}>
                    <span className="field-label">Beat title</span>
                    <input
                      className="input"
                      value={beat.title}
                      onChange={(event) => patchBeat(index, { title: event.target.value })}
                      maxLength={120}
                      disabled={!canEdit}
                    />
                  </label>
                  <label className="field" style={{ maxWidth: "12rem" }}>
                    <span className="field-label">Date</span>
                    <input
                      className="input"
                      type="date"
                      value={beat.at || ""}
                      onChange={(event) => patchBeat(index, { at: event.target.value })}
                      disabled={!canEdit}
                    />
                  </label>
                </div>
                <label className="field">
                  <span className="field-label">What happened</span>
                  <textarea
                    className="input"
                    rows={3}
                    value={beat.text}
                    onChange={(event) => patchBeat(index, { text: event.target.value })}
                    maxLength={2000}
                    disabled={!canEdit}
                  />
                </label>
                {canEdit && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => patch({ beats: draft.beats.filter((_, position) => position !== index) })}
                  >
                    Remove beat
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {canEdit && (
              <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
                {busy ? "Saving…" : draft.id ? "Save arc" : "Create arc"}
              </button>
            )}
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDraft(null)}>
              Close
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
