"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

function timeAgo(value) {
  const at = new Date(value || 0).getTime();
  if (!Number.isFinite(at) || at <= 0) return "";
  const minutes = Math.round((Date.now() - at) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(at).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

// The bell only renders for a signed-in member: the navbar already fetches the
// session, and this reuses the same cookie through the notifications API.
export default function NotificationsBell() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const wrap = useRef(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/notifications", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!alive) return;
        setItems(Array.isArray(data?.notifications) ? data.notifications : []);
        setLoaded(true);
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

  const unread = items.filter((entry) => !entry.read).length;

  async function markRead(ids) {
    try {
      const response = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ids ? { action: "read", ids } : { action: "read-all" }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && Array.isArray(data?.notifications)) setItems(data.notifications);
    } catch {
      // Leaving the badge alone is better than clearing state that never saved.
    }
  }

  function openPanel() {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) markRead();
  }

  if (loaded && items.length === 0) return null;

  return (
    <div className="bell" ref={wrap}>
      <button
        type="button"
        className="icon-button bell-button"
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        aria-haspopup="true"
        aria-expanded={open}
        data-unread={unread > 0}
        onClick={openPanel}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {unread > 0 && <span className="bell-dot" aria-hidden="true">{unread > 9 ? "9+" : unread}</span>}
      </button>

      {open && (
        <div className="bell-pop" role="dialog" aria-label="Notifications">
          <div className="bell-head">
            <p className="font-display font-bold text-sm">Notifications</p>
            {unread > 0 && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => markRead()}>
                Mark all read
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <p className="faint text-xs">Nothing yet. Updates about your applications and messages land here.</p>
          ) : (
            <ul className="bell-list">
              {items.slice(0, 12).map((entry) => (
                <li key={entry.id} className="bell-item" data-unread={!entry.read}>
                  {entry.href ? (
                    <Link href={entry.href} className="bell-link" onClick={() => setOpen(false)}>
                      <span className="bell-title">{entry.title}</span>
                      {entry.body && <span className="bell-body">{entry.body}</span>}
                      <span className="faint text-xs">{timeAgo(entry.at)}</span>
                    </Link>
                  ) : (
                    <div className="bell-link">
                      <span className="bell-title">{entry.title}</span>
                      {entry.body && <span className="bell-body">{entry.body}</span>}
                      <span className="faint text-xs">{timeAgo(entry.at)}</span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
