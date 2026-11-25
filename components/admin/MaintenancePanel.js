"use client";

import { useCallback, useEffect, useState } from "react";

export default function MaintenancePanel() {
  const [state, setState] = useState(null);
  const [roles, setRoles] = useState([]);
  const [maxMessage, setMaxMessage] = useState(400);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const response = await fetch("/api/admin/maintenance", { cache: "no-store" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Could not read maintenance mode.");
      setState(result.state);
      setMessage(result.state.message || "");
      setRoles(result.roles || []);
      setMaxMessage(result.maxMessage || 400);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save(enabled) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/maintenance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled, message }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Could not save maintenance mode.");
      setState(result.state);
      setMessage(result.state.message || "");
      setNotice(enabled ? "The site is closed to visitors." : "The site is open again.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const enabled = state?.enabled === true;

  return (
    <div className="grid gap-4">
      <div className="glass-card application-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display font-bold">Maintenance mode</h3>
            <p className="faint text-xs mt-1">
              {enabled
                ? "The site is closed. Only people with the bypass permission can open it."
                : "The site is open. Turn this on to close it while you make changes."}
            </p>
          </div>
          <span className={`badge ${enabled ? "badge-pending" : "badge-accepted"}`}>
            {enabled ? "Closed" : "Open"}
          </span>
        </div>

        <label className="field mt-4">
          <span className="field-label">Message on the closed page</span>
          <textarea
            className="textarea"
            rows={3}
            value={message}
            maxLength={maxMessage}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="The site is closed while I make a few changes."
          />
        </label>
        <p className="faint text-xs mt-1">
          {message.length} / {maxMessage} characters. Leaving it empty shows the default line.
        </p>

        <div className="flex flex-wrap gap-2 mt-4">
          <button
            type="button"
            className={`btn ${enabled ? "btn-primary" : "btn-danger"} btn-sm`}
            onClick={() => save(!enabled)}
            disabled={busy || !state}
          >
            {busy
              ? "Saving…"
              : enabled
                ? "Reopen the site"
                : "Close the site"}
          </button>
          {message !== (state?.message || "") && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => save(enabled)}
              disabled={busy || !state}
            >
              Save the message
            </button>
          )}
          <button type="button" className="btn btn-ghost btn-sm" onClick={load} disabled={busy}>
            Refresh
          </button>
        </div>

        {error && <p className="badge badge-denied mt-3 w-full justify-center">{error}</p>}
        {notice && <p className="badge badge-accepted mt-3 w-full justify-center">{notice}</p>}
      </div>

      <div className="glass-card application-card">
        <h3 className="font-display font-bold">Who gets in while it is closed</h3>
        <p className="muted text-sm mt-1 leading-relaxed">
          The console, the sign in pages and anyone holding the bypass permission stay open. Every
          other visitor sees the closed page.
        </p>
        <div className="flex flex-wrap gap-2 mt-3">
          {roles.length === 0 ? (
            <p className="faint text-sm">No role carries the bypass permission right now.</p>
          ) : (
            roles.map((role) => (
              <span key={role.id} className="badge badge-neutral">
                {role.name}
              </span>
            ))
          )}
        </div>
        <p className="faint text-xs mt-3 leading-relaxed">
          Give someone the bypass through Roles, or by moving them into the Bypass maintenance role.
          Turn the site back on from this tab when you are done.
        </p>
      </div>
    </div>
  );
}
