"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useConfirm } from "@/components/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import EmptyState from "@/components/ui/EmptyState";
import LocalTime from "@/components/LocalTime";
import { reasonLabel } from "@/lib/report-meta";

export default function ReportsPanel() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [dialog, askConfirm] = useConfirm();
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/reports", { cache: "no-store" });
      if (response.status === 401 || response.status === 403) {
        setError("Your session or role no longer covers the reports.");
        return;
      }
      if (!response.ok) throw new Error("Could not load reports.");
      const data = await response.json();
      setReports(Array.isArray(data.reports) ? data.reports : []);
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

  async function mark(report, status) {
    setBusyId(report.id);
    try {
      const response = await fetch("/api/admin/reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: report.id, status }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not update the report.");
      setReports((current) =>
        current.map((entry) => (entry.id === report.id ? data.report : entry))
      );
      toast.push(status === "handled" ? "Report marked handled." : "Report reopened.");
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setBusyId("");
    }
  }

  async function remove(report) {
    const confirmed = await askConfirm({
      title: "Delete this report?",
      description: "The post stays up. Only the report is removed.",
      confirmLabel: "Delete report",
    });
    if (!confirmed) return;
    setBusyId(report.id);
    try {
      const response = await fetch(
        `/api/admin/reports?id=${encodeURIComponent(report.id)}`,
        { method: "DELETE" }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not delete the report.");
      setReports((current) => current.filter((entry) => entry.id !== report.id));
      toast.push("Report deleted.");
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setBusyId("");
    }
  }

  const open = reports.filter((entry) => entry.status === "open");
  const handled = reports.filter((entry) => entry.status !== "open");

  function row(report) {
    return (
      <li
        key={report.id}
        className="grid gap-2"
        style={{ borderTop: "1px solid var(--glass-line)", paddingTop: ".7rem" }}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="grid gap-1" style={{ minWidth: 0 }}>
            <Link href={`/forums/${report.threadId}`} className="font-semibold hover:underline">
              {report.threadTitle || "Thread"}
            </Link>
            <span className="faint text-xs">
              {report.replyId ? "A reply" : "The thread"} · reported by @{report.reporter} ·{" "}
              {reasonLabel(report.reason)} · <LocalTime iso={report.at} />
            </span>
            {report.note && <span className="muted text-sm">{report.note}</span>}
            {report.status === "handled" && (
              <span className="faint text-xs">
                Handled{report.handledBy ? ` by @${report.handledBy}` : ""}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/forums/${report.threadId}`} className="btn btn-secondary btn-sm">
              Open thread
            </Link>
            {report.status === "open" ? (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => mark(report, "handled")}
                disabled={busyId === report.id}
              >
                Mark handled
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => mark(report, "open")}
                disabled={busyId === report.id}
              >
                Reopen
              </button>
            )}
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => remove(report)}
              disabled={busyId === report.id}
            >
              Delete
            </button>
          </div>
        </div>
      </li>
    );
  }

  return (
    <div className="grid gap-3">
      {dialog}
      {toast.view}
      {error && <p className="badge badge-denied">{error}</p>}

      <p className="muted text-sm max-w-xl">
        Members report a forum post from its thread. Locking or deleting the post still happens in
        the thread, so this list only keeps track of what was flagged and why.
      </p>

      <div className="glass-card application-card grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display font-bold">
            Open reports ({open.length})
          </h3>
          <button type="button" className="btn btn-secondary btn-sm" onClick={load} disabled={loading}>
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>

        {loading ? (
          <p className="muted text-sm">Loading...</p>
        ) : open.length === 0 ? (
          <EmptyState
            title="Nothing reported"
            description="A reported thread or reply shows up here."
          />
        ) : (
          <ul className="grid gap-2">{open.map(row)}</ul>
        )}
      </div>

      {handled.length > 0 && (
        <div className="glass-card application-card grid gap-3">
          <h3 className="font-display font-bold">Handled ({handled.length})</h3>
          <ul className="grid gap-2">{handled.map(row)}</ul>
        </div>
      )}
    </div>
  );
}
