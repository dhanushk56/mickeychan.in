"use client";

import { useState } from "react";

export default function VideoShare({ videoId, title, url }) {
  const [status, setStatus] = useState("");
  const shareUrl =
    typeof window === "undefined" ? url || "" : `${window.location.origin}/videos/${videoId}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setStatus("Link copied");
    } catch {
      setStatus("Couldn't copy — select the address bar instead");
    }
    window.setTimeout(() => setStatus(""), 2200);
  }

  async function share() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, url: shareUrl });
        return;
      } catch {
        // Dismissed or unsupported — fall through to copying.
      }
    }
    copy();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" className="btn btn-secondary btn-sm" onClick={copy}>
        Copy link
      </button>
      <button type="button" className="btn btn-secondary btn-sm" onClick={share}>
        Share
      </button>
      <a href={url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
        Open on YouTube ↗
      </a>
      {status && (
        <span className="faint text-xs" role="status">
          {status}
        </span>
      )}
    </div>
  );
}
