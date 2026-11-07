"use client";

import { useState } from "react";
import FormRenderer from "@/components/form-builder/FormRenderer";

export default function ApplyForm({ form, formId }) {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(responses) {
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formId, responses }),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || "Unable to submit your application.");
      }
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="max-w-2xl mx-auto glass-card rounded-2xl p-8 text-center">
        <p className="font-display text-xl font-bold mb-2">Submitted</p>
        <p className="text-black/60 dark:text-white/60">{form.successMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <FormRenderer form={form} mode="fill" onSubmit={handleSubmit} submitting={submitting} />
      {error && <p className="text-sm text-red-500 text-center max-w-2xl mx-auto">{error}</p>}
    </div>
  );
}
