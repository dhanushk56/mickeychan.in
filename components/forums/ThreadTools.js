"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Two clicks for anything destructive, so a mis-tap cannot delete a thread.
function DeleteButton({ onDelete, label = "Delete", className = "btn btn-ghost btn-sm" }) {
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);

  async function run() {
    if (!armed) {
      setArmed(true);
      return;
    }
    setBusy(true);
    await onDelete();
    setBusy(false);
    setArmed(false);
  }

  return (
    <button
      type="button"
      className={armed ? "btn btn-danger btn-sm" : className}
      onClick={run}
      onBlur={() => setArmed(false)}
      disabled={busy}
    >
      {busy ? "Removing…" : armed ? "Confirm delete" : label}
    </button>
  );
}

export function ThreadTools({ threadId, pinned, locked, canModerate, canRemove }) {
  const router = useRouter();
  const [error, setError] = useState("");

  async function patch(next) {
    setError("");
    const response = await fetch(`/api/forums/${threadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error || "That did not save.");
      return;
    }
    router.refresh();
  }

  async function remove() {
    const response = await fetch(`/api/forums/${threadId}`, { method: "DELETE" });
    if (!response.ok) {
      setError("The thread was not removed.");
      return;
    }
    router.push("/forums");
    router.refresh();
  }

  if (!canModerate && !canRemove) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canModerate && (
        <>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => patch({ pinned: !pinned })}
          >
            {pinned ? "Unpin" : "Pin"}
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => patch({ locked: !locked })}
          >
            {locked ? "Unlock" : "Lock"}
          </button>
        </>
      )}
      {canRemove && <DeleteButton onDelete={remove} label="Delete thread" />}
      {error && (
        <span className="badge badge-denied" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

export function ReplyDelete({ threadId, replyId }) {
  const router = useRouter();

  async function remove() {
    const response = await fetch(`/api/forums/${threadId}?reply=${encodeURIComponent(replyId)}`, {
      method: "DELETE",
    });
    if (response.ok) router.refresh();
  }

  return <DeleteButton onDelete={remove} label="Delete" className="btn btn-ghost btn-sm faint" />;
}
