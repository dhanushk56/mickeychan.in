"use client";

import { useCallback, useEffect, useState } from "react";
import RichTextEditor from "@/components/RichTextEditor";
import { DEFAULT_WINDOW_HOURS, LEVELS, isCurrent, levelMeta } from "@/lib/announcements";
import { richTextIsEmpty, richTextToPlain } from "@/lib/rich-text";

const EMPTY_DRAFT = {
  title: "",
  body: [],
  level: "normal",
  windowHours: DEFAULT_WINDOW_HOURS,
};

function formatWhen(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
    hour12: true,
  });
}

function hoursLabel(hours) {
  if (hours % 24 === 0 && hours >= 24) {
    const days = hours / 24;
    return `${hours}h (${days} day${days === 1 ? "" : "s"})`;
  }
  return `${hours}h`;
}

export default function AnnouncementsPanel() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [posting, setPosting] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/announcements", { cache: "no-store" });
      if (response.status === 401) {
        setError("Your admin session expired — lock the console and sign in again.");
        return;
      }
      if (!response.ok) throw new Error("Could not load the announcements.");
      const data = await response.json();
      setList(Array.isArray(data.announcements) ? data.announcements : []);
      setNow(Number(data.now) || Date.now());
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

  // Keeps the Current/Past labels honest while the console is left open.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);

  async function post(event) {
    event.preventDefault();
    if (posting) return;
    setPosting(true);
    setError("");
    try {
      const response = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Could not post that announcement.");
      setDraft(EMPTY_DRAFT);
      setNotice(
        draft.level === "normal"
          ? `Posted — it stays current for ${hoursLabel(draft.windowHours)}.`
          : `Posted — it stays current until you delete it.`
      );
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setPosting(false);
    }
  }

  async function remove(announcement) {
    if (!confirm(`Delete “${announcement.title}”? It disappears from the site immediately.`)) return;
    setBusyId(announcement.id);
    try {
      const response = await fetch(
        `/api/admin/announcements?id=${encodeURIComponent(announcement.id)}`,
        { method: "DELETE" }
      );
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Could not delete that announcement.");
      setList((current) => current.filter((item) => item.id !== announcement.id));
      setNotice("Announcement deleted.");
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId("");
    }
  }

  const meta = levelMeta(draft.level);
  const canPost = !posting && draft.title.trim().length > 0 && !richTextIsEmpty(draft.body);

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="muted text-sm max-w-xl">
          Standard announcements leave the Current list when their window ends. Priority and
          emergency notices ignore the window and stay current until you delete them.
        </p>
        <button type="button" className="btn btn-secondary btn-sm" onClick={load} disabled={loading}>
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {error && <p className="badge badge-denied">{error}</p>}
      {notice && <p className="badge badge-accepted">{notice}</p>}

      <form onSubmit={post} className="glass-card application-card grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display font-bold">Post an announcement</h3>
          <span className="badge badge-neutral">Admin only</span>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <label className="field flex-1" style={{ minWidth: "14rem" }}>
            <span className="field-label">Title</span>
            <input
              className="input"
              value={draft.title}
              onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
              placeholder="Short headline"
              maxLength={140}
              required
            />
          </label>

          <label className="field" style={{ minWidth: "11rem" }}>
            <span className="field-label">Type</span>
            <select
              className="select"
              value={draft.level}
              onChange={(event) => setDraft((current) => ({ ...current, level: event.target.value }))}
            >
              {LEVELS.map((level) => (
                <option key={level.id} value={level.id}>
                  {level.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field" style={{ minWidth: "11rem" }}>
            <span className="field-label">Stays current for (hours)</span>
            <input
              type="number"
              min="1"
              max="720"
              step="1"
              className="input"
              value={draft.windowHours}
              disabled={draft.level !== "normal"}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  windowHours: Math.max(1, Math.floor(Number(event.target.value) || DEFAULT_WINDOW_HOURS)),
                }))
              }
            />
          </label>
        </div>

        <div className="field">
          <span className="field-label">Message</span>
          <RichTextEditor
            label="Announcement text"
            value={draft.body}
            onChange={(body) => setDraft((current) => ({ ...current, body }))}
            placeholder="What do people need to know? Press Enter for a new line."
          />
        </div>

        <p className="faint text-xs leading-relaxed">
          {meta.note}
          {draft.level === "normal"
            ? ` This one is set to run for ${hoursLabel(draft.windowHours)} — 24 is one day.`
            : " The hours field doesn't apply to this type."}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <button type="submit" className="btn btn-primary btn-sm" disabled={!canPost}>
            {posting ? "Posting…" : "Post announcement"}
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setDraft(EMPTY_DRAFT)}
            disabled={posting}
          >
            Clear
          </button>
        </div>
      </form>

      {loading && list.length === 0 ? (
        <div className="glass-card p-8 muted">Loading announcements…</div>
      ) : list.length === 0 ? (
        <div className="empty-state">
          <p className="font-display font-bold">Nothing posted yet</p>
          <p className="muted text-sm max-w-md">
            New announcements appear on /announcements straight away, at the top of the Current list.
          </p>
        </div>
      ) : (
        list.map((announcement) => {
          const level = levelMeta(announcement.level);
          const current = isCurrent(announcement, now);
          const preview = richTextToPlain(announcement.body, 200);

          return (
            <article
              key={announcement.id}
              className="glass-card application-card"
              data-level={announcement.level}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display font-bold">{announcement.title}</h3>
                    <span className={`badge ${level.badge}`}>{level.label}</span>
                    <span className={`badge ${current ? "badge-accepted" : "badge-neutral"}`}>
                      {current ? "Current" : "Past"}
                    </span>
                  </div>
                  <p className="faint text-xs mt-1">
                    Posted {formatWhen(announcement.createdAt)} by {announcement.author || "Admin"}
                    {announcement.level === "normal"
                      ? ` · current for ${hoursLabel(announcement.windowHours)}`
                      : " · stays until deleted"}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ color: "var(--danger)" }}
                  disabled={busyId === announcement.id}
                  onClick={() => remove(announcement)}
                >
                  Delete
                </button>
              </div>
              {preview && <p className="muted text-sm mt-3">{preview}</p>}
            </article>
          );
        })
      )}
    </div>
  );
}
