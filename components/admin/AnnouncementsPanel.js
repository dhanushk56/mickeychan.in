"use client";

import { useCallback, useEffect, useState } from "react";
import RichTextEditor from "@/components/RichTextEditor";
import { useConfirm } from "@/components/ConfirmDialog";
import {
  CATEGORIES,
  LEVELS,
  announcementState,
  categoryMeta,
  isValidWindowHours,
  levelMeta,
  normalizeAnnouncement,
} from "@/lib/announcements";
import AnnouncementCard from "@/components/announcements/AnnouncementCard";
import { useToast } from "@/components/ui/Toast";
import { richTextIsEmpty, richTextToPlain } from "@/lib/rich-text";

const EMPTY_DRAFT = {
  title: "",
  body: [],
  level: "normal",
  category: "general",
  pinned: false,
  image: "",
  windowHours: "",
  publishAt: "",
  expiresAt: "",
};

function formatWhen(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
    hour12: true,
  });
}

// datetime-local values are local to the person typing them, so they are turned
// into a full ISO stamp before they leave the browser.
function toIso(value) {
  if (!value) return "";
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? "" : new Date(time).toISOString();
}

function toLocalInput(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

function hoursLabel(hours) {
  if (!Number.isFinite(hours)) return "an unknown time";
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
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [posting, setPosting] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [scheduleDrafts, setScheduleDrafts] = useState({});
  const [busySchedule, setBusySchedule] = useState("");
  const [dialog, askConfirm] = useConfirm();
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/announcements", { cache: "no-store" });
      if (response.status === 401) {
        setError("Your admin session expired. Lock the console and sign in again.");
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
        body: JSON.stringify({
          ...draft,
          publishAt: toIso(draft.publishAt),
          expiresAt: toIso(draft.expiresAt),
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Could not post that announcement.");
      const scheduled = result.announcement?.publishAt
        ? new Date(result.announcement.publishAt).getTime() > Date.now()
        : false;
      setDraft(EMPTY_DRAFT);
      toast.push(
        scheduled
          ? `Scheduled for ${formatWhen(result.announcement.publishAt)}. It appears on its own when that time comes.`
          : draft.expiresAt
            ? `Posted. It ends ${formatWhen(toIso(draft.expiresAt))} and moves to past on its own.`
            : `Posted. It stays current for ${hoursLabel(Number(draft.windowHours))}, then moves to past on its own.`
      );
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setPosting(false);
    }
  }

  async function remove(announcement) {
    const ok = await askConfirm({
      title: "Delete this announcement?",
      description: `"${announcement.title}" disappears from the site immediately.`,
      confirmLabel: "Delete announcement",
    });
    if (!ok) return;
    setBusyId(announcement.id);
    try {
      const response = await fetch(
        `/api/admin/announcements?id=${encodeURIComponent(announcement.id)}`,
        { method: "DELETE" }
      );
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Could not delete that announcement.");
      setList((current) => current.filter((item) => item.id !== announcement.id));
      toast.push("Announcement deleted.");
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId("");
    }
  }

  function scheduleOf(announcement) {
    return (
      scheduleDrafts[announcement.id] || {
        publishAt: toLocalInput(announcement.publishAt || announcement.createdAt),
        expiresAt: announcement.expiresAt ? toLocalInput(announcement.expiresAt) : "",
      }
    );
  }

  function setScheduleField(announcement, field, value) {
    setScheduleDrafts((current) => {
      const base = current[announcement.id] || {
        publishAt: toLocalInput(announcement.publishAt || announcement.createdAt),
        expiresAt: announcement.expiresAt ? toLocalInput(announcement.expiresAt) : "",
      };
      return { ...current, [announcement.id]: { ...base, [field]: value } };
    });
  }

  async function saveSchedule(announcement) {
    const schedule = scheduleOf(announcement);
    setBusySchedule(announcement.id);
    setError("");
    try {
      const response = await fetch("/api/admin/announcements", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: announcement.id,
          publishAt: toIso(schedule.publishAt),
          expiresAt: toIso(schedule.expiresAt),
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Could not move that announcement.");
      setList((current) =>
        current.map((item) => (item.id === announcement.id ? result.announcement : item))
      );
      setScheduleDrafts((current) => {
        const next = { ...current };
        delete next[announcement.id];
        return next;
      });
      setNow(Date.now());
      toast.push("Schedule saved.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusySchedule("");
    }
  }

  const meta = levelMeta(draft.level);
  const canPost =
    !posting &&
    draft.title.trim().length > 0 &&
    !richTextIsEmpty(draft.body) &&
    (Boolean(draft.expiresAt) || isValidWindowHours(draft.windowHours));

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="muted text-sm max-w-xl">
          Every announcement runs for the number of hours you set, then moves to Past on its own.
          Priority and emergency notices are only ranked higher while they run. They run out of
          time like everything else.
        </p>
        <button type="button" className="btn btn-secondary btn-sm" onClick={load} disabled={loading}>
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {error && <p className="badge badge-denied">{error}</p>}
      {toast.view}

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
            <span className="field-label">Category</span>
            <select
              className="select"
              value={draft.category}
              onChange={(event) =>
                setDraft((current) => ({ ...current, category: event.target.value }))
              }
            >
              {CATEGORIES.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field" style={{ minWidth: "11rem" }}>
            <span className="field-label">Runs for (hours, if no end)</span>
            <input
              type="number"
              min="1"
              max="8760"
              step="1"
              className="input"
              value={draft.windowHours}
              placeholder="e.g. 24"
              onChange={(event) =>
                setDraft((current) => ({ ...current, windowHours: event.target.value }))
              }
            />
          </label>

          <label className="field" style={{ minWidth: "13rem" }}>
            <span className="field-label">Goes live (optional)</span>
            <input
              type="datetime-local"
              className="input"
              value={draft.publishAt}
              onChange={(event) =>
                setDraft((current) => ({ ...current, publishAt: event.target.value }))
              }
            />
          </label>

          <label className="field" style={{ minWidth: "13rem" }}>
            <span className="field-label">Ends (optional)</span>
            <input
              type="datetime-local"
              className="input"
              value={draft.expiresAt}
              onChange={(event) =>
                setDraft((current) => ({ ...current, expiresAt: event.target.value }))
              }
            />
          </label>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <label className="field flex-1" style={{ minWidth: "16rem" }}>
            <span className="field-label">Image URL (optional)</span>
            <input
              className="input"
              value={draft.image}
              onChange={(event) => setDraft((current) => ({ ...current, image: event.target.value }))}
              placeholder="https://… or /media/…"
              maxLength={500}
            />
          </label>

          <label className="field" style={{ minWidth: "12rem" }}>
            <span className="field-label">Pin to the top</span>
            <button
              type="button"
              className="chip"
              data-active={draft.pinned}
              aria-pressed={draft.pinned}
              onClick={() => setDraft((current) => ({ ...current, pinned: !current.pinned }))}
            >
              {draft.pinned ? "Pinned" : "Not pinned"}
            </button>
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
          {meta.note} Leave it blank to post now. A start in the future keeps the notice hidden
          until that time, and an end time moves it to Past when it passes. Without an end time it
          runs for the number of hours above. 24 is one day, 168 is one week.
        </p>

        {draft.title.trim() && (
          <div className="grid gap-2">
            <p className="field-label">Preview</p>
            <AnnouncementCard
              announcement={normalizeAnnouncement({ ...draft, createdAt: new Date().toISOString(), author: "Preview" })}
              now={now}
            />
          </div>
        )}

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
          const state = announcementState(announcement, now);
          const schedule = scheduleOf(announcement);
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
                    <span className="badge badge-neutral">{categoryMeta(announcement.category).label}</span>
                    {announcement.pinned && <span className="badge badge-accepted">Pinned</span>}
                    <span
                      className={`badge ${
                        state === "current"
                          ? "badge-accepted"
                          : state === "scheduled"
                            ? "badge-pending"
                            : "badge-neutral"
                      }`}
                    >
                      {state === "current" ? "Current" : state === "scheduled" ? "Scheduled" : "Past"}
                    </span>
                  </div>
                  <p className="faint text-xs mt-1">
                    Posted {formatWhen(announcement.createdAt)} by {announcement.author || "Admin"}
                    {state === "scheduled" && <> · goes live {formatWhen(announcement.publishAt)}</>}
                    {announcement.expiresAt
                      ? ` · ends ${formatWhen(announcement.expiresAt)}`
                      : Number.isFinite(announcement.windowHours)
                        ? ` · current for ${hoursLabel(announcement.windowHours)}`
                        : " · no time limit set"}
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

              <div className="flex flex-wrap items-end gap-2 mt-3 pt-3" style={{ borderTop: "1px solid var(--glass-edge)" }}>
                <label className="field" style={{ minWidth: "13rem" }}>
                  <span className="field-label">Goes live</span>
                  <input
                    type="datetime-local"
                    className="input"
                    value={schedule.publishAt}
                    onChange={(event) =>
                      setScheduleField(announcement, "publishAt", event.target.value)
                    }
                  />
                </label>
                <label className="field" style={{ minWidth: "13rem" }}>
                  <span className="field-label">Ends</span>
                  <input
                    type="datetime-local"
                    className="input"
                    value={schedule.expiresAt}
                    onChange={(event) =>
                      setScheduleField(announcement, "expiresAt", event.target.value)
                    }
                  />
                </label>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={busySchedule === announcement.id}
                  onClick={() => saveSchedule(announcement)}
                >
                  {busySchedule === announcement.id ? "Saving…" : "Save schedule"}
                </button>
              </div>
            </article>
          );
        })
      )}
          {dialog}
    </div>
  );
}
