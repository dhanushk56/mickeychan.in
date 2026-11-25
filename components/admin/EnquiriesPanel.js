"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useConfirm } from "@/components/ConfirmDialog";
import { ENQUIRY_STATUSES, MAX_NOTE, categoryMeta, statusMeta } from "@/lib/enquiry-meta";

function formatWhen(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
    hour12: true,
  });
}

function EnquiryCard({ entry, canManage, canDelete, onUpdated, onDeleted, askConfirm }) {
  const [status, setStatus] = useState(entry.status);
  const [note, setNote] = useState(entry.note || "");
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState("");

  const category = categoryMeta(entry.category);
  const changed = status !== entry.status || note !== (entry.note || "");

  async function save() {
    if (busy || !changed) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/enquiries", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: entry.id, status, note }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not save that enquiry.");
      onUpdated(data.enquiry);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    const ok = await askConfirm({
      title: "Delete this enquiry?",
      description: `The message from ${entry.name} (${entry.reference || entry.id}) is removed permanently.`,
      confirmLabel: "Delete enquiry",
    });
    if (!ok) return;
    setRemoving(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/enquiries?id=${encodeURIComponent(entry.id)}`, {
        method: "DELETE",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not delete that enquiry.");
      onDeleted(entry.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setRemoving(false);
    }
  }

  return (
    <article className="glass-card application-card">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display font-bold text-base">{entry.subject}</h3>
            <span className={`badge ${statusMeta(entry.status).badge}`}>
              {statusMeta(entry.status).label}
            </span>
            <span className="badge badge-neutral">{category.label}</span>
            {entry.reference && <span className="badge badge-neutral">{entry.reference}</span>}
          </div>
          <p className="faint text-xs mt-1">
            {entry.name} · {formatWhen(entry.createdAt)}
            {entry.memberUsername ? ` · @${entry.memberUsername}` : " · sent without an account"}
            {entry.country ? ` · ${entry.city ? `${entry.city}, ` : ""}${entry.country}` : ""}
          </p>
        </div>
        {canDelete && (
          <button
            type="button"
            className="btn btn-ghost"
            style={{ color: "var(--danger)" }}
            onClick={remove}
            disabled={removing}
          >
            {removing ? "Deleting…" : "Delete"}
          </button>
        )}
      </div>

      <a
        href={`mailto:${entry.email}?subject=${encodeURIComponent(`Re: ${entry.reference || entry.subject}`)}`}
        className="text-xs font-semibold mt-2 inline-block"
        style={{ color: "var(--primary)" }}
      >
        {entry.email}
      </a>

      <p className="text-sm mt-3 whitespace-pre-wrap break-words">{entry.message}</p>

      {canManage && (
        <div className="grid gap-2 mt-4">
          <div className="flex flex-wrap items-end gap-2">
            <label className="field" style={{ minWidth: "11rem" }}>
              <span className="field-label">Status</span>
              <select
                className="select"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                {ENQUIRY_STATUSES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field flex-1" style={{ minWidth: "16rem" }}>
              <span className="field-label">Internal note (never shown publicly)</span>
              <input
                className="input"
                value={note}
                maxLength={MAX_NOTE}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Who is handling this, and what was decided?"
              />
            </label>
            <button type="button" className="btn btn-primary btn-sm" onClick={save} disabled={busy || !changed}>
              {busy ? "Saving…" : "Save"}
            </button>
          </div>
          {entry.handledBy && (
            <p className="faint text-xs">
              Last handled by {entry.handledBy}
              {entry.updatedAt ? ` · ${formatWhen(entry.updatedAt)}` : ""}
            </p>
          )}
        </div>
      )}

      {error && <p className="badge badge-denied mt-2">{error}</p>}
    </article>
  );
}

export default function EnquiriesPanel({ canManage = false, canDelete = false }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [dialog, askConfirm] = useConfirm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/enquiries", { cache: "no-store" });
      if (response.status === 401) {
        setError("Your admin session expired — lock the console and sign in again.");
        return;
      }
      if (!response.ok) throw new Error("Could not load the enquiries.");
      const data = await response.json();
      setList(Array.isArray(data.enquiries) ? data.enquiries : []);
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

  const counts = useMemo(() => {
    const map = { all: list.length };
    for (const item of ENQUIRY_STATUSES) map[item.id] = 0;
    for (const entry of list) map[entry.status] = (map[entry.status] || 0) + 1;
    return map;
  }, [list]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return list.filter((entry) => {
      if (filter !== "all" && entry.status !== filter) return false;
      if (!term) return true;
      return [entry.name, entry.email, entry.subject, entry.message, entry.reference, entry.category]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [filter, list, search]);

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="muted text-sm max-w-xl">
          Messages from the public contact form. Enquiries from signed-in accounts appear in
          Messages, and applications stay in Applications.
        </p>
        <button type="button" className="btn btn-secondary btn-sm" onClick={load} disabled={loading}>
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {error && <p className="badge badge-denied">{error}</p>}
      {notice && <p className="badge badge-accepted">{notice}</p>}

      <div className="flex flex-wrap items-center gap-2">
        {[{ id: "all", label: "All" }, ...ENQUIRY_STATUSES].map((item) => (
          <button
            key={item.id}
            type="button"
            className="chip"
            data-active={filter === item.id}
            onClick={() => setFilter(item.id)}
          >
            {item.label} <span className="opacity-60">{counts[item.id] ?? 0}</span>
          </button>
        ))}
        <input
          className="input"
          style={{ maxWidth: "16rem", marginLeft: "auto" }}
          placeholder="Search enquiries…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Search enquiries"
        />
      </div>

      {loading && list.length === 0 ? (
        <div className="glass-card p-8 muted">Loading enquiries…</div>
      ) : visible.length === 0 ? (
        <div className="empty-state">
          <p className="font-display font-bold">
            {list.length === 0 ? "No enquiries yet" : "Nothing matches that"}
          </p>
          <p className="muted text-sm max-w-md">
            {list.length === 0
              ? "Messages sent through /contact land here, with a reference number for the sender."
              : "Try a different status or clear the search."}
          </p>
        </div>
      ) : (
        visible.map((entry) => (
          <EnquiryCard
            key={entry.id}
            entry={entry}
            canManage={canManage}
            canDelete={canDelete}
            askConfirm={askConfirm}
            onUpdated={(updated) => {
              setList((current) => current.map((item) => (item.id === updated.id ? updated : item)));
              setNotice(`Saved ${updated.reference || updated.id} as ${statusMeta(updated.status).label}.`);
              setError("");
            }}
            onDeleted={(id) => {
              setList((current) => current.filter((item) => item.id !== id));
              setNotice("Enquiry deleted.");
              setError("");
            }}
          />
        ))
      )}

      {dialog}
    </div>
  );
}
