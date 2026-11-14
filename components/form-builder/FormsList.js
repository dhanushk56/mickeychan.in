"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/components/ConfirmDialog";

export default function FormsList({ initialForms, currentUser }) {
  const router = useRouter();
  const [forms, setForms] = useState(initialForms);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState("");
  const [dialog, askConfirm] = useConfirm();

  async function createForm() {
    setCreating(true);
    setError("");
    try {
      const response = await fetch("/api/form-builder/forms", { method: "POST" });
      if (!response.ok) throw new Error("Could not create a new form.");
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
    const previous = forms;
    setForms((current) => current.filter((form) => form.id !== id));
    try {
      const response = await fetch(`/api/form-builder/forms/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Could not delete that form.");
    } catch (err) {
      setForms(previous);
      setError(err.message);
    }
  }

  function copyLink(id) {
    const url = `${window.location.origin}/form-builder/apply/${id}`;
    navigator.clipboard?.writeText(url).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(""), 2000);
    });
  }

  return (
    <div className="page">
      <div className="shell" style={{ maxWidth: "62rem" }}>
        <div className="admin-header mb-6">
          <div>
            <p className="kicker">Form builder</p>
            <h1 className="display-lg mt-2">Your forms</h1>
            <p className="muted mt-2 text-sm">
              Create application forms, publish them to the positions page, and review answers in the admin console.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/admin" className="btn btn-secondary btn-sm">
              Admin console
            </Link>
            <a href="/api/auth/logout" className="btn btn-ghost">
              Lock
            </a>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <button type="button" onClick={createForm} disabled={creating} className="btn btn-primary">
            {creating ? "Creating…" : "+ Create new form"}
          </button>
          <span className="faint text-xs">{forms.length} forms</span>
        </div>

        {error && <p className="badge badge-denied mb-4">{error}</p>}

        {forms.length === 0 ? (
          <div className="empty-state">
            <p className="font-display text-lg font-bold">No forms yet</p>
            <p className="muted text-sm max-w-md">
              Create your first form to start collecting applications. You can add sections,
              questions, and publish it when it&apos;s ready.
            </p>
            <button type="button" onClick={createForm} className="btn btn-primary btn-sm mt-2" disabled={creating}>
              + Create your first form
            </button>
          </div>
        ) : (
          <div className="grid gap-3">
            {forms.map((form) => (
              <article key={form.id} className="glass-card application-card">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Link href={`/form-builder/${form.id}`} className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-lg font-bold">{form.title || "Untitled form"}</h2>
                      <span className={`badge ${form.published === false ? "badge-neutral" : "badge-accepted"}`}>
                        {form.published === false ? "Draft" : "Live"}
                      </span>
                    </div>
                    <p className="faint text-xs mt-1">
                      Updated {form.updatedAt ? new Date(form.updatedAt).toLocaleString() : "—"}
                    </p>
                  </Link>
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => copyLink(form.id)}>
                      {copiedId === form.id ? "Copied!" : "Copy apply link"}
                    </button>
                    <Link href={`/form-builder/${form.id}`} className="btn btn-secondary btn-sm">
                      Edit
                    </Link>
                    <button
                      type="button"
                      onClick={() => deleteForm(form.id)}
                      className="btn btn-ghost"
                      style={{ color: "var(--danger)" }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
            </div>
      {dialog}
    </div>
  );
}
