"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";

const EMPTY_MILESTONE = { label: "", detail: "", date: "" };

function formatWhen(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export default function HomePanel({ canEdit }) {
  const [config, setConfig] = useState(null);
  const [videos, setVideos] = useState([]);
  const [members, setMembers] = useState([]);
  const [kinds, setKinds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/home", { cache: "no-store" });
      if (response.status === 401) {
        setError("Your admin session expired. Sign in again.");
        return;
      }
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || "Could not load the home page settings.");
        return;
      }
      setConfig(data.config);
      setVideos(Array.isArray(data.videos) ? data.videos : []);
      setMembers(Array.isArray(data.members) ? data.members : []);
      setKinds(Array.isArray(data.tickerKinds) ? data.tickerKinds : []);
      setError("");
    } catch {
      setError("Could not load the home page settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function patch(next) {
    setConfig((current) => ({ ...current, ...next }));
  }

  function patchWeek(next) {
    setConfig((current) => ({ ...current, videoOfWeek: { ...current.videoOfWeek, ...next } }));
  }

  function toggleKind(id) {
    setConfig((current) => {
      const has = current.tickerKinds.includes(id);
      return {
        ...current,
        tickerKinds: has
          ? current.tickerKinds.filter((kind) => kind !== id)
          : [...current.tickerKinds, id],
      };
    });
  }

  function toggleMember(username) {
    setConfig((current) => {
      const has = current.featuredMembers.includes(username);
      return {
        ...current,
        featuredMembers: has
          ? current.featuredMembers.filter((entry) => entry !== username)
          : [...current.featuredMembers, username].slice(0, 6),
      };
    });
  }

  function updateMilestone(index, next) {
    setConfig((current) => ({
      ...current,
      milestones: current.milestones.map((entry, position) =>
        position === index ? { ...entry, ...next } : entry
      ),
    }));
  }

  function addMilestone() {
    setConfig((current) => ({
      ...current,
      milestones: [...current.milestones, { ...EMPTY_MILESTONE, id: `m${Date.now().toString(36)}` }],
    }));
  }

  function removeMilestone(index) {
    setConfig((current) => ({
      ...current,
      milestones: current.milestones.filter((_, position) => position !== index),
    }));
  }

  async function save() {
    if (!config) return;
    setSaving(true);
    try {
      const response = await fetch("/api/admin/home", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || "Could not save the home page.");
        toast.push(data.error || "Could not save the home page.", "error");
        return;
      }
      setConfig(data.config);
      setError("");
      toast.push("Home page saved.");
    } catch {
      setError("Could not save the home page.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="muted text-sm">Loading the home page settings…</p>;
  }

  if (!config) {
    return (
      <div className="glass-card p-5">
        <p className="muted text-sm">{error || "The home page settings could not be loaded."}</p>
        <button type="button" className="btn btn-secondary btn-sm mt-3" onClick={load}>
          Try again
        </button>
      </div>
    );
  }

  const longForm = videos.filter((video) => video.type !== "short");
  const shorts = videos.filter((video) => video.type === "short");

  return (
    <div className="grid gap-4">
      {toast.view}
      {error && (
        <p className="badge badge-denied" role="alert">
          {error}
        </p>
      )}

      <section className="glass-card p-5 grid gap-3">
        <div>
          <h2 className="font-display font-bold">Hero pick</h2>
          <p className="faint text-xs mt-1">
            Left empty, the hero shows the two newest long-form uploads.
          </p>
        </div>
        <label className="field">
          <span>Featured video</span>
          <select
            className="input"
            value={config.featuredVideoId}
            onChange={(event) => patch({ featuredVideoId: event.target.value })}
            disabled={!canEdit}
          >
            <option value="">Newest uploads</option>
            {longForm.map((video) => (
              <option key={video.id} value={video.id}>
                {video.title}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="glass-card p-5 grid gap-3">
        <div>
          <h2 className="font-display font-bold">Video of the week</h2>
          <p className="faint text-xs mt-1">
            Shows between the start and end dates, or whenever the dates are left empty.
          </p>
        </div>
        <label className="field">
          <span>Video</span>
          <select
            className="input"
            value={config.videoOfWeek.videoId}
            onChange={(event) => patchWeek({ videoId: event.target.value })}
            disabled={!canEdit}
          >
            <option value="">Not running</option>
            {[...longForm, ...shorts].map((video) => (
              <option key={video.id} value={video.id}>
                {video.title}
              </option>
            ))}
          </select>
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="field">
            <span>Starts</span>
            <input
              type="date"
              className="input"
              value={config.videoOfWeek.start}
              onChange={(event) => patchWeek({ start: event.target.value })}
              disabled={!canEdit}
            />
          </label>
          <label className="field">
            <span>Ends</span>
            <input
              type="date"
              className="input"
              value={config.videoOfWeek.end}
              onChange={(event) => patchWeek({ end: event.target.value })}
              disabled={!canEdit}
            />
          </label>
        </div>
        <label className="field">
          <span>Why this one</span>
          <input
            type="text"
            className="input"
            maxLength={220}
            placeholder="One line about the pick."
            value={config.videoOfWeek.blurb}
            onChange={(event) => patchWeek({ blurb: event.target.value })}
            disabled={!canEdit}
          />
        </label>
      </section>

      <section className="glass-card p-5 grid gap-3">
        <div>
          <h2 className="font-display font-bold">Activity strip</h2>
          <p className="faint text-xs mt-1">
            Which sources feed the recent activity line. Everything shown comes from real records.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {kinds.map((kind) => (
            <label key={kind.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={config.tickerKinds.includes(kind.id)}
                onChange={() => toggleKind(kind.id)}
                disabled={!canEdit}
              />
              {kind.label}
            </label>
          ))}
        </div>
      </section>

      <section className="glass-card p-5 grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display font-bold">Milestones</h2>
            <p className="faint text-xs mt-1">Newest first on the page. Undated entries show last.</p>
          </div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={addMilestone} disabled={!canEdit}>
            Add milestone
          </button>
        </div>

        {config.milestones.length === 0 ? (
          <p className="muted text-sm">No milestones yet.</p>
        ) : (
          <ul className="grid gap-3">
            {config.milestones.map((entry, index) => (
              <li key={entry.id} className="grid gap-2 sm:grid-cols-[10rem_1fr_1fr_auto] sm:items-end">
                <label className="field">
                  <span>Date</span>
                  <input
                    type="date"
                    className="input"
                    value={entry.date}
                    onChange={(event) => updateMilestone(index, { date: event.target.value })}
                    disabled={!canEdit}
                  />
                </label>
                <label className="field">
                  <span>Milestone</span>
                  <input
                    type="text"
                    className="input"
                    maxLength={80}
                    value={entry.label}
                    onChange={(event) => updateMilestone(index, { label: event.target.value })}
                    disabled={!canEdit}
                  />
                </label>
                <label className="field">
                  <span>Detail</span>
                  <input
                    type="text"
                    className="input"
                    maxLength={180}
                    value={entry.detail}
                    onChange={(event) => updateMilestone(index, { detail: event.target.value })}
                    disabled={!canEdit}
                  />
                </label>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => removeMilestone(index)}
                  disabled={!canEdit}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="glass-card p-5 grid gap-3">
        <div>
          <h2 className="font-display font-bold">Featured members</h2>
          <p className="faint text-xs mt-1">
            Only members with a public profile can be featured. Their name links to the profile page.
          </p>
        </div>
        {members.length === 0 ? (
          <p className="muted text-sm">No members yet.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {members.map((member) => {
              const checked = config.featuredMembers.includes(member.username);
              return (
                <li key={member.username}>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleMember(member.username)}
                      disabled={!canEdit || (!member.profileVisible && !checked)}
                    />
                    <span className={member.profileVisible ? "" : "faint"}>
                      @{member.username}
                      {member.profileVisible ? "" : " (private profile)"}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {canEdit && (
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save home page"}
          </button>
          <button type="button" className="btn btn-secondary" onClick={load} disabled={saving}>
            Reload
          </button>
          {config.videoOfWeek.start && config.videoOfWeek.end && (
            <span className="faint text-xs">
              Running {formatWhen(config.videoOfWeek.start)} to {formatWhen(config.videoOfWeek.end)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
