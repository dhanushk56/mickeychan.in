"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const POLL_MS = 5000;

const STATUS_META = {
  pending: { label: "Pending", className: "badge-pending" },
  accepted: { label: "Accepted", className: "badge-accepted" },
  denied: { label: "Denied", className: "badge-denied" },
};

function timeAgo(iso) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diff)) return "—";
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

// Local time, always 12-hour. This dashboard only renders submissions inside
// the browser (they arrive by fetch), so "local" is the visitor's own zone.
function formatDateTime(iso) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
    hour12: true,
  });
}

function formatValue(value) {
  if (Array.isArray(value)) return value.join(", ") || "—";
  if (value === undefined || value === null || value === "") return "—";
  return String(value);
}

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.pending;
  return <span className={`badge ${meta.className}`}>{meta.label}</span>;
}

function Stat({ label, value, accent }) {
  return (
    <div className="stat">
      <p className="stat-value" style={accent ? { color: accent } : undefined}>{value}</p>
      <p className="stat-label">{label}</p>
    </div>
  );
}

function ApplicationCard({ entry, busy, onStatus, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const questions = entry.questions || [];
  const shown = expanded ? questions : questions.slice(0, 3);

  return (
    <article className="glass-card application-card">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display font-bold text-base">{entry.formTitle || "Application"}</h3>
            <StatusBadge status={entry.status} />
            {entry.memberUsername && (
              <span className="badge badge-neutral">@{entry.memberUsername}</span>
            )}
          </div>
          <p className="faint text-xs mt-1">
            {entry.formId && (
              <Link href={`/form-builder/apply/${entry.formId}`} className="hover:underline">
                form /{entry.formId}
              </Link>
            )}
            {" · "}
            {formatDateTime(entry.createdAt)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {entry.status !== "accepted" && (
            <button
              type="button"
              className="btn btn-success btn-sm"
              disabled={busy}
              onClick={() => onStatus(entry, "accepted")}
            >
              ✓ Accept
            </button>
          )}
          {entry.status !== "denied" && (
            <button
              type="button"
              className="btn btn-danger btn-sm"
              disabled={busy}
              onClick={() => onStatus(entry, "denied")}
            >
              ✕ Reject
            </button>
          )}
          {entry.status !== "pending" && (
            <button
              type="button"
              className="btn btn-ghost"
              disabled={busy}
              onClick={() => onStatus(entry, "pending")}
            >
              Undo
            </button>
          )}
          <button
            type="button"
            className="btn btn-ghost"
            style={{ color: "var(--danger)" }}
            disabled={busy}
            onClick={() => onDelete(entry)}
          >
            Delete
          </button>
        </div>
      </div>

      <div className="application-grid mt-4">
        {shown.map((question) => (
          <div key={question.id} className="contents">
            <span className="faint">{question.title}</span>
            <span className="whitespace-pre-wrap break-words">{formatValue(entry.responses?.[question.id])}</span>
          </div>
        ))}
        {questions.length === 0 && (
          <p className="faint text-xs col-span-2">No question data recorded for this submission.</p>
        )}
      </div>

      {questions.length > 3 && (
        <button type="button" className="btn btn-ghost mt-2" onClick={() => setExpanded(!expanded)}>
          {expanded ? "Show less" : `Show all ${questions.length} answers`}
        </button>
      )}

      {entry.reviewedAt && (
        <p className="faint text-xs mt-2">
          Reviewed by {entry.reviewedBy || "an admin"} · {timeAgo(entry.reviewedAt)}
        </p>
      )}
    </article>
  );
}

function AccountRow({ account, onDelete, onPassword }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (password.length < 8) return;
    setBusy(true);
    const ok = await onPassword(account, password);
    setBusy(false);
    if (ok) setPassword("");
  }

  return (
    <article className="glass-card application-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display font-bold">{account.name || account.username}</h3>
            <span className="badge badge-neutral">@{account.username}</span>
            <span
              className={`badge ${account.source === "registered" ? "badge-pending" : "badge-accepted"}`}
            >
              {account.source === "registered" ? "Registered" : "From file"}
            </span>
          </div>
          <p className="faint text-xs mt-1">
            {account.createdAt ? `Joined ${formatDateTime(account.createdAt)}` : "Listed in data/users.json"}
            {account.updatedAt ? ` · password set ${formatDateTime(account.updatedAt)}` : ""}
          </p>
        </div>
        <button
          type="button"
          className="btn btn-ghost"
          style={{ color: "var(--danger)" }}
          disabled={busy}
          onClick={() => onDelete(account)}
        >
          Delete account
        </button>
      </div>

      <form onSubmit={submit} className="flex flex-wrap items-end gap-2 mt-3">
        <label className="field flex-1" style={{ minWidth: "12rem" }}>
          <span className="field-label">New password</span>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 8 characters"
            autoComplete="new-password"
          />
        </label>
        <button type="submit" className="btn btn-secondary btn-sm" disabled={busy || password.length < 8}>
          {busy ? "Saving…" : "Set password"}
        </button>
      </form>
    </article>
  );
}

export default function AdminDashboard({ currentUser }) {
  const router = useRouter();
  const [tab, setTab] = useState("applications");
  const [filter, setFilter] = useState("pending");
  const [search, setSearch] = useState("");
  const [data, setData] = useState({ join: [], applications: [], forms: [], accounts: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [live, setLive] = useState(true);
  const [lastSync, setLastSync] = useState(null);
  const [busyId, setBusyId] = useState("");
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState("");
  const [clearing, setClearing] = useState(false);
  const [newAccount, setNewAccount] = useState({ username: "", name: "", password: "" });
  const [creatingAccount, setCreatingAccount] = useState(false);
  const mounted = useRef(true);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/submissions", { cache: "no-store" });
      if (response.status === 401) {
        router.push("/admin");
        return;
      }
      if (!response.ok) throw new Error("Could not load submissions.");
      const next = await response.json();
      if (!mounted.current) return;
      setData({
        join: next.join || [],
        applications: next.applications || [],
        forms: next.forms || [],
        accounts: next.accounts || [],
      });
      setLastSync(new Date());
      setError("");
      setLive(true);
    } catch (err) {
      if (!mounted.current) return;
      setError(err.message);
      setLive(false);
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    mounted.current = true;
    load();
    return () => {
      mounted.current = false;
    };
  }, [load]);

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, POLL_MS);
    const onFocus = () => load();
    document.addEventListener("visibilitychange", onFocus);
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("focus", onFocus);
    };
  }, [load]);

  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(""), 3200);
    return () => clearTimeout(id);
  }, [notice]);

  const counts = useMemo(() => {
    const applications = data.applications;
    return {
      total: applications.length,
      pending: applications.filter((a) => a.status === "pending").length,
      accepted: applications.filter((a) => a.status === "accepted").length,
      denied: applications.filter((a) => a.status === "denied").length,
      messages: data.join.length,
    };
  }, [data]);

  const filteredApplications = useMemo(() => {
    const term = search.trim().toLowerCase();
    return data.applications.filter((entry) => {
      const matchesStatus = filter === "all" || entry.status === filter;
      if (!matchesStatus) return false;
      if (!term) return true;
      const haystack = [
        entry.formTitle,
        entry.formId,
        ...Object.values(entry.responses || {}).map(formatValue),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [data.applications, filter, search]);

  const filteredMessages = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return data.join;
    return data.join.filter((entry) =>
      [entry.name, entry.email, entry.role, entry.message].join(" ").toLowerCase().includes(term)
    );
  }, [data.join, search]);

  async function updateStatus(entry, status) {
    setBusyId(entry.id);
    const previous = data.applications;
    setData((current) => ({
      ...current,
      applications: current.applications.map((item) =>
        item.id === entry.id ? { ...item, status } : item
      ),
    }));
    try {
      const response = await fetch(`/api/admin/applications/${entry.formId}/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error("Could not update that application.");
      setNotice(status === "pending" ? "Reset to pending." : `Application ${status}.`);
      load();
    } catch (err) {
      setData((current) => ({ ...current, applications: previous }));
      setError(err.message);
    } finally {
      setBusyId("");
    }
  }

  async function deleteApplication(entry) {
    const who = entry.memberUsername ? `@${entry.memberUsername}` : "this applicant";
    if (!confirm(`Delete the application from ${who}? They will be able to apply again.`)) return;
    setBusyId(entry.id);
    try {
      const response = await fetch(`/api/admin/applications/${entry.formId}/${entry.id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Could not delete that application.");
      setData((current) => ({
        ...current,
        applications: current.applications.filter((item) => item.id !== entry.id),
      }));
      setNotice("Application deleted.");
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId("");
    }
  }

  async function deleteAllApplications() {
    const question = `Delete all ${counts.total} applications? Every form is cleared and everyone can apply again. Contact messages are kept.`;
    if (!confirm(question)) return;
    setClearing(true);
    try {
      const response = await fetch("/api/admin/submissions", { method: "DELETE" });
      if (!response.ok) throw new Error("Could not clear the submissions.");
      setData((current) => ({ ...current, applications: [] }));
      setNotice("All applications deleted.");
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setClearing(false);
    }
  }

  async function deleteMessage(entry) {
    const who = entry.memberUsername ? `@${entry.memberUsername}` : entry.name || "this sender";
    if (!confirm(`Delete the message from ${who}? This can't be undone.`)) return;
    setBusyId(entry.id);
    try {
      const response = await fetch(`/api/admin/messages/${entry.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Could not delete that message.");
      setData((current) => ({
        ...current,
        join: current.join.filter((item) => item.id !== entry.id),
      }));
      setNotice("Message deleted.");
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId("");
    }
  }

  async function changeAccountPassword(account, password) {
    try {
      const response = await fetch(`/api/admin/accounts/${encodeURIComponent(account.username)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Could not change that password.");
      setError("");
      setNotice(`Password updated for @${account.username} — their old sessions are signed out.`);
      load();
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  }

  async function deleteAccount(account) {
    const question = `Delete the account @${account.username}? They lose access immediately. Their applications and messages stay on file.`;
    if (!confirm(question)) return;
    try {
      const response = await fetch(`/api/admin/accounts/${encodeURIComponent(account.username)}`, {
        method: "DELETE",
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Could not delete that account.");
      setError("");
      setData((current) => ({
        ...current,
        accounts: current.accounts.filter((item) => item.username !== account.username),
      }));
      setNotice(`@${account.username} deleted.`);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function createAccount(event) {
    event.preventDefault();
    if (creatingAccount) return;
    setCreatingAccount(true);
    try {
      const response = await fetch("/api/admin/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAccount),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Could not create that account.");
      setError("");
      setNotice(
        `Account @${result.member?.username || newAccount.username} created — give them the password you set.`
      );
      setNewAccount({ username: "", name: "", password: "" });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreatingAccount(false);
    }
  }

  async function createForm() {
    setCreating(true);
    try {
      const response = await fetch("/api/form-builder/forms", { method: "POST" });
      if (!response.ok) throw new Error("Could not create a form.");
      const { id } = await response.json();
      router.push(`/form-builder/${id}`);
    } catch (err) {
      setError(err.message);
      setCreating(false);
    }
  }

  async function deleteForm(id) {
    if (!confirm("Delete this form? Past submissions are kept, but the form itself can't be recovered.")) return;
    const response = await fetch(`/api/form-builder/forms/${id}`, { method: "DELETE" });
    if (response.ok) {
      setNotice("Form deleted.");
      load();
    } else {
      setError("Could not delete that form.");
    }
  }

  async function copyLink(id) {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/form-builder/apply/${id}`);
      setCopied(id);
      setTimeout(() => setCopied(""), 2000);
    } catch {
      setNotice("Copy failed — select the link manually.");
    }
  }

  return (
    <div className="page">
      <div className="shell admin-shell">
        <header className="admin-header">
          <div>
            <p className="kicker">Admin console</p>
            <h1 className="display-lg mt-2">Submissions</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge badge-neutral">
              <span className="live-dot" data-stale={!live} aria-hidden="true" />
              {live ? "Live" : "Offline"}
            </span>
            <span className="faint text-xs">
              {lastSync ? `synced ${timeAgo(lastSync.toISOString())}` : "connecting…"}
            </span>
            <button type="button" className="btn btn-secondary btn-sm" onClick={load}>
              Refresh
            </button>
            <Link href="/form-builder" className="btn btn-primary btn-sm">
              Form builder ↗
            </Link>
          </div>
        </header>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="glass-inset icon-button" aria-hidden="true">⚿</span>
            <div className="text-sm">
              <p className="font-semibold leading-tight">{currentUser?.username || "Admin"}</p>
              <p className="faint text-xs">Password session · 12h</p>
            </div>
          </div>
          <a href="/api/auth/logout" className="btn btn-secondary btn-sm">
            Lock console
          </a>
        </div>

        <div className="stat-grid">
          <Stat label="Pending review" value={counts.pending} accent="var(--warning)" />
          <Stat label="Accepted" value={counts.accepted} accent="var(--success)" />
          <Stat label="Rejected" value={counts.denied} accent="var(--danger)" />
          <Stat label="Messages" value={counts.messages} />
          <Stat label="Forms" value={data.forms.length} />
          <Stat label="Accounts" value={data.accounts.length} />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="tabbar" role="tablist">
            {[
              { id: "applications", label: "Applications", count: counts.total },
              { id: "messages", label: "Messages", count: counts.messages },
              { id: "forms", label: "Forms", count: data.forms.length },
              { id: "accounts", label: "Accounts", count: data.accounts.length },
            ].map((item) => (
              <button
                key={item.id}
                role="tab"
                aria-selected={tab === item.id}
                className="tab"
                data-active={tab === item.id}
                onClick={() => setTab(item.id)}
              >
                {item.label}
                <span className="tab-count">{item.count}</span>
              </button>
            ))}
          </div>

          {tab !== "forms" && tab !== "accounts" && (
            <input
              className="input"
              style={{ maxWidth: "16rem" }}
              placeholder={tab === "messages" ? "Search messages…" : "Search answers…"}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          )}
        </div>

        {error && <p className="badge badge-denied">{error}</p>}
        {notice && <p className="badge badge-accepted">{notice}</p>}

        {tab === "applications" && (
          <>
            <div className="flex flex-wrap gap-2">
              {[
                { id: "pending", label: "Pending", count: counts.pending },
                { id: "accepted", label: "Accepted", count: counts.accepted },
                { id: "denied", label: "Rejected", count: counts.denied },
                { id: "all", label: "All", count: counts.total },
              ].map((chip) => (
                <button
                  key={chip.id}
                  className="chip"
                  data-active={filter === chip.id}
                  onClick={() => setFilter(chip.id)}
                >
                  {chip.label} <span className="opacity-60">{chip.count}</span>
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="faint text-xs">
                Deleting a submission also lets that person apply again.
              </p>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ color: "var(--danger)" }}
                onClick={deleteAllApplications}
                disabled={clearing || counts.total === 0}
              >
                {clearing ? "Deleting…" : "Delete all submissions"}
              </button>
            </div>

            {loading ? (
              <div className="glass-card p-8 muted">Loading submissions…</div>
            ) : filteredApplications.length === 0 ? (
              <div className="empty-state">
                <p className="font-display font-bold">Nothing here</p>
                <p className="muted text-sm max-w-md">
                  {filter === "pending"
                    ? "No applications waiting for review. New submissions appear here automatically."
                    : "No applications match this view."}
                </p>
              </div>
            ) : (
              <div className="grid gap-3">
                {filteredApplications.map((entry) => (
                  <ApplicationCard
                    key={entry.id}
                    entry={entry}
                    busy={busyId === entry.id}
                    onStatus={updateStatus}
                    onDelete={deleteApplication}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {tab === "messages" && (
          <div className="grid gap-3">
            {filteredMessages.length === 0 && (
              <div className="empty-state">
                <p className="font-display font-bold">No messages yet</p>
                <p className="muted text-sm">Messages from the contact form land here.</p>
              </div>
            )}
            {filteredMessages.map((entry) => (
              <article key={entry.id} className="glass-card application-card">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display font-bold">{entry.name}</h3>
                    <span className="badge badge-neutral">{entry.role}</span>
                    {entry.memberUsername && (
                      <span className="badge badge-neutral">@{entry.memberUsername}</span>
                    )}
                  </div>
                  <span className="faint text-xs">{formatDateTime(entry.createdAt)}</span>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ color: "var(--danger)" }}
                    disabled={busyId === entry.id}
                    onClick={() => deleteMessage(entry)}
                  >
                    Delete
                  </button>
                </div>
                <a href={`mailto:${entry.email}`} className="text-xs font-semibold mt-1 inline-block" style={{ color: "var(--primary)" }}>
                  {entry.email}
                </a>
                <p className="text-sm mt-3 whitespace-pre-wrap">{entry.message}</p>
              </article>
            ))}
          </div>
        )}

        {tab === "accounts" && (
          <div className="grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="muted text-sm max-w-xl">
                Everyone who can log in to the site. Setting a new password signs them out on every
                device; deleting an account leaves their past applications and messages in place.
              </p>
              <button type="button" className="btn btn-secondary btn-sm" onClick={load}>
                Refresh
              </button>
            </div>

            <form onSubmit={createAccount} className="glass-card application-card">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-display font-bold">Create an account</h3>
                <span className="badge badge-neutral">Admin only</span>
              </div>
              <p className="faint text-xs mt-1 leading-relaxed">
                People who sign themselves up get one account per internet connection. Accounts made
                here skip that limit, so you can set up a household or a second account by hand.
              </p>
              <div className="flex flex-wrap items-end gap-2 mt-3">
                <label className="field flex-1" style={{ minWidth: "10rem" }}>
                  <span className="field-label">Username</span>
                  <input
                    className="input"
                    value={newAccount.username}
                    onChange={(event) =>
                      setNewAccount((current) => ({ ...current, username: event.target.value }))
                    }
                    autoCapitalize="none"
                    spellCheck={false}
                    placeholder="3–24 letters, numbers, . _ -"
                    required
                  />
                </label>
                <label className="field flex-1" style={{ minWidth: "10rem" }}>
                  <span className="field-label">Display name (optional)</span>
                  <input
                    className="input"
                    value={newAccount.name}
                    onChange={(event) =>
                      setNewAccount((current) => ({ ...current, name: event.target.value }))
                    }
                    placeholder="How their name shows up"
                  />
                </label>
                <label className="field flex-1" style={{ minWidth: "10rem" }}>
                  <span className="field-label">Password</span>
                  <input
                    className="input"
                    type="password"
                    value={newAccount.password}
                    onChange={(event) =>
                      setNewAccount((current) => ({ ...current, password: event.target.value }))
                    }
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                    required
                  />
                </label>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={
                    creatingAccount || newAccount.username.trim().length < 3 || newAccount.password.length < 8
                  }
                >
                  {creatingAccount ? "Creating…" : "Create account"}
                </button>
              </div>
            </form>

            {data.accounts.length === 0 ? (
              <div className="empty-state">
                <p className="font-display font-bold">No accounts yet</p>
                <p className="muted text-sm max-w-md">
                  Accounts show up here as people register, plus any listed in data/users.json.
                </p>
              </div>
            ) : (
              data.accounts.map((account) => (
                <AccountRow
                  key={account.username}
                  account={account}
                  onDelete={deleteAccount}
                  onPassword={changeAccountPassword}
                />
              ))
            )}
          </div>
        )}

        {tab === "forms" && (
          <div className="grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="muted text-sm">
                Build forms, share the apply link, and review what comes in.
              </p>
              <button type="button" className="btn btn-primary btn-sm" onClick={createForm} disabled={creating}>
                {creating ? "Creating…" : "+ New form"}
              </button>
            </div>

            {data.forms.length === 0 ? (
              <div className="empty-state">
                <p className="font-display font-bold">No forms yet</p>
                <p className="muted text-sm max-w-md">
                  Create a form to start collecting applications. Add sections, questions, and
                  publish it to the positions page.
                </p>
                <button type="button" className="btn btn-primary btn-sm mt-2" onClick={createForm} disabled={creating}>
                  + Create your first form
                </button>
              </div>
            ) : (
              data.forms.map((form) => (
                <article key={form.id} className="glass-card application-card">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <Link href={`/form-builder/${form.id}`} className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display font-bold">{form.title || "Untitled form"}</h3>
                        <span className={`badge ${form.published === false ? "badge-neutral" : "badge-accepted"}`}>
                          {form.published === false ? "Draft" : "Live"}
                        </span>
                      </div>
                      <p className="faint text-xs mt-1">
                        {form.submissions || 0} submissions
                        {form.pending ? ` · ${form.pending} pending` : ""} · updated{" "}
                        {form.updatedAt ? timeAgo(form.updatedAt) : "—"}
                      </p>
                    </Link>
                    <div className="flex flex-wrap items-center gap-2">
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => copyLink(form.id)}>
                        {copied === form.id ? "Copied!" : "Copy link"}
                      </button>
                      <Link href={`/form-builder/${form.id}`} className="btn btn-secondary btn-sm">
                        Edit
                      </Link>
                      <Link href={`/form-builder/apply/${form.id}`} className="btn btn-ghost">
                        View
                      </Link>
                      <button type="button" className="btn btn-ghost" style={{ color: "var(--danger)" }} onClick={() => deleteForm(form.id)}>
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
