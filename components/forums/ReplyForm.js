"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ReplyForm({ threadId, locked }) {
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  if (locked) {
    return <p className="muted text-sm">This thread is locked, so nobody can add to it.</p>;
  }

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/forums/${threadId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || "The reply did not save.");
        return;
      }
      setBody("");
      router.refresh();
    } catch {
      setError("The reply did not save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="glass-card p-4 grid gap-2">
      <label className="field">
        <span className="field-label">Reply</span>
        <textarea
          className="input"
          rows={4}
          maxLength={2000}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Add to the thread"
        />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn btn-primary btn-sm" disabled={busy || body.trim().length < 2}>
          {busy ? "Posting…" : "Post reply"}
        </button>
        <span className="faint text-xs">Replies are plain text.</span>
      </div>
      {error && (
        <p className="badge badge-denied" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
