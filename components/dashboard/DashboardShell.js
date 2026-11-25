"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useConfirm, usePrompt } from "@/components/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import EmptyState from "@/components/ui/EmptyState";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "library", label: "Library" },
  { id: "applications", label: "Applications" },
  { id: "settings", label: "Settings" },
];

function formatDay(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function Stat({ label, value, hint }) {
  return (
    <div className="dash-stat">
      <span className="dash-stat-value">{value}</span>
      <span className="dash-stat-label">{label}</span>
      {hint && <span className="dash-stat-hint">{hint}</span>}
    </div>
  );
}

function VideoLine({ id, meta, when, children }) {
  const video = meta || { id, title: "Video unavailable", thumbnail: "", type: "video" };
  return (
    <li className="dash-video">
      <Link href={`/videos/${id}`} className="dash-video-main">
        <span
          className="dash-video-thumb"
          data-short={video.type === "short"}
          style={video.thumbnail ? { backgroundImage: `url(${video.thumbnail})` } : undefined}
          aria-hidden="true"
        />
        <span className="dash-video-text">
          <span className="dash-video-title">{video.title}</span>
          <span className="faint text-xs">
            {[when ? formatDay(when) : "", video.channelLabel].filter(Boolean).join(" · ") || "On YouTube"}
          </span>
        </span>
      </Link>
      {children}
    </li>
  );
}

export default function DashboardShell({
  profile,
  initialLibrary,
  videosById = {},
  applications = [],
  initialTab = "overview",
}) {
  const router = useRouter();
  const [library, setLibrary] = useState(initialLibrary);
  const [tab, setTab] = useState(TABS.some((entry) => entry.id === initialTab) ? initialTab : "overview");
  const [busy, setBusy] = useState("");
  const [newPlaylist, setNewPlaylist] = useState("");
  const [settings, setSettings] = useState(initialLibrary.settings);
  const { push, view: toastView } = useToast();
  const [confirmView, askConfirm] = useConfirm();
  const [promptView, askPrompt] = usePrompt();

  const counts = useMemo(
    () => ({
      watchLater: library.watchLater.length,
      playlists: library.playlists.length,
      history: library.history.length,
      applications: applications.length,
    }),
    [library, applications]
  );

  function go(next) {
    setTab(next);
    router.replace(`/dashboard?tab=${next}`, { scroll: false });
  }

  async function run(payload, okMessage) {
    setBusy(payload.action);
    try {
      const response = await fetch("/api/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "That didn't work. Try again.");
      if (result.library) setLibrary(result.library);
      if (okMessage) push(okMessage, "success");
      router.refresh();
      return result;
    } catch (problem) {
      push(problem.message, "error");
      return null;
    } finally {
      setBusy("");
    }
  }

  async function removeSaved(videoId) {
    await run({ action: "watch:toggle", videoId, save: false }, "Removed from watch later.");
  }

  async function clearHistory() {
    const yes = await askConfirm({
      title: "Clear your watch history?",
      description: "This removes every video from your history. Watch later and playlists stay as they are.",
      confirmLabel: "Clear history",
      tone: "danger",
    });
    if (!yes) return;
    await run({ action: "history:clear" }, "History cleared.");
  }

  async function createPlaylist(event) {
    event.preventDefault();
    const name = newPlaylist.trim();
    if (!name) return;
    const result = await run({ action: "playlist:create", name }, `Created “${name}”.`);
    if (result) setNewPlaylist("");
  }

  async function renamePlaylist(playlist) {
    const name = await askPrompt({
      title: "Rename playlist",
      label: "Playlist name",
      placeholder: playlist.name,
      confirmLabel: "Save name",
      maxLength: 60,
    });
    if (!name || name === playlist.name) return;
    await run({ action: "playlist:update", id: playlist.id, name }, "Playlist renamed.");
  }

  async function deletePlaylist(playlist) {
    const yes = await askConfirm({
      title: `Delete “${playlist.name}”?`,
      description: "The playlist is removed. The videos themselves stay on YouTube and in your history.",
      confirmLabel: "Delete playlist",
      tone: "danger",
    });
    if (!yes) return;
    await run({ action: "playlist:delete", id: playlist.id }, "Playlist deleted.");
  }

  async function togglePlaylistPublic(playlist) {
    await run(
      { action: "playlist:update", id: playlist.id, public: !playlist.public },
      playlist.public ? "Playlist is private again." : "Playlist is public on your profile."
    );
  }

  async function removePlaylistItem(playlist, videoId) {
    await run({ action: "playlist:item", id: playlist.id, videoId, present: false }, "Removed from playlist.");
  }

  async function saveSettings(event) {
    event.preventDefault();
    await run({ action: "settings:update", settings }, "Library settings saved.");
  }

  return (
    <div className="dash">
      <header className="glass-card dash-head">
        <span className="avatar-frame" aria-hidden="true">
          {profile.avatar ? <img src={profile.avatar} alt="" /> : profile.initials}
        </span>
        <div className="dash-head-text">
          <p className="kicker">Dashboard</p>
          <h1 className="display-lg">{profile.name || profile.username}</h1>
          <p className="muted text-sm">
            @{profile.username} · everything you keep on the site lives here.
          </p>
        </div>
        <Link href="/my-account" className="btn btn-secondary btn-sm">
          Account settings
        </Link>
      </header>

      <div className="tabbar tabbar-fill dash-tabs" role="tablist" aria-label="Dashboard sections">
        {TABS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            role="tab"
            aria-selected={tab === entry.id}
            className="tab"
            data-active={tab === entry.id}
            onClick={() => go(entry.id)}
          >
            <span>{entry.label}</span>
            <span className="tab-count">
              {entry.id === "library"
                ? counts.watchLater + counts.playlists
                : entry.id === "applications"
                  ? counts.applications
                  : 0}
            </span>
          </button>
        ))}
      </div>

      {toastView}
      {confirmView}
      {promptView}

      {tab === "overview" && (
        <section className="grid gap-4">
          <div className="dash-stats">
            <Stat label="Watch later" value={counts.watchLater} hint="Videos you saved for later" />
            <Stat label="Playlists" value={counts.playlists} hint="Your own collections" />
            <Stat label="History" value={counts.history} hint="Recent watches" />
            <Stat label="Applications" value={counts.applications} hint="Roles you applied to" />
          </div>

          <div className="glass-card dash-card">
            <div className="dash-card-head">
              <h2 className="font-display font-bold">Recently saved</h2>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => go("library")}>
                Open library
              </button>
            </div>
            {library.watchLater.length === 0 ? (
              <EmptyState
                title="Nothing saved yet"
                description="Use Save on any video to keep it here for later."
                action={
                  <Link href="/videos" className="btn btn-secondary btn-sm">
                    Browse videos
                  </Link>
                }
              />
            ) : (
              <ul className="dash-list">
                {library.watchLater.slice(0, 4).map((entry) => (
                  <VideoLine key={entry.id} id={entry.id} meta={videosById[entry.id]} when={entry.at} />
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {tab === "library" && (
        <section className="grid gap-4">
          <div className="glass-card dash-card">
            <div className="dash-card-head">
              <h2 className="font-display font-bold">Watch later</h2>
              <span className="badge badge-neutral">{counts.watchLater}</span>
            </div>
            {library.watchLater.length === 0 ? (
              <EmptyState
                title="Watch later is empty"
                description="Save a video from its page and it shows up here."
                action={
                  <Link href="/videos" className="btn btn-secondary btn-sm">
                    Find something to watch
                  </Link>
                }
              />
            ) : (
              <ul className="dash-list">
                {library.watchLater.map((entry) => (
                  <VideoLine key={entry.id} id={entry.id} meta={videosById[entry.id]} when={entry.at}>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => removeSaved(entry.id)}
                      disabled={busy === "watch:toggle"}
                    >
                      Remove
                    </button>
                  </VideoLine>
                ))}
              </ul>
            )}
          </div>

          <div className="glass-card dash-card">
            <div className="dash-card-head">
              <h2 className="font-display font-bold">Playlists</h2>
              <span className="badge badge-neutral">{counts.playlists}</span>
            </div>
            <form className="dash-inline-form" onSubmit={createPlaylist}>
              <label className="field">
                <span className="field-label">New playlist</span>
                <input
                  className="input"
                  value={newPlaylist}
                  maxLength={60}
                  placeholder="e.g. Editing favourites"
                  onChange={(event) => setNewPlaylist(event.target.value)}
                />
              </label>
              <button type="submit" className="btn btn-primary btn-sm" disabled={busy === "playlist:create"}>
                Create
              </button>
            </form>

            {library.playlists.length === 0 ? (
              <EmptyState
                title="No playlists yet"
                description="Group videos into your own collections — private until you make one public."
              />
            ) : (
              <ul className="dash-playlists">
                {library.playlists.map((playlist) => (
                  <li key={playlist.id} className="dash-playlist">
                    <div className="dash-playlist-head">
                      <div>
                        <p className="font-semibold">{playlist.name}</p>
                        <p className="faint text-xs">
                          {playlist.items.length} {playlist.items.length === 1 ? "video" : "videos"} ·{" "}
                          {playlist.public ? "Public on your profile" : "Private"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => renamePlaylist(playlist)}
                        >
                          Rename
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => togglePlaylistPublic(playlist)}
                        >
                          {playlist.public ? "Make private" : "Make public"}
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => deletePlaylist(playlist)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    {playlist.items.length === 0 ? (
                      <p className="faint text-xs">Empty — add videos from any video page.</p>
                    ) : (
                      <ul className="dash-list">
                        {playlist.items.map((videoId) => (
                          <VideoLine key={videoId} id={videoId} meta={videosById[videoId]}>
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() => removePlaylistItem(playlist, videoId)}
                            >
                              Remove
                            </button>
                          </VideoLine>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="glass-card dash-card">
            <div className="dash-card-head">
              <h2 className="font-display font-bold">History</h2>
              {library.history.length > 0 && (
                <button type="button" className="btn btn-secondary btn-sm" onClick={clearHistory}>
                  Clear history
                </button>
              )}
            </div>
            {!library.settings.historyOn ? (
              <EmptyState
                title="History is switched off"
                description="Turn it back on in Settings to keep track of what you watch."
              />
            ) : library.history.length === 0 ? (
              <EmptyState
                title="No history yet"
                description="Videos you open while signed in show up here, up to your daily limit."
              />
            ) : (
              <ul className="dash-list">
                {library.history.slice(0, 24).map((entry) => (
                  <VideoLine key={entry.id} id={entry.id} meta={videosById[entry.id]} when={entry.at} />
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {tab === "applications" && (
        <section className="glass-card dash-card">
          <div className="dash-card-head">
            <h2 className="font-display font-bold">Your applications</h2>
            <Link href="/positions" className="btn btn-secondary btn-sm">
              Open positions
            </Link>
          </div>
          {applications.length === 0 ? (
            <EmptyState
              title="No applications yet"
              description="Apply to a role and its status, timeline and reviewer notes appear here."
              action={
                <Link href="/positions" className="btn btn-primary btn-sm">
                  See open roles
                </Link>
              }
            />
          ) : (
            <ul className="dash-apps">
              {applications.map((entry) => (
                <li key={entry.id} className="dash-app">
                  <div className="dash-app-head">
                    <Link href={entry.href} className="font-semibold hover:underline">
                      {entry.title}
                    </Link>
                    <span className={`badge ${entry.badge}`}>{entry.status}</span>
                  </div>
                  <p className="muted text-sm">{entry.note}</p>
                  <p className="faint text-xs">
                    Applied {formatDay(entry.at) || "recently"}
                    {entry.reviewedAt ? ` · last reviewed ${formatDay(entry.reviewedAt)}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {tab === "settings" && (
        <section className="glass-card dash-card">
          <div className="dash-card-head">
            <h2 className="font-display font-bold">Library settings</h2>
          </div>
          <form className="dash-settings" onSubmit={saveSettings}>
            <label className="dash-switch">
              <input
                type="checkbox"
                checked={settings.historyOn}
                onChange={(event) => setSettings({ ...settings, historyOn: event.target.checked })}
              />
              <span>
                <span className="dash-switch-title">Keep my watch history</span>
                <span className="faint text-xs block">
                  Off means nothing new is recorded. Existing history stays until you clear it.
                </span>
              </span>
            </label>

            <label className="field">
              <span className="field-label">Videos kept per day</span>
              <input
                className="input"
                type="number"
                min={10}
                max={300}
                value={settings.historyCap}
                onChange={(event) => setSettings({ ...settings, historyCap: event.target.value })}
              />
              <span className="faint text-xs mt-1">
                Between 10 and 300. Once a day hits the limit, new watches are not recorded.
              </span>
            </label>

            <label className="dash-switch">
              <input
                type="checkbox"
                checked={settings.publicPlaylists}
                onChange={(event) => setSettings({ ...settings, publicPlaylists: event.target.checked })}
              />
              <span>
                <span className="dash-switch-title">Show public playlists on my profile</span>
                <span className="faint text-xs block">
                  Only playlists you mark public appear. Your watch later and history never do.
                </span>
              </span>
            </label>

            <button type="submit" className="btn btn-primary btn-sm justify-self-start" disabled={busy === "settings:update"}>
              {busy === "settings:update" ? "Saving…" : "Save settings"}
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
