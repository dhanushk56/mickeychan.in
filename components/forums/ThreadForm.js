"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FORUM_CATEGORIES } from "@/lib/forums";

export default function ThreadForm() {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(FORUM_CATEGORIES[0].id);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/forums", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, category, body }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || "The thread did not save.");
        return;
      }
      router.push(`/forums/${data.thread.id}`);
      router.refresh();
    } catch {
      setError("The thread did not save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="glass-card p-5 grid gap-4">
      <label className="field">
        <span className="field-label">Title</span>
        <input
          className="input"
          value={title}
          maxLength={120}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="What is the thread about?"
          required
        />
      </label>

      <label className="field">
        <span className="field-label">Board</span>
        <select
          className="input"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        >
          {FORUM_CATEGORIES.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.label}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span className="field-label">Post</span>
        <textarea
          className="input"
          rows={8}
          maxLength={4000}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Say what you came to say. Leave a blank line between paragraphs."
          required
        />
      </label>

      {error && (
        <p className="badge badge-denied" role="alert">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
          {busy ? "Posting…" : "Post thread"}
        </button>
        <span className="faint text-xs">One new thread every couple of minutes.</span>
      </div>
    </form>
  );
}
