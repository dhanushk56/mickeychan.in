"use client";

import { useState } from "react";
import { MAX_NOTE, REPORT_REASONS } from "@/lib/report-meta";

export default function ReportButton({ threadId, replyId = "", label = "Report" }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REPORT_REASONS[0].id);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId, replyId, reason, note }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "That did not send. Try again.");
      setSent(true);
      setOpen(false);
      setNote("");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return <span className="faint text-xs">Reported to the moderators</span>;
  }

  if (!open) {
    return (
      <button
        type="button"
        className="btn btn-ghost btn-sm faint"
        onClick={() => setOpen(true)}
        aria-expanded={false}
      >
        {label}
      </button>
    );
  }

  const fieldId = `report-${threadId}-${replyId || "thread"}`;

  return (
    <form onSubmit={submit} className="glass-card grid gap-2 p-3" style={{ maxWidth: "22rem" }}>
      <label className="text-xs font-semibold" htmlFor={`${fieldId}-reason`}>
        What is wrong with this post?
      </label>
      <select
        id={`${fieldId}-reason`}
        className="select"
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        disabled={busy}
      >
        {REPORT_REASONS.map((entry) => (
          <option key={entry.id} value={entry.id}>
            {entry.label}
          </option>
        ))}
      </select>
      <textarea
        className="textarea"
        rows={3}
        maxLength={MAX_NOTE}
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Anything else the moderators should know?"
        aria-label="Anything else the moderators should know?"
        disabled={busy}
      />
      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" className="btn btn-secondary btn-sm" disabled={busy}>
          {busy ? "Sending..." : "Send report"}
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => setOpen(false)}
          disabled={busy}
        >
          Cancel
        </button>
      </div>
      {error && (
        <p className="badge badge-denied" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
