"use client";

import { useCallback, useEffect, useState } from "react";
import { useConfirm } from "@/components/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import EmptyState from "@/components/ui/EmptyState";

const EMPTY = { question: "", blurb: "", options: "", multiple: false, closesAt: "" };

function formatWhen(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PollsPanel({ canCreate, canDelete }) {
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState(EMPTY);
  const [posting, setPosting] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [dialog, askConfirm] = useConfirm();
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/polls", { cache: "no-store" });
      if (response.status === 401) {
        setError("Your admin session expired. Sign in again.");
        return;
      }
      if (!response.ok) throw new Error("Could not load polls.");
      const data = await response.json();
      setPolls(Array.isArray(data.polls) ? data.polls : []);
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

  function optionsFromText(text) {
    return String(text || "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((label) => ({ label }));
  }

  async function create(event) {
    event.preventDefault();
    if (posting) return;
    const options = optionsFromText(draft.options);
    if (!draft.question.trim()) {
      toast.push("Add a question.", "error");
      return;
    }
    if (options.length < 2) {
      toast.push("Add at least two options, one per line.", "error");
      return;
    }
    setPosting(true);
    try {
      const response = await fetch("/api/admin/polls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: draft.question,
          blurb: draft.blurb,
          options,
          multiple: draft.multiple,
          closesAt: draft.closesAt || null,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not open the poll.");
      setDraft(EMPTY);
      toast.push("Poll opened.");
      load();
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setPosting(false);
    }
  }

  async function toggleClosed(poll) {
    setBusyId(poll.id);
    try {
      const response = await fetch("/api/admin/polls", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: poll.id, closed: !poll.closed }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not update the poll.");
      setPolls(Array.isArray(data.polls) ? data.polls : []);
      toast.push(poll.closed ? "Poll reopened." : "Poll closed.");
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setBusyId("");
    }
  }

  async function remove(poll) {
    const confirmed = await askConfirm({
      title: "Delete this poll?",
      description: `“${poll.question}” and every vote on it will be removed.`,
      confirmLabel: "Delete poll",
    });
    if (!confirmed) return;
    setBusyId(poll.id);
    try {
      const response = await fetch(`/api/admin/polls?id=${encodeURIComponent(poll.id)}`, {
        method: "DELETE",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not delete the poll.");
      setPolls((current) => current.filter((entry) => entry.id !== poll.id));
      toast.push("Poll deleted.");
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="grid gap-3">
      {dialog}
      {toast.view}
      {error && <p className="badge badge-denied">{error}</p>}

      <p className="muted text-sm max-w-xl">
        Polls appear on /polls the moment you open one. Votes are stored per member, so each person
        gets one answer (or one set of answers when you allow more).
      </p>

      {canCreate && (
        <form onSubmit={create} className="glass-card application-card grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display font-bold">Open a poll</h3>
            <span className="badge badge-neutral">Admin only</span>
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <label className="field flex-1" style={{ minWidth: "16rem" }}>
              <span className="field-label">Question</span>
              <input
                className="input"
                value={draft.question}
                maxLength={160}
                onChange={(event) => setDraft((current) => ({ ...current, question: event.target.value }))}
                placeholder="Which series should come back first?"
                required
              />
            </label>

            <label className="field" style={{ minWidth: "14rem" }}>
              <span className="field-label">Closes (optional)</span>
              <input
                className="input"
                type="datetime-local"
                value={draft.closesAt}
                onChange={(event) => setDraft((current) => ({ ...current, closesAt: event.target.value }))}
              />
            </label>
          </div>

          <label className="field">
            <span className="field-label">Short note (optional)</span>
            <input
              className="input"
              value={draft.blurb}
              maxLength={280}
              onChange={(event) => setDraft((current) => ({ ...current, blurb: event.target.value }))}
              placeholder="One line of context"
            />
          </label>

          <label className="field">
            <span className="field-label">Options, one per line</span>
            <textarea
              className="textarea"
              rows={4}
              value={draft.options}
              onChange={(event) => setDraft((current) => ({ ...current, options: event.target.value }))}
              placeholder={"Retro replays\nBehind the scenes\nGuest episodes"}
              required
            />
          </label>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft.multiple}
                onChange={(event) => setDraft((current) => ({ ...current, multiple: event.target.checked }))}
              />
              <span>Allow more than one answer</span>
            </label>

            <button type="submit" className="btn btn-primary btn-sm" disabled={posting}>
              {posting ? "Opening…" : "Open poll"}
            </button>
          </div>
        </form>
      )}

      <div className="glass-card application-card grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display font-bold">Polls</h3>
          <button type="button" className="btn btn-secondary btn-sm" onClick={load} disabled={loading}>
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>

        {loading ? (
          <p className="muted text-sm">Loading…</p>
        ) : polls.length === 0 ? (
          <EmptyState
            title="No polls yet"
            description="Open one above and it shows up on /polls straight away."
          />
        ) : (
          <ul className="grid gap-2">
            {polls.map((poll) => (
              <li
                key={poll.id}
                className="flex flex-wrap items-center justify-between gap-3"
                style={{ borderTop: "1px solid var(--glass-line)", paddingTop: ".7rem" }}
              >
                <div className="grid gap-1" style={{ minWidth: 0 }}>
                  <span className="font-semibold">{poll.question}</span>
                  <span className="faint text-xs">
                    {poll.options.length} options
                    {poll.closed ? " · closed" : " · open"}
                    {poll.closesAt ? ` · closes ${formatWhen(poll.closesAt)}` : ""}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => toggleClosed(poll)}
                    disabled={busyId === poll.id}
                  >
                    {poll.closed ? "Reopen" : "Close"}
                  </button>
                  {canDelete && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => remove(poll)}
                      disabled={busyId === poll.id}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
