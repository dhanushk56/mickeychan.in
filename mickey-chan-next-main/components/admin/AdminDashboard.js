"use client";

import { useEffect, useState } from "react";

function formatValue(value) {
  if (Array.isArray(value)) return value.join(", ") || "—";
  if (value === undefined || value === null || value === "") return "—";
  return String(value);
}

const STATUS_STYLES = {
  pending: "bg-black/10 dark:bg-white/10 text-black/60 dark:text-white/60",
  accepted: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  denied: "bg-red-500/15 text-red-500",
};

const STATUS_LABELS = { pending: "Pending", accepted: "Accepted", denied: "Denied" };

function StatusBadge({ status }) {
  const s = status || "pending";
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLES[s]}`}>
      {STATUS_LABELS[s]}
    </span>
  );
}

function StatusActions({ entry, onUpdate }) {
  const status = entry.status || "pending";
  return (
    <div className="flex items-center gap-2">
      {status !== "accepted" && (
        <button
          onClick={() => onUpdate(entry, "accepted")}
          className="text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25"
        >
          Accept
        </button>
      )}
      {status !== "denied" && (
        <button
          onClick={() => onUpdate(entry, "denied")}
          className="text-xs font-semibold px-3 py-1.5 rounded-full bg-red-500/15 text-red-500 hover:bg-red-500/25"
        >
          Deny
        </button>
      )}
      {status !== "pending" && (
        <button
          onClick={() => onUpdate(entry, "pending")}
          className="text-xs text-black/40 dark:text-white/40 hover:text-[#be185d]"
        >
          Reset
        </button>
      )}
    </div>
  );
}

export default function AdminDashboard({ currentUser }) {
  const [tab, setTab] = useState("join");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [join, setJoin] = useState([]);
  const [applications, setApplications] = useState([]);

  useEffect(() => {
    fetch("/api/admin/submissions", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setJoin(data.join || []);
        setApplications(data.applications || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function updateStatus(entry, status) {
    const previous = applications;
    setApplications((apps) => apps.map((a) => (a.id === entry.id ? { ...a, status } : a)));
    try {
      const response = await fetch(`/api/admin/applications/${entry.formId}/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error("Could not update that application's status.");
    } catch (err) {
      setApplications(previous);
      setError(err.message);
    }
  }

  const filteredApplications = applications.filter(
    (entry) => filter === "all" || (entry.status || "pending") === filter
  );

  return (
    <div className="px-6 md:px-16 py-10 md:py-14">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <p className="section-kicker">Admin</p>
            <h1 className="font-display text-2xl md:text-3xl font-bold mt-1">Submissions</h1>
          </div>
          <div className="flex items-center gap-4">
            <a href="/form-builder" className="text-sm text-[#be185d] font-semibold">
              Open form builder ↗
            </a>
            {currentUser && <span className="text-xs text-black/40 dark:text-white/40">{currentUser.username}</span>}
            <a href="/api/auth/discord/logout" className="text-xs text-black/40 dark:text-white/40 hover:text-[#be185d]">
              Sign out
            </a>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-8 border-b border-black/10 dark:border-white/10">
          {[
            { id: "join", label: `Join us (${join.length})` },
            { id: "applications", label: `Applications (${applications.length})` },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
                tab === t.id ? "border-[#be185d] text-[#be185d]" : "border-transparent text-black/50 dark:text-white/50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading && <p className="text-black/50 dark:text-white/50">Loading…</p>}
        {error && <p className="text-red-500">{error}</p>}

        {!loading && !error && tab === "join" && (
          <div className="grid gap-4">
            {join.length === 0 && <p className="text-black/40 dark:text-white/40">No submissions yet.</p>}
            {join.map((entry) => (
              <div key={entry.id} className="glass-card rounded-2xl p-6">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <p className="font-semibold">{entry.name}</p>
                  <span className="text-xs text-black/40 dark:text-white/40">
                    {new Date(entry.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-black/50 dark:text-white/50 mb-1">{entry.email} · {entry.role}</p>
                <p className="text-sm mt-3 whitespace-pre-wrap">{entry.message}</p>
              </div>
            ))}
          </div>
        )}

        {!loading && !error && tab === "applications" && (
          <div>
            <div className="flex items-center gap-2 mb-6">
              {["all", "pending", "accepted", "denied"].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`text-xs px-3 py-1.5 rounded-full font-semibold capitalize ${
                    filter === f
                      ? "bg-[#be185d] text-white"
                      : "bg-black/5 dark:bg-white/10 text-black/50 dark:text-white/50"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            <div className="grid gap-4">
              {filteredApplications.length === 0 && (
                <p className="text-black/40 dark:text-white/40">No applications in this view.</p>
              )}
              {filteredApplications.map((entry) => (
                <div key={entry.id} className="glass-card rounded-2xl p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <p className="font-semibold">{entry.formTitle || "Application"}</p>
                      <StatusBadge status={entry.status} />
                    </div>
                    <span className="text-xs text-black/40 dark:text-white/40">
                      {new Date(entry.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="grid gap-2 mb-5">
                    {(entry.questions || []).map((q) => (
                      <div key={q.id} className="grid grid-cols-[1fr_2fr] gap-3 text-sm">
                        <span className="text-black/50 dark:text-white/50">{q.title}</span>
                        <span>{formatValue(entry.responses[q.id])}</span>
                      </div>
                    ))}
                    {(!entry.questions || entry.questions.length === 0) && (
                      <p className="text-xs text-black/40 dark:text-white/40">
                        No question data recorded for this submission — raw data:{" "}
                        {JSON.stringify(entry.responses)}
                      </p>
                    )}
                  </div>
                  <StatusActions entry={entry} onUpdate={updateStatus} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
