"use client";

import { useCallback, useEffect, useState } from "react";
import { useConfirm } from "@/components/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import EmptyState from "@/components/ui/EmptyState";

const EMPTY = { title: "", description: "", startsAt: "", endsAt: "", location: "", url: "" };

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

export default function EventsPanel({ canCreate, canDelete }) {
  const [events, setEvents] = useState([]);
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
      const response = await fetch("/api/admin/events", { cache: "no-store" });
      if (response.status === 401) {
        setError("Your admin session expired. Sign in again.");
        return;
      }
      if (!response.ok) throw new Error("Could not load events.");
      const data = await response.json();
      setEvents(Array.isArray(data.events) ? data.events : []);
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

  async function create(event) {
    event.preventDefault();
    if (posting) return;
    setPosting(true);
    try {
      const response = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not add the event.");
      setDraft(EMPTY);
      toast.push("Event added.");
      load();
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setPosting(false);
    }
  }

  async function remove(item) {
    const confirmed = await askConfirm({
      title: "Delete this event?",
      description: `“${item.title}” disappears from /events.`,
      confirmLabel: "Delete event",
    });
    if (!confirmed) return;
    setBusyId(item.id);
    try {
      const response = await fetch(`/api/admin/events?id=${encodeURIComponent(item.id)}`, {
        method: "DELETE",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not delete the event.");
      setEvents((current) => current.filter((entry) => entry.id !== item.id));
      toast.push("Event deleted.");
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
        Events appear on /events and on the community hub as soon as they start existing. Times are
        shown in each visitor&apos;s own timezone.
      </p>

      {canCreate && (
        <form onSubmit={create} className="glass-card application-card grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display font-bold">Add an event</h3>
            <span className="badge badge-neutral">Admin only</span>
          </div>

          <label className="field">
            <span className="field-label">Title</span>
            <input
              className="input"
              value={draft.title}
              maxLength={120}
              onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
              placeholder="Friday night stream"
              required
            />
          </label>

          <div className="flex flex-wrap items-end gap-2">
            <label className="field" style={{ minWidth: "13rem" }}>
              <span className="field-label">Starts</span>
              <input
                className="input"
                type="datetime-local"
                value={draft.startsAt}
                onChange={(event) => setDraft((current) => ({ ...current, startsAt: event.target.value }))}
                required
              />
            </label>

            <label className="field" style={{ minWidth: "13rem" }}>
              <span className="field-label">Ends (optional)</span>
              <input
                className="input"
                type="datetime-local"
                value={draft.endsAt}
                onChange={(event) => setDraft((current) => ({ ...current, endsAt: event.target.value }))}
              />
            </label>

            <label className="field" style={{ minWidth: "11rem" }}>
              <span className="field-label">Where</span>
              <input
                className="input"
                value={draft.location}
                maxLength={80}
                onChange={(event) => setDraft((current) => ({ ...current, location: event.target.value }))}
                placeholder="YouTube Live"
              />
            </label>
          </div>

          <label className="field">
            <span className="field-label">Link (optional, https)</span>
            <input
              className="input"
              value={draft.url}
              onChange={(event) => setDraft((current) => ({ ...current, url: event.target.value }))}
              placeholder="https://"
            />
          </label>

          <label className="field">
            <span className="field-label">Description (optional)</span>
            <textarea
              className="textarea"
              rows={3}
              value={draft.description}
              maxLength={600}
              onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
            />
          </label>

          <button type="submit" className="btn btn-primary btn-sm" disabled={posting}>
            {posting ? "Adding…" : "Add event"}
          </button>
        </form>
      )}

      <div className="glass-card application-card grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display font-bold">Events</h3>
          <button type="button" className="btn btn-secondary btn-sm" onClick={load} disabled={loading}>
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>

        {loading ? (
          <p className="muted text-sm">Loading…</p>
        ) : events.length === 0 ? (
          <EmptyState title="No events yet" description="Add one above and it shows up on /events." />
        ) : (
          <ul className="grid gap-2">
            {events.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3"
                style={{ borderTop: "1px solid var(--glass-line)", paddingTop: ".7rem" }}
              >
                <div className="grid gap-1" style={{ minWidth: 0 }}>
                  <span className="font-semibold">{item.title}</span>
                  <span className="faint text-xs">
                    {formatWhen(item.startsAt)}
                    {item.location ? ` · ${item.location}` : ""}
                  </span>
                </div>
                {canDelete && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => remove(item)}
                    disabled={busyId === item.id}
                  >
                    Delete
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
