"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const ACTION_LABEL = {
  login: "Sign-in",
  "login-failed": "Failed sign-in",
  "login-denied": "Blocked username",
  logout: "Log out",
  register: "New account",
  "signup-blocked": "Blocked signup",
  "email-verified": "Email confirmed",
  "verify-code-sent": "Confirmation code sent",
  application: "Application",
  message: "Join us message",
  "account-created": "Account created",
  "account-password": "Password changed",
  "account-deleted": "Account deleted",
  "application-status": "Review",
  "application-deleted": "Application deleted",
  "applications-cleared": "All applications deleted",
  "message-deleted": "Message deleted",
  content: "Site content",
  "form-created": "Form created",
  "form-saved": "Form edited",
  "form-deleted": "Form deleted",
  announcement: "Announcement posted",
  "announcement-deleted": "Announcement deleted",
  "admin-granted": "Console access granted",
  "admin-role": "Console role changed",
  "admin-revoked": "Console access removed",
  "role-created": "Role created",
  "role-edited": "Role edited",
  "role-deleted": "Role deleted",
};

const LOGIN_ACTIONS = [
  "login",
  "login-failed",
  "login-denied",
  "logout",
  "register",
  "signup-blocked",
  "email-verified",
  "verify-code-sent",
];

const SCOPE_OPTIONS = [
  { id: "all", label: "Everything" },
  { id: "login", label: "Sign-ins and accounts" },
  { id: "admin", label: "Admin console" },
  { id: "website", label: "Website" },
];

const OUTCOME_OPTIONS = [
  { id: "all", label: "Any result" },
  { id: "ok", label: "Successful only" },
  { id: "failed", label: "Failed only" },
];

const RANGE_OPTIONS = [
  { id: "all", label: "Any time", ms: null },
  { id: "hour", label: "Last hour", ms: 60 * 60 * 1000 },
  { id: "day", label: "Last 24 hours", ms: 24 * 60 * 60 * 1000 },
  { id: "week", label: "Last 7 days", ms: 7 * 24 * 60 * 60 * 1000 },
  { id: "month", label: "Last 30 days", ms: 30 * 24 * 60 * 60 * 1000 },
];

function countBy(entries, key) {
  const counts = new Map();
  for (const entry of entries) counts.set(entry[key], (counts.get(entry[key]) || 0) + 1);
  return counts;
}

function timeAgo(iso) {
  if (!iso) return "-";
  const diff = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diff)) return "-";
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
  if (!iso) return "-";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
    hour12: true,
  });
}

