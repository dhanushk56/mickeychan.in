"use client";

import { useCallback, useEffect, useState } from "react";
import SocialIcon from "@/components/SocialIcon";
import { SOCIAL_ICON_IDS } from "@/data/socials";
import { useConfirm } from "@/components/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";

const EMPTY_ROW = { name: "", short: "", href: "", icon: "youtube" };

function moveInArray(list, index, direction) {
  const target = index + direction;
  if (target < 0 || target >= list.length) return list;
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export default function SocialsPanel({ canEdit = false }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const [dialog, askConfirm] = useConfirm();
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/socials", { cache: "no-store" });
      if (response.status === 401) {
        setError("Your admin session expired. Lock the console and sign in again.");
        return;
      }
      if (!response.ok) throw new Error("Could not load the social links.");
      const data = await response.json();
      setList(Array.isArray(data.socials) ? data.socials : []);
      setDirty(false);
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

  function update(index, patch) {
    setList((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));
    setDirty(true);
  }

  function addRow() {
    setList((current) => [...current, { ...EMPTY_ROW }]);
    setDirty(true);
  }

  async function removeRow(index) {
    const row = list[index];
    const ok = await askConfirm({
      title: "Remove this link?",
      description: `${row?.name || "This link"} disappears from the socials page, the footer and the home page.`,
      confirmLabel: "Remove link",
    });
    if (!ok) return;
    setList((current) => current.filter((_, i) => i !== index));
    setDirty(true);
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/admin/socials", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ socials: list }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Could not save the social links.");
      setList(result.socials || []);
      setDirty(false);
      toast.push("Social links saved.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="muted text-sm max-w-xl">
          These links show on the socials page, the footer and the home page. A row needs a name and
          a full https link or a mailto address. Order matters: the first link is the one the footer
          shows first.
        </p>
        <button type="button" className="btn btn-secondary btn-sm" onClick={load} disabled={loading}>
          {loading ? "Loading…" : "Reload"}
        </button>
      </div>

      {error && <p className="badge badge-denied">{error}</p>}
      {toast.view}

      {loading && list.length === 0 ? (
        <div className="glass-card p-8 muted">Loading social links…</div>
      ) : (
        <div className="grid gap-3">
          {list.map((row, index) => (
            <div key={`social-${index}`} className="glass-card application-card grid gap-3">
              <div className="flex flex-wrap items-end gap-2">
                <label className="field flex-1" style={{ minWidth: "12rem" }}>
                  <span className="field-label">Name</span>
                  <input
                    className="input"
                    value={row.name}
                    onChange={(event) => update(index, { name: event.target.value })}
                    placeholder="MickeyChan (YouTube)"
                    maxLength={80}
                  />
                </label>
                <label className="field" style={{ minWidth: "8rem" }}>
                  <span className="field-label">Short label</span>
                  <input
                    className="input"
                    value={row.short}
                    onChange={(event) => update(index, { short: event.target.value })}
                    placeholder="MickeyChan"
                    maxLength={40}
                  />
                </label>
                <label className="field" style={{ minWidth: "9rem" }}>
                  <span className="field-label">Icon</span>
                  <select
                    className="select"
                    value={row.icon}
                    onChange={(event) => update(index, { icon: event.target.value })}
                  >
                    {SOCIAL_ICON_IDS.map((icon) => (
                      <option key={icon} value={icon}>
                        {icon}
                      </option>
                    ))}
                  </select>
                </label>
                <span className="glass-inset icon-button" aria-hidden="true">
                  <SocialIcon name={row.icon} className="w-4 h-4" />
                </span>
              </div>

              <label className="field">
                <span className="field-label">Link</span>
                <input
                  className="input"
                  value={row.href}
                  onChange={(event) => update(index, { href: event.target.value })}
                  placeholder="https://… or mailto:name@example.com"
                  maxLength={300}
                />
              </label>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="icon-button"
                    title="Move up"
                    onClick={() => {
                      setList((current) => moveInArray(current, index, -1));
                      setDirty(true);
                    }}
                    disabled={index === 0}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="icon-button"
                    title="Move down"
                    onClick={() => {
                      setList((current) => moveInArray(current, index, 1));
                      setDirty(true);
                    }}
                    disabled={index === list.length - 1}
                  >
                    ↓
                  </button>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ color: "var(--danger)" }}
                  onClick={() => removeRow(index)}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="btn btn-secondary" onClick={addRow}>
              + Add link
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={save}
              disabled={!canEdit || saving || loading}
            >
              {saving ? "Saving…" : dirty ? "Save changes •" : "Save links"}
            </button>
            {!canEdit && <span className="faint text-xs">Your role can view these but not change them.</span>}
          </div>
        </div>
      )}
      {dialog}
    </div>
  );
}
