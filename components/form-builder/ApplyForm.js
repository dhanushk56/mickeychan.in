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
      <div className="glass-card p-10 text-center animate-rise">
        <div className="glass-inset icon-button mx-auto mb-5" aria-hidden="true">✓</div>
        <p className="font-display text-2xl font-bold mb-2">Submitted</p>
        <p className="muted leading-relaxed">{form.successMessage}</p>
        <p className="faint text-xs mt-6">You can close this page.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <FormRenderer form={form} mode="fill" onSubmit={handleSubmit} submitting={submitting} />
      {error && (
        <p className="badge badge-denied mx-auto" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
