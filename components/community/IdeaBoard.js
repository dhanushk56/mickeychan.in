"use client";

import { useState } from "react";
import Link from "next/link";
import { IDEA_STATUSES, ideaStatusMeta, rankIdeas } from "@/lib/ideas";

export default function IdeaBoard({ initialIdeas, signedIn }) {
  const [ideas, setIdeas] = useState(initialIdeas || []);
  const [filter, setFilter] = useState("all");
  const [form, setForm] = useState({ title: "", note: "" });
  const [sending, setSending] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  const visible = rankIdeas(filter === "all" ? ideas : ideas.filter((idea) => idea.status === filter));

  async function submit(event) {
    event.preventDefault();
    if (sending) return;
    setError("");
    if (form.title.trim().length < 4) {
      setError("Give the idea a clear title.");
      return;
    }
    if (form.note.trim().length < 8) {
      setError("Add a sentence or two so it can be judged.");
      return;
    }

    setSending(true);
    try {
      const response = await fetch("/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", title: form.title, note: form.note }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "That didn't post. Try again.");
      setIdeas((current) => [
        { ...data.idea, status: "open", voted: true, createdAt: new Date().toISOString() },
        ...current,
      ]);
      setForm({ title: "", note: "" });
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  async function toggleVote(idea) {
    if (!signedIn || busyId) return;
    setBusyId(idea.id);
    setError("");
    try {
      const response = await fetch("/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: idea.voted ? "unvote" : "vote", id: idea.id }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Your vote didn't save.");
      setIdeas((current) =>
        current.map((entry) =>
          entry.id === idea.id
            ? { ...entry, voted: !!data.voted, voteCount: Number(data.votes) || 0 }
            : entry
        )
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="grid gap-4">
      {signedIn ? (
        <form className="glass-card application-card grid gap-3" onSubmit={submit}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display font-bold">Add an idea</h2>
            <span className="badge badge-neutral">Members only</span>
          </div>
          <label className="field">
            <span className="field-label">Title</span>
            <input
              className="input"
              value={form.title}
              maxLength={120}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              placeholder="A series on editing breakdowns"
              required
            />
          </label>
          <label className="field">
            <span className="field-label">Why it works</span>
            <textarea
              className="textarea"
              rows={3}
              value={form.note}
              maxLength={600}
              onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
              placeholder="Two or three sentences on what it is and who it is for."
              required
            />
          </label>
          {error && <p className="badge badge-denied">{error}</p>}
          <button type="submit" className="btn btn-primary btn-sm" disabled={sending}>
            {sending ? "Posting…" : "Post idea"}
          </button>
        </form>
      ) : (
        <div className="glass-card hub-empty">
          <p className="font-display font-bold">Want to add one?</p>
          <p className="muted text-sm">Anyone with an account can post and back ideas.</p>
          <Link href="/login" className="btn btn-secondary btn-sm">
            Log in to join in
          </Link>
        </div>
      )}

      <div className="tabbar tabbar-scroll" role="tablist" aria-label="Filter ideas">
        {[{ id: "all", label: "All" }, ...IDEA_STATUSES].map((entry) => (
          <button
            key={entry.id}
            type="button"
            role="tab"
            aria-selected={filter === entry.id}
            className="tab"
            data-active={filter === entry.id}
            onClick={() => setFilter(entry.id)}
          >
            {entry.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="glass-card hub-empty">
          <p className="font-display font-bold">Nothing here yet</p>
          <p className="muted text-sm">Ideas appear as soon as someone posts one.</p>
        </div>
      ) : (
        <ul className="grid gap-3" style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {visible.map((idea) => {
            const meta = ideaStatusMeta(idea.status);
            return (
              <li key={idea.id} className="glass-card idea-card">
                <div className="idea-row">
                  <button
                    type="button"
                    className="idea-vote"
                    data-voted={!!idea.voted}
                    aria-pressed={!!idea.voted}
                    aria-label={`${idea.voted ? "Remove your vote from" : "Back"} ${idea.title}`}
                    disabled={!signedIn || busyId === idea.id}
                    onClick={() => toggleVote(idea)}
                  >
                    <span className="idea-vote-count">{idea.voteCount ?? 0}</span>
                    <span className="idea-vote-label">{idea.voted ? "Backed" : "Back"}</span>
                  </button>

                  <div className="idea-body">
                    <span className="idea-title">{idea.title}</span>
                    <span className="idea-note">{idea.note}</span>
                  </div>
                </div>

                <div className="idea-foot">
                  <span className="faint text-xs">
                    {idea.authorName || idea.author || "Member"}
                    {idea.createdAt
                      ? ` · ${new Date(idea.createdAt).toLocaleDateString(undefined, {
                          day: "numeric",
                          month: "short",
                        })}`
                      : ""}
                  </span>
                  <span className={`badge ${meta.badge}`}>{meta.label}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
