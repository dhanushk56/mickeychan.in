"use client";

import { useCallback, useEffect, useState } from "react";
import { useConfirm } from "@/components/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import EmptyState from "@/components/ui/EmptyState";
import { IDEA_STATUSES, ideaStatusMeta, rankIdeas } from "@/lib/ideas";

export default function IdeasPanel({ canEdit, canDelete }) {
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [dialog, askConfirm] = useConfirm();
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/ideas", { cache: "no-store" });
      if (response.status === 401) {
        setError("Your admin session expired — sign in again.");
        return;
      }
      if (!response.ok) throw new Error("Could not load ideas.");
      const data = await response.json();
      setIdeas(rankIdeas(Array.isArray(data.ideas) ? data.ideas : []));
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

  async function setStatus(idea, status) {
    setBusyId(idea.id);
    try {
      const response = await fetch("/api/admin/ideas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: idea.id, status }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not update the idea.");
      setIdeas(rankIdeas(Array.isArray(data.ideas) ? data.ideas : []));
      toast.push(`Marked as ${ideaStatusMeta(status).label.toLowerCase()}.`);
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setBusyId("");
    }
  }

  async function remove(idea) {
    const confirmed = await askConfirm({
      title: "Delete this idea?",
      description: `“${idea.title}” and its backers are removed.`,
      confirmLabel: "Delete idea",
    });
    if (!confirmed) return;
    setBusyId(idea.id);
    try {
      const response = await fetch(`/api/admin/ideas?id=${encodeURIComponent(idea.id)}`, {
        method: "DELETE",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not delete the idea.");
      setIdeas((current) => current.filter((entry) => entry.id !== idea.id));
      toast.push("Idea deleted.");
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
        Ideas are posted by members on /ideas. Moving one to planned or shipped shows that state to
        everyone; nothing else about it changes.
      </p>

      <div className="glass-card application-card grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display font-bold">Ideas</h3>
          <button type="button" className="btn btn-secondary btn-sm" onClick={load} disabled={loading}>
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>

        {loading ? (
          <p className="muted text-sm">Loading…</p>
        ) : ideas.length === 0 ? (
          <EmptyState title="No ideas yet" description="Members post these from /ideas." />
        ) : (
          <ul className="grid gap-2">
            {ideas.map((idea) => (
              <li
                key={idea.id}
                className="flex flex-wrap items-center justify-between gap-3"
                style={{ borderTop: "1px solid var(--glass-line)", paddingTop: ".7rem" }}
              >
                <div className="grid gap-1" style={{ minWidth: 0 }}>
                  <span className="font-semibold">{idea.title}</span>
                  <span className="faint text-xs">
                    {idea.votes.length} {idea.votes.length === 1 ? "backer" : "backers"}
                    {idea.authorName ? ` · ${idea.authorName}` : ""}
                    {` · ${ideaStatusMeta(idea.status).label}`}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {canEdit && (
                    <select
                      className="select"
                      value={idea.status}
                      disabled={busyId === idea.id}
                      onChange={(event) => setStatus(idea, event.target.value)}
                      aria-label={`State for ${idea.title}`}
                    >
                      {IDEA_STATUSES.map((status) => (
                        <option key={status.id} value={status.id}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  )}
                  {canDelete && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => remove(idea)}
                      disabled={busyId === idea.id}
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
