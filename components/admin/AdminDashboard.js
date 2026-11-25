"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AnnouncementsPanel from "@/components/admin/AnnouncementsPanel";
import PollsPanel from "@/components/admin/PollsPanel";
import EventsPanel from "@/components/admin/EventsPanel";
import IdeasPanel from "@/components/admin/IdeasPanel";
import EnquiriesPanel from "@/components/admin/EnquiriesPanel";
import { AdminsPanel, RolesPanel } from "@/components/admin/AccessPanels";
import { useConfirm, usePrompt } from "@/components/ConfirmDialog";
import ApplicationTimeline from "@/components/applications/ApplicationTimeline";
import { APPLICATION_STATUSES } from "@/lib/applications";

const POLL_MS = 5000;

const STATUS_META = Object.fromEntries(
  APPLICATION_STATUSES.map((entry) => [entry.id, { label: entry.label, className: entry.badge }])
);

// Every review action comes from the same status list, so the buttons, the
// badges and the applicant's timeline can never disagree.
const STAGE_ACTIONS = [
  { id: "shortlist", label: "Shortlist", className: "btn btn-secondary btn-sm" },
  { id: "interview", label: "Interview", className: "btn btn-secondary btn-sm" },
  { id: "accepted", label: "✓ Accept", className: "btn btn-success btn-sm" },
  { id: "denied", label: "✕ Reject", className: "btn btn-danger btn-sm" },
];

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

function ApplicationCard({ entry, busy, onStatus, onDelete, canReview, canDelete }) {
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
          {canReview &&
            STAGE_ACTIONS.filter((action) => action.id !== entry.status).map((action) => (
              <button
                key={action.id}
                type="button"
                className={action.className}
                disabled={busy}
                onClick={() => onStatus(entry, action.id)}
              >
                {action.label}
              </button>
            ))}
          {canReview && entry.status !== "pending" && (
            <button
              type="button"
              className="btn btn-ghost"
              disabled={busy}
              onClick={() => onStatus(entry, "pending")}
            >
              Undo
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              className="btn btn-ghost"
              style={{ color: "var(--danger)" }}
              disabled={busy}
              onClick={() => onDelete(entry)}
            >
              Delete
            </button>
          )}
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

      {entry.reviewNote && (
        <p className="muted text-sm mt-2 whitespace-pre-wrap">“{entry.reviewNote}”</p>
      )}

      {Array.isArray(entry.events) && entry.events.length > 0 && (
        <div className="grid gap-1 mt-3">
          <p className="field-label">History</p>
          <ApplicationTimeline submission={entry} />
        </div>
      )}

      {entry.reviewedAt && (
        <p className="faint text-xs mt-2">
          Reviewed by {entry.reviewedBy || "an admin"} · {timeAgo(entry.reviewedAt)}
        </p>
      )}
    </article>
  );
}