export default function AuditLog({ currentUser }) {
  const router = useRouter();
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState("all");
  const [action, setAction] = useState("all");
  const [who, setWho] = useState("all");
  const [outcome, setOutcome] = useState("all");
  const [range, setRange] = useState("all");
  const [syncedAt, setSyncedAt] = useState(null);
  const mounted = useRef(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/activity?limit=1000", { cache: "no-store" });
      if (response.status === 401) {
        router.push("/admin");
        return;
      }
      if (!response.ok) throw new Error("Could not load the activity log.");
      const next = await response.json();
      if (!mounted.current) return;
      setActivity(Array.isArray(next.entries) ? next.entries : []);
      setSyncedAt(new Date());
      setError("");
    } catch (err) {
      if (mounted.current) setError(err.message);
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

  const actionOptions = useMemo(() => {
    const counts = countBy(activity, "action");
    return Array.from(counts.entries())
      .map(([id, count]) => ({ id, count, label: ACTION_LABEL[id] || id }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [activity]);

  const accountOptions = useMemo(() => {
    const counts = countBy(activity, "username");
    return Array.from(counts.entries())
      .map(([id, count]) => ({ id, count }))
      .sort((a, b) => a.id.localeCompare(b.id));
  }, [activity]);

  const rangeMs = RANGE_OPTIONS.find((option) => option.id === range)?.ms ?? null;
  const now = Date.now();

  const filtered = activity.filter((entry) => {
    if (scope === "admin" && entry.area !== "admin") return false;
    if (scope === "website" && entry.area !== "website") return false;
    if (scope === "login" && !LOGIN_ACTIONS.includes(entry.action)) return false;
    if (action !== "all" && entry.action !== action) return false;
    if (who !== "all" && entry.username !== who) return false;
    if (outcome === "ok" && !entry.ok) return false;
    if (outcome === "failed" && entry.ok) return false;
    if (rangeMs != null && now - entry.at > rangeMs) return false;
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return [entry.username, entry.detail, entry.action, entry.ip, entry.city, entry.country]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(term);
  });

  const filtersActive =
    scope !== "all" ||
    action !== "all" ||
    who !== "all" ||
    outcome !== "all" ||
    range !== "all" ||
    search.trim().length > 0;

  const clearFilters = () => {
    setScope("all");
    setAction("all");
    setWho("all");
    setOutcome("all");
    setRange("all");
    setSearch("");
  };

  return (
    <div className="page">
      <div className="shell admin-shell">
        <header className="admin-header">
          <div>
            <p className="kicker">Admin console</p>
            <h1 className="display-lg mt-2">Audit log</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge badge-neutral">{activity.length} events</span>
            <span className="faint text-xs">
              {syncedAt ? `synced ${timeAgo(syncedAt.toISOString())}` : "loading…"}
            </span>
            <button type="button" className="btn btn-secondary btn-sm" onClick={load} disabled={loading}>
              {loading ? "Loading…" : "Refresh"}
            </button>
            <Link href="/admin" className="btn btn-primary btn-sm">
              Back to console ↗
            </Link>
          </div>
        </header>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="glass-inset icon-button" aria-hidden="true">
              ⚿
            </span>
            <div className="text-sm">
              <p className="font-semibold leading-tight">{currentUser?.username || "Admin"}</p>
              <p className="faint text-xs">Read-only · newest first</p>
            </div>
          </div>
          <a href="/api/auth/logout" className="btn btn-secondary btn-sm">
            Lock console
          </a>
        </div>

        <div className="glass-card application-card">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display font-bold">Every recorded action</h2>
            <span className="badge badge-neutral">
              {filtered.length === activity.length
                ? `${activity.length} shown`
                : `${filtered.length} of ${activity.length}`}
            </span>
          </div>
          <p className="faint text-xs mt-1 leading-relaxed">
            Every sign-in (admin or site account) and every action taken here or on the site,
            newest first. Times use your own local clock. The log is append-only: there are no
            controls to edit or delete entries, by design.
          </p>
          <div className="grid gap-2 mt-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="field">
              <span className="field-label">Show</span>
              <select className="select" value={scope} onChange={(event) => setScope(event.target.value)}>
                {SCOPE_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span className="field-label">Action</span>
              <select className="select" value={action} onChange={(event) => setAction(event.target.value)}>
                <option value="all">All actions</option>
                {actionOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label} ({option.count})
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span className="field-label">Account</span>
              <select className="select" value={who} onChange={(event) => setWho(event.target.value)}>
                <option value="all">Anyone</option>
                {accountOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    @{option.id} ({option.count})
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span className="field-label">Result</span>
              <select
                className="select"
                value={outcome}
                onChange={(event) => setOutcome(event.target.value)}
              >
                {OUTCOME_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span className="field-label">When</span>
              <select className="select" value={range} onChange={(event) => setRange(event.target.value)}>
                {RANGE_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span className="field-label">Search</span>
              <input
                className="input"
                placeholder="Names, actions, addresses…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-3">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={clearFilters}
              disabled={!filtersActive}
            >
              Clear filters
            </button>
            <span className="faint text-xs">
              {filtersActive
                ? `${filtered.length} of ${activity.length} match`
                : "No filters applied, every recorded action is listed"}
            </span>
          </div>
        </div>

        {error && <p className="badge badge-denied">{error}</p>}

        {loading && activity.length === 0 ? (
          <div className="glass-card p-8 muted">Loading activity…</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <p className="font-display font-bold">
              {activity.length === 0 ? "Nothing recorded yet" : "Nothing matches that filter"}
            </p>
            <p className="muted text-sm max-w-md">
              {activity.length === 0
                ? "Sign-ins, submissions and admin actions appear here as they happen."
                : "Try a different filter or clear the search."}
            </p>
          </div>
        ) : (
          <div className="grid gap-2">
            {filtered.map((entry) => (
              <article key={entry.id} className="glass-card application-card">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2 min-w-0">
                    <span
                      className={`badge ${entry.area === "admin" ? "badge-pending" : "badge-neutral"}`}
                    >
                      {entry.area === "admin" ? "Admin console" : "Website"}
                    </span>
                    <span className="badge badge-neutral">@{entry.username}</span>
                    <span className="faint text-xs">
                      {ACTION_LABEL[entry.action] || entry.action}
                    </span>
                    {!entry.ok && <span className="badge badge-denied">Failed</span>}
                  </div>
                  <span className="faint text-xs">
                    {formatDateTime(new Date(entry.at).toISOString())}
                  </span>
                </div>
                <p className="text-sm mt-2 whitespace-pre-wrap break-words">{entry.detail || "-"}</p>
                {(entry.ip || entry.city || entry.country) && (
                  <p className="faint text-xs mt-1">
                    {[entry.ip, entry.city, entry.country, entry.timezone].filter(Boolean).join(" · ")}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
