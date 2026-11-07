"use client";

import { useState } from "react";
import { emptyForm } from "@/lib/form-builder/schema";
import FormBuilder from "@/components/form-builder/FormBuilder";

export default function FormBuilderHome({ initialForm, publicUrl, currentUser }) {
  const [form, setForm] = useState(initialForm);

  if (!form) {
    return (
      <div className="px-6 md:px-16 py-10 md:py-14">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <div>
              <p className="section-kicker">Form builder</p>
              <h1 className="font-display text-2xl md:text-3xl font-bold mt-1">Applications</h1>
            </div>
            <div className="flex items-center gap-3">
              {currentUser && <span className="text-xs text-black/40 dark:text-white/40">Signed in as {currentUser.username}</span>}
              <a href="/api/auth/discord/logout" className="text-xs text-black/40 dark:text-white/40 hover:text-[#be185d]">
                Sign out
              </a>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-10 text-center grid gap-4 justify-items-center">
            <p className="font-display text-xl font-bold">No form yet</p>
            <p className="text-sm text-black/60 dark:text-white/60 max-w-md">
              Create a form to start collecting applications. You can add sections and questions once it's created.
            </p>
            <button onClick={() => setForm(emptyForm())} className="btn-primary">
              + Create new form
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <FormBuilder initialForm={form} publicUrl={publicUrl} currentUser={currentUser} />;
}