function AccountRow({
  account,
  onDelete,
  onEdit,
  onBlacklist,
  adminEntry,
  roles,
  canManageAdmins,
  canBlock,
  canDelete,
  canEdit,
  onRoleChange,
}) {
  const [details, setDetails] = useState(null);
  const [savingDetails, setSavingDetails] = useState(false);
  const verified = account.emailVerified === true;
  const methodLabel =
    account.provider === "google"
      ? "Google"
      : account.provider === "discord"
        ? "Discord"
        : "Password";
  const connections = Array.isArray(account.ips) ? account.ips : [];
  const emailBadge = !account.email
    ? { label: "No email", className: "badge-neutral" }
    : verified
      ? { label: "Email verified", className: "badge-accepted" }
      : { label: "Email unverified", className: "badge-pending" };

  function openDetails() {
    setDetails({
      name: account.name || "",
      username: account.username || "",
      email: account.email || "",
      phone: account.phone || "",
      password: "",
      emailVerified: account.emailVerified === true,
    });
  }

  async function saveDetails(event) {
    event.preventDefault();
    if (!details) return;
    setSavingDetails(true);
    const patch = {
      name: details.name,
      username: details.username,
      email: details.email,
      phone: details.phone,
      emailVerified: details.emailVerified,
    };
    if (details.password) patch.password = details.password;
    const ok = await onEdit(account, patch);
    setSavingDetails(false);
    if (ok) setDetails(null);
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
            <span className={`badge ${emailBadge.className}`}>{emailBadge.label}</span>
            <span className="badge badge-neutral">
              {account.createdBy === "admin" ? `${methodLabel} · added by admin` : methodLabel}
            </span>
            {account.formBlocked && <span className="badge badge-denied">Forms blocked</span>}
            {adminEntry && (
              <span className={`badge ${adminEntry.owner ? "badge-accepted" : "badge-pending"}`}>
                {adminEntry.owner ? "Super owner" : `Console · ${adminEntry.roleName}`}
              </span>
            )}
          </div>
          <p className="faint text-xs mt-1 break-words">
            {account.email || "No email address on file"}
          </p>
          <p className="faint text-xs mt-1 break-words">
            {connections.length > 0
              ? `Connection ${connections[0]}${connections.length > 1 ? ` +${connections.length - 1} more` : ""}${account.location?.city ? ` · ${account.location.city}` : ""}${account.location?.country ? `, ${account.location.country}` : ""}`
              : "No connection recorded"}
          </p>
          {account.formBlocked && (
            <p className="faint text-xs mt-1">
              Can&apos;t submit any form or the join us message
              {account.blacklistReason ? ` · ${account.blacklistReason}` : ""}
            </p>
          )}
          <p className="faint text-xs mt-1">
            {account.createdAt ? `Joined ${formatDateTime(account.createdAt)}` : "Listed in data/users.json"}
            {account.updatedAt ? ` · password set ${formatDateTime(account.updatedAt)}` : ""}
          </p>
        </div>
        <div className="flex w-full shrink-0 flex-col gap-3 sm:w-44">
          <div className="flex flex-col gap-1.5">
            {canManageAdmins && (
              <select
                className="select"
                style={{ width: "100%", fontSize: ".78rem", padding: ".45rem .7rem" }}
                value={adminEntry ? (adminEntry.owner ? "owner" : adminEntry.roleId) : ""}
                disabled={adminEntry?.root || adminEntry?.manageable === false}
                onChange={(event) => onRoleChange(account, event.target.value)}
              >
                <option value="">No console access</option>
                {adminEntry?.owner && <option value="owner">Super owner</option>}
                {roles
                  .filter((role) => !(adminEntry?.owner && role.id === "owner"))
                  .map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
              </select>
            )}
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={!canEdit}
              onClick={openDetails}
            >
              Edit details
            </button>
          </div>
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={account.formBlocked ? undefined : { color: "var(--danger)" }}
              disabled={!canBlock}
              onClick={() => onBlacklist(account)}
            >
              {account.formBlocked ? "Allow forms" : "Block forms"}
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ color: "var(--danger)" }}
              disabled={!canDelete}
              onClick={() => onDelete(account)}
            >
              Delete account
            </button>
          </div>
        </div>
      </div>

      {details && (
        <form onSubmit={saveDetails} className="grid gap-3 mt-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="field">
              <span className="field-label">Display name</span>
              <input
                className="input"
                value={details.name}
                maxLength={60}
                onChange={(event) => setDetails({ ...details, name: event.target.value })}
              />
            </label>
            <label className="field">
              <span className="field-label">Username</span>
              <input
                className="input"
                value={details.username}
                maxLength={24}
                autoCapitalize="none"
                spellCheck={false}
                onChange={(event) => setDetails({ ...details, username: event.target.value })}
              />
            </label>
            <label className="field">
              <span className="field-label">Email</span>
              <input
                className="input"
                type="email"
                value={details.email}
                autoCapitalize="none"
                spellCheck={false}
                onChange={(event) => setDetails({ ...details, email: event.target.value })}
              />
            </label>
            <label className="field">
              <span className="field-label">Phone (optional)</span>
              <input
                className="input"
                value={details.phone}
                inputMode="tel"
                maxLength={24}
                onChange={(event) => setDetails({ ...details, phone: event.target.value })}
              />
            </label>
            <label className="field">
              <span className="field-label">New password (optional)</span>
              <input
                className="input"
                type="password"
                value={details.password}
                autoComplete="new-password"
                placeholder="Leave blank to keep it"
                onChange={(event) => setDetails({ ...details, password: event.target.value })}
              />
            </label>
            <label className="field">
              <span className="field-label">Email status</span>
              <span className="flex items-center gap-2" style={{ minHeight: "2.5rem" }}>
                <input
                  type="checkbox"
                  checked={details.emailVerified}
                  onChange={(event) =>
                    setDetails({ ...details, emailVerified: event.target.checked })
                  }
                />
                <span className="muted text-sm">Mark this email as confirmed</span>
              </span>
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="submit" className="btn btn-primary btn-sm" disabled={savingDetails}>
              {savingDetails ? "Saving…" : "Save changes"}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDetails(null)}>
              Cancel
            </button>
            <span className="faint text-xs">
              Admin edits skip the member&apos;s six-month lock.
            </span>
          </div>
        </form>
      )}
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
  const [newAccount, setNewAccount] = useState({
    username: "",
    name: "",
    email: "",
    phone: "",
    password: "",
  });
  const [creatingAccount, setCreatingAccount] = useState(false);
  const mounted = useRef(true);
  const [dialog, askConfirm] = useConfirm();
  const [promptDialog, askPrompt] = usePrompt();
  const [adminState, setAdminState] = useState({ admins: [], roles: [] });

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

  const loadAdmins = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/admins", { cache: "no-store" });
      if (!response.ok) return;
      const next = await response.json();
      if (!mounted.current) return;
      setAdminState({
        admins: Array.isArray(next.admins) ? next.admins : [],
        roles: Array.isArray(next.roles) ? next.roles : [],
      });
    } catch {
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    load();
    loadAdmins();
    return () => {
      mounted.current = false;
    };
  }, [load, loadAdmins]);

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
      shortlist: applications.filter((a) => a.status === "shortlist").length,
      interview: applications.filter((a) => a.status === "interview").length,
      accepted: applications.filter((a) => a.status === "accepted").length,
      denied: applications.filter((a) => a.status === "denied").length,
      messages: data.join.length,
    };
  }, [data]);

  const can = useCallback(
    (permission) => {
      if (currentUser?.owner === true) return true;
      const list = Array.isArray(currentUser?.permissions) ? currentUser.permissions : [];
      return list.includes("*") || list.includes(permission);
    },
    [currentUser]
  );

  const adminByUsername = useMemo(() => {
    const map = new Map();
    for (const entry of adminState.admins) map.set(String(entry.username).toLowerCase(), entry);
    return map;
  }, [adminState.admins]);

  const canManageAdmins = can("admins.manage");

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
    let note = "";
    if (status !== "pending") {
      const meta = STATUS_META[status] ? status : "pending";
      const answer = await askPrompt({
        title: `Move this application to ${STATUS_META[meta].label.toLowerCase()}?`,
        description: `The note is optional and is shown to @${entry.memberUsername || "the applicant"}, and is kept in the application history.`,
        label: "Note (optional)",
        placeholder: "e.g. shortlisted for a call next week",
        confirmLabel: STATUS_META[meta].label,
        tone: status === "denied" ? "danger" : "default",
        maxLength: 500,
        multiline: true,
      });
      if (answer === null) return;
      note = answer;
    }

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
        body: JSON.stringify({ status, note }),
      });
      if (!response.ok) throw new Error("Could not update that application.");
      setNotice(
        status === "pending"
          ? "Reset to pending."
          : `Application moved to ${STATUS_META[status].label.toLowerCase()}.`
      );
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
    const ok = await askConfirm({
      title: "Delete this application?",
      description: `The application from ${who} will be removed, and they can apply again.`,
      confirmLabel: "Delete application",
    });
    if (!ok) return;
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
    const ok = await askConfirm({
      title: "Delete every application?",
      description: `All ${counts.total} applications will be removed. Every form is cleared, everyone can apply again, and contact messages are kept.`,
      confirmLabel: "Delete all",
    });
    if (!ok) return;
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
    const ok = await askConfirm({
      title: "Delete this message?",
      description: `The message from ${who} will be permanently removed.`,
      confirmLabel: "Delete message",
    });
    if (!ok) return;
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

  async function editAccountDetails(account, patch) {
    try {
      const response = await fetch(`/api/admin/accounts/${encodeURIComponent(account.username)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Could not update that account.");
      setError("");
      setNotice(
        result.renamed
          ? `Saved — @${account.username} is now @${result.member?.username}.`
          : `Saved the details for @${result.member?.username || account.username}.`
      );
      load();
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  }

  async function deleteAccount(account) {
    const ok = await askConfirm({
      title: "Delete this account?",
      description: `@${account.username} loses access immediately. Their applications and messages stay on file.`,
      confirmLabel: "Delete account",
    });
    if (!ok) return;
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

  async function toggleBlacklist(account) {
    const blocked = account.formBlocked === true;
    let reason = "";

    if (blocked) {
      const ok = await askConfirm({
        title: "Let this account submit forms again?",
        description: `@${account.username} will be able to apply to open positions and send join us messages again.`,
        confirmLabel: "Allow forms",
      });
      if (!ok) return;
    } else {
      const answer = await askPrompt({
        title: "Block this account from forms?",
        description: `@${account.username} won't be able to submit anything — every form, new or existing, and the join us message — until you unblock them.`,
        label: "Reason (optional)",
        placeholder: "e.g. spamming applications",
        confirmLabel: "Block forms",
        tone: "danger",
        maxLength: 300,
      });
      if (answer === null) return;
      reason = answer;
    }
    try {
      const response = blocked
        ? await fetch(`/api/admin/blacklist?username=${encodeURIComponent(account.username)}`, {
            method: "DELETE",
          })
        : await fetch("/api/admin/blacklist", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: account.username, reason }),
          });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Could not update that account.");
      setError("");
      setNotice(
        blocked
          ? `@${account.username} can submit forms again.`
          : `@${account.username} is blocked from submitting forms.`
      );
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
      setNewAccount({ username: "", name: "", email: "", phone: "", password: "" });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreatingAccount(false);
    }
  }

  async function changeAdminRole(account, roleId) {
    const username = account.username;
    try {
      const response = roleId
        ? await fetch("/api/admin/admins", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, roleId }),
          })
        : await fetch(`/api/admin/admins?username=${encodeURIComponent(username)}`, {
            method: "DELETE",
          });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Could not change that access.");
      const roleName =
        roleId === "owner"
          ? "Super owner"
          : adminState.roles.find((role) => role.id === roleId)?.name;
      setError("");
      setNotice(
        roleId
          ? `@${username} can open the console as ${roleName || roleId}.`
          : `@${username} no longer has console access.`
      );
      setAdminState((current) => ({ ...current, admins: result.admins || current.admins }));
      loadAdmins();
    } catch (err) {
      setError(err.message);
    }
  }

  function refreshAll() {
    load();
    loadAdmins();
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
    const ok = await askConfirm({
      title: "Delete this form?",
      description: "Past submissions are kept, but the form itself can't be recovered.",
      confirmLabel: "Delete form",
    });
    if (!ok) return;
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
            <button type="button" className="btn btn-secondary btn-sm" onClick={refreshAll}>
              Refresh
            </button>
            <Link href="/audit" className="btn btn-secondary btn-sm">
              Audit log ↗
            </Link>
            <Link href="/sitemap" className="btn btn-secondary btn-sm">
              Sitemap ↗
            </Link>
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
              <p className="faint text-xs">
                {currentUser?.owner
                  ? "Super owner · full access"
                  : `${currentUser?.roleName || "Admin"} · 12h session`}
              </p>
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
              { id: "applications", label: "Applications", count: counts.total, show: can("applications.view") },
              { id: "messages", label: "Messages", count: counts.messages, show: can("messages.view") },
              { id: "enquiries", label: "Enquiries", show: can("enquiries.view") || can("messages.view") },
              { id: "forms", label: "Forms", count: data.forms.length, show: can("forms.view") },
              { id: "accounts", label: "Accounts", count: data.accounts.length, show: can("accounts.view") },
              { id: "announcements", label: "Announcements", show: can("announcements.view") },
              { id: "polls", label: "Polls", show: can("announcements.view") },
              { id: "events", label: "Events", show: can("announcements.view") },
              { id: "ideas", label: "Ideas", show: can("announcements.view") },
              { id: "admins", label: "Admins", count: adminState.admins.length, show: can("admins.view") },
              { id: "roles", label: "Roles", show: can("roles.view") },
            ]
              .filter((item) => item.show)
              .map((item) => (
              <button
                key={item.id}
                role="tab"
                aria-selected={tab === item.id}
                className="tab"
                data-active={tab === item.id}
                onClick={() => setTab(item.id)}
              >
                {item.label}
                {typeof item.count === "number" && <span className="tab-count">{item.count}</span>}
              </button>
            ))}
          </div>

          {["applications", "messages"].includes(tab) && (
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
                { id: "shortlist", label: "Shortlisted", count: counts.shortlist },
                { id: "interview", label: "Interview", count: counts.interview },
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
                    canReview={can("applications.review")}
                    canDelete={can("applications.delete")}
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
                <label className="field flex-1" style={{ minWidth: "10rem" }}>
                  <span className="field-label">Email (optional)</span>
                  <input
                    className="input"
                    type="email"
                    value={newAccount.email}
                    onChange={(event) =>
                      setNewAccount((current) => ({ ...current, email: event.target.value }))
                    }
                    autoCapitalize="none"
                    spellCheck={false}
                    placeholder="them@example.com"
                  />
                </label>
                <label className="field flex-1" style={{ minWidth: "10rem" }}>
                  <span className="field-label">Phone (optional)</span>
                  <input
                    className="input"
                    value={newAccount.phone}
                    inputMode="tel"
                    maxLength={24}
                    onChange={(event) =>
                      setNewAccount((current) => ({ ...current, phone: event.target.value }))
                    }
                    placeholder="+91 98765 43210"
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
                  onBlacklist={toggleBlacklist}
                  adminEntry={adminByUsername.get(String(account.username).toLowerCase())}
                  roles={adminState.roles}
                  canManageAdmins={canManageAdmins}
                  canBlock={can("accounts.block")}
                  canDelete={can("accounts.delete")}
                  canEdit={can("accounts.password")}
                  onEdit={editAccountDetails}
                  onRoleChange={changeAdminRole}
                />
              ))
            )}
          </div>
        )}

        {tab === "enquiries" && (
          <EnquiriesPanel
            canManage={can("enquiries.manage") || can("messages.delete")}
            canDelete={can("enquiries.delete") || can("messages.delete")}
          />
        )}

        {tab === "announcements" && <AnnouncementsPanel />}

        {tab === "polls" && (
          <PollsPanel canCreate={can("announcements.create")} canDelete={can("announcements.delete")} />
        )}

        {tab === "events" && (
          <EventsPanel canCreate={can("announcements.create")} canDelete={can("announcements.delete")} />
        )}

        {tab === "ideas" && (
          <IdeasPanel canEdit={can("announcements.create")} canDelete={can("announcements.delete")} />
        )}

        {tab === "admins" && <AdminsPanel canManage={canManageAdmins} />}

        {tab === "roles" && (
          <RolesPanel canManage={can("roles.manage")} canManageAdmins={canManageAdmins} />
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
      {dialog}
      {promptDialog}
    </div>
  );
}
