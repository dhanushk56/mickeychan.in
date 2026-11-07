"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function FormsList({ initialForms, currentUser }) {
  const router = useRouter();
  const [forms, setForms] = useState(initialForms);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState("");

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
    if (!confirm("Delete this form? Past submissions are kept, but the form itself can't be recovered.")) return;
    const previous = forms;
    setForms((f) => f.filter((form) => form.id !== id));
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
    <div className="px-6 md:px-16 py-10 md:py-14">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <p className="section-kicker">Form builder</p>
            <h1 className="font-display text-2xl md:text-3xl font-bold mt-1">Your forms</h1>
          </div>
          <div className="flex items-center gap-3">
            {currentUser && <span className="text-xs text-black/40 dark:text-white/40">Signed in as {currentUser.username}</span>}
            <a href="/api/auth/discord/logout" className="text-xs text-black/40 dark:text-white/40 hover:text-[#be185d]">
              Sign out
            </a>
          </div>
        </div>

        <button onClick={createForm} disabled={creating} className="btn-primary mb-8 disabled:opacity-60">
          {creating ? "Creating…" : "+ Create new form"}
        </button>

        {error && <p className="text-sm text-red-500 mb-6">{error}</p>}

        {forms.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-black/60 dark:text-white/60">
            No forms yet. Create one to start collecting applications.
          </div>
        ) : (
          <div className="grid gap-4">
            {forms.map((form) => (
              <div key={form.id} className="glass-card rounded-2xl p-6 flex flex-wrap items-center justify-between gap-3">
                <a href={`/form-builder/${form.id}`} className="flex-1 min-w-[160px]">
                  <p className="font-display text-lg font-bold">{form.title || "Untitled form"}</p>
                  <p className="text-xs text-black/40 dark:text-white/40 mt-1">
                    Updated {new Date(form.updatedAt).toLocaleString()}
                  </p>
                </a>
                <div className="flex items-center gap-3 text-sm">
                  <button onClick={() => copyLink(form.id)} className="text-black/50 dark:text-white/50 hover:text-[#be185d]">
                    {copiedId === form.id ? "Copied!" : "Copy apply link"}
                  </button>
                  <button onClick={() => deleteForm(form.id)} className="text-[#be185d]">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
