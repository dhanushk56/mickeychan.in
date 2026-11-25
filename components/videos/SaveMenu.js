"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

// Watch later + playlists for one video. Same panel and button styles as the
// rest of the site, and the same API the dashboard uses, so a save made here is
// instantly visible there.
export default function SaveMenu({ videoId }) {
  const [library, setLibrary] = useState(null);
  const [signedOut, setSignedOut] = useState(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState("");
  const [name, setName] = useState("");
  const [notice, setNotice] = useState("");
  const wrap = useRef(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/library", { cache: "no-store" })
      .then(async (response) => {
        if (response.status === 401) {
          if (alive) setSignedOut(true);
          return null;
        }
        return response.ok ? response.json() : null;
      })
      .then((data) => {
        if (alive && data?.library) setLibrary(data.library);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (wrap.current && !wrap.current.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function post(payload) {
    setBusy(payload.action);
    setNotice("");
    try {
      const response = await fetch("/api/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "That didn't work. Try again.");
      if (result.library) setLibrary(result.library);
      return result;
    } catch (problem) {
      setNotice(problem.message);
      return null;
    } finally {
      setBusy("");
    }
  }

  const saved = Boolean(library?.watchLater?.some((entry) => entry.id === videoId));

  async function toggleWatchLater() {
    const result = await post({ action: "watch:toggle", videoId, save: !saved });
    if (result) setNotice(saved ? "Removed from watch later." : "Saved to watch later.");
  }

  async function togglePlaylist(playlist) {
    const present = playlist.items.includes(videoId);
    const result = await post({ action: "playlist:item", id: playlist.id, videoId, present: !present });
    if (result) setNotice(present ? `Removed from ${playlist.name}.` : `Added to ${playlist.name}.`);
  }

  async function createPlaylist(event) {
    event.preventDefault();
    const clean = name.trim();
    if (!clean) return;
    const created = await post({ action: "playlist:create", name: clean });
    if (!created) return;
    setName("");
    const playlist = created.playlist;
    if (playlist?.id) {
      await post({ action: "playlist:item", id: playlist.id, videoId, present: true });
      setNotice(`Added to ${playlist.name}.`);
    }
  }

  if (signedOut) {
    return (
      <Link href={`/login?next=${encodeURIComponent(`/videos/${videoId}`)}`} className="btn btn-secondary btn-sm">
        Log in to save
      </Link>
    );
  }

  return (
    <div className="save-menu" ref={wrap}>
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen(!open)}
      >
        <span aria-hidden="true">{saved ? "★" : "☆"}</span>
        {saved ? "Saved" : "Save"}
      </button>

      {open && (
        <div className="save-pop">
          <div className="save-pop-head">
            <p className="font-display font-bold text-sm">Keep this video</p>
            <button type="button" className="icon-button" aria-label="Close" onClick={() => setOpen(false)}>
              <span aria-hidden="true">×</span>
            </button>
          </div>

          <button
            type="button"
            className="save-row"
            data-active={saved}
            onClick={toggleWatchLater}
            disabled={busy === "watch:toggle"}
          >
            <span className="save-row-label">{saved ? "In watch later" : "Save to watch later"}</span>
            <span aria-hidden="true">{saved ? "✓" : "+"}</span>
          </button>

          <p className="save-pop-label">Playlists</p>
          {!library ? (
            <p className="faint text-xs">Loading your playlists…</p>
          ) : library.playlists.length === 0 ? (
            <p className="faint text-xs">No playlists yet — make one below.</p>
          ) : (
            <ul className="save-playlists">
              {library.playlists.map((playlist) => {
                const inside = playlist.items.includes(videoId);
                return (
                  <li key={playlist.id}>
                    <button
                      type="button"
                      className="save-row"
                      data-active={inside}
                      onClick={() => togglePlaylist(playlist)}
                      disabled={busy === "playlist:item"}
                    >
                      <span className="save-row-label">{playlist.name}</span>
                      <span aria-hidden="true">{inside ? "✓" : "+"}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <form className="save-new" onSubmit={createPlaylist}>
            <input
              className="input"
              value={name}
              maxLength={60}
              placeholder="New playlist name"
              onChange={(event) => setName(event.target.value)}
            />
            <button type="submit" className="btn btn-primary btn-sm" disabled={busy === "playlist:create"}>
              Add
            </button>
          </form>

          {notice && <p className="faint text-xs" role="status">{notice}</p>}

          <Link href="/dashboard?tab=library" className="save-link">
            Open your library <span aria-hidden="true">→</span>
          </Link>
        </div>
      )}
    </div>
  );
}
