"use client";

import { useEffect, useState } from "react";

const EMPTY = { team: [], upcoming: [], notes: [] };

function row(fields) {
  return fields;
}

export default function StudioPanel({ canEdit = false }) {
  const [studio, setStudio] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    let alive = true;
    fetch("/api/admin/studio", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (alive && data?.studio) setStudio(data.studio);
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  function setList(key, list) {
    setStudio((current) => ({ ...current, [key]: list }));
  }

  function update(key, index, fields) {
    setStudio((current) => ({
      ...current,
      [key]: current[key].map((entry, position) => (position === index ? { ...entry, ...fields } : entry)),
    }));
  }

  async function save() {
    if (busy || !canEdit) return;
    setBusy(true);
    setError("");
    setNote("");
    try {
      const response = await fetch("/api/admin/studio", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studio }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.error || "That did not save. Try again.");
        return;
      }
      setStudio(data.studio);
      setNote("Studio page saved.");
    } catch {
      setError("That did not save. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="muted text-sm">Loading…</p>;

  return (
    <div className="grid gap-4">
      <div className="glass-card p-5 grid gap-3">
        <div>
          <p className="font-display font-bold text-lg">Studio page</p>
          <p className="muted text-sm">
            Team profiles, what is coming up, and notes from behind the scenes. Everything here shows on /studio.
          </p>
        </div>
        {error && <p className="text-sm badge badge-denied">{error}</p>}
        {note && <p className="text-sm badge badge-accepted">{note}</p>}
        {!canEdit && <p className="muted text-sm">Your role can read this page but not change it.</p>}
      </div>

      <section className="glass-card p-5 grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-display font-bold">Team</p>
          {canEdit && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setList("team", [...studio.team, row({ name: "", role: "", bio: "", link: "" })])}
            >
              Add person
            </button>
          )}
        </div>
        {studio.team.length === 0 && <p className="muted text-sm">Nobody added yet.</p>}
        {studio.team.map((member, index) => (
          <div key={index} className="glass-inset p-4 grid gap-3">
            <div className="flex flex-wrap gap-3">
              <label className="field flex-1" style={{ minWidth: "10rem" }}>
                <span className="field-label">Name</span>
                <input
                  className="input"
                  value={member.name}
                  onChange={(event) => update("team", index, { name: event.target.value })}
                  disabled={!canEdit}
                  maxLength={60}
                />
              </label>
              <label className="field flex-1" style={{ minWidth: "10rem" }}>
                <span className="field-label">Role</span>
                <input
                  className="input"
                  value={member.role}
                  onChange={(event) => update("team", index, { role: event.target.value })}
                  disabled={!canEdit}
                  maxLength={80}
                  placeholder="Editor, builder, host"
                />
              </label>
            </div>
            <label className="field">
              <span className="field-label">Short bio</span>
              <textarea
                className="input"
                rows={2}
                value={member.bio}
                onChange={(event) => update("team", index, { bio: event.target.value })}
                disabled={!canEdit}
                maxLength={400}
              />
            </label>
            <label className="field">
              <span className="field-label">Link (optional)</span>
              <input
                className="input"
                value={member.link}
                onChange={(event) => update("team", index, { link: event.target.value })}
                disabled={!canEdit}
                placeholder="https://"
              />
            </label>
            {canEdit && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setList("team", studio.team.filter((_, position) => position !== index))}
              >
                Remove person
              </button>
            )}
          </div>
        ))}
      </section>

      <section className="glass-card p-5 grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-display font-bold">Coming up</p>
          {canEdit && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setList("upcoming", [...studio.upcoming, row({ title: "", note: "", when: "" })])}
            >
              Add entry
            </button>
          )}
        </div>
        {studio.upcoming.length === 0 && <p className="muted text-sm">Nothing scheduled.</p>}
        {studio.upcoming.map((entry, index) => (
          <div key={index} className="glass-inset p-4 grid gap-3">
            <div className="flex flex-wrap gap-3">
              <label className="field flex-1" style={{ minWidth: "12rem" }}>
                <span className="field-label">Title</span>
                <input
                  className="input"
                  value={entry.title}
                  onChange={(event) => update("upcoming", index, { title: event.target.value })}
                  disabled={!canEdit}
                  maxLength={120}
                />
              </label>
              <label className="field" style={{ maxWidth: "12rem" }}>
                <span className="field-label">Date</span>
                <input
                  className="input"
                  type="date"
                  value={entry.when || ""}
                  onChange={(event) => update("upcoming", index, { when: event.target.value })}
                  disabled={!canEdit}
                />
              </label>
            </div>
            <label className="field">
              <span className="field-label">Note</span>
              <input
                className="input"
                value={entry.note}
                onChange={(event) => update("upcoming", index, { note: event.target.value })}
                disabled={!canEdit}
                maxLength={300}
                placeholder="What it is, in a line"
              />
            </label>
            {canEdit && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setList("upcoming", studio.upcoming.filter((_, position) => position !== index))}
              >
                Remove entry
              </button>
            )}
          </div>
        ))}
      </section>

      <section className="glass-card p-5 grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-display font-bold">Behind the scenes</p>
          {canEdit && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setList("notes", [...studio.notes, row({ title: "", text: "", at: "" })])}
            >
              Add note
            </button>
          )}
        </div>
        {studio.notes.length === 0 && <p className="muted text-sm">No notes yet.</p>}
        {studio.notes.map((entry, index) => (
          <div key={index} className="glass-inset p-4 grid gap-3">
            <div className="flex flex-wrap gap-3">
              <label className="field flex-1" style={{ minWidth: "12rem" }}>
                <span className="field-label">Title</span>
                <input
                  className="input"
                  value={entry.title}
                  onChange={(event) => update("notes", index, { title: event.target.value })}
                  disabled={!canEdit}
                  maxLength={120}
                />
              </label>
              <label className="field" style={{ maxWidth: "12rem" }}>
                <span className="field-label">Date</span>
                <input
                  className="input"
                  type="date"
                  value={entry.at || ""}
                  onChange={(event) => update("notes", index, { at: event.target.value })}
                  disabled={!canEdit}
                />
              </label>
            </div>
            <label className="field">
              <span className="field-label">Note</span>
              <textarea
                className="input"
                rows={3}
                value={entry.text}
                onChange={(event) => update("notes", index, { text: event.target.value })}
                disabled={!canEdit}
                maxLength={1200}
              />
            </label>
            {canEdit && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setList("notes", studio.notes.filter((_, position) => position !== index))}
              >
                Remove note
              </button>
            )}
          </div>
        ))}
      </section>

      {canEdit && (
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-primary btn-sm" onClick={save} disabled={busy}>
            {busy ? "Saving…" : "Save studio page"}
          </button>
        </div>
      )}
    </div>
  );
}
