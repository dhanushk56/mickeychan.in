"use client";

import { useState } from "react";
import { validateResponses } from "@/lib/form-builder/schema";

function QuestionField({ question, value, onChange, error }) {
  const setValue = (v) => onChange(question.id, v);

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-start justify-between gap-3 mb-1">
        <p className="form-question">
          {question.title || "Untitled question"}
          {question.required && <span className="text-[#be185d]"> *</span>}
        </p>
      </div>
      {question.description && (
        <p className="text-sm text-black/50 dark:text-white/50 mb-4">{question.description}</p>
      )}
      {!question.description && <div className="mb-4" />}

      {question.type === "short_answer" && (
        <input className="form-input" value={value || ""} onChange={(e) => setValue(e.target.value)} />
      )}

      {question.type === "paragraph" && (
        <textarea className="form-input resize-y" rows={4} value={value || ""} onChange={(e) => setValue(e.target.value)} />
      )}

      {question.type === "multiple_choice" && (
        <div className="grid gap-2">
          {question.options.map((opt) => (
            <label key={opt.id} className="flex items-center gap-3 text-sm">
              <input
                type="radio"
                name={question.id}
                checked={value === opt.label}
                onChange={() => setValue(opt.label)}
              />
              {opt.label}
            </label>
          ))}
        </div>
      )}

      {question.type === "checkboxes" && (
        <div className="grid gap-2">
          {question.options.map((opt) => {
            const arr = Array.isArray(value) ? value : [];
            const checked = arr.includes(opt.label);
            return (
              <label key={opt.id} className="flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() =>
                    setValue(checked ? arr.filter((v) => v !== opt.label) : [...arr, opt.label])
                  }
                />
                {opt.label}
              </label>
            );
          })}
        </div>
      )}

      {question.type === "dropdown" && (
        <select className="form-input" value={value || ""} onChange={(e) => setValue(e.target.value)}>
          <option value="">Choose...</option>
          {question.options.map((opt) => (
            <option key={opt.id} value={opt.label}>
              {opt.label}
            </option>
          ))}
        </select>
      )}

      {question.type === "linear_scale" && (
        <div>
          <div className="flex items-center gap-4">
            {Array.from(
              { length: question.scale.max - question.scale.min + 1 },
              (_, i) => question.scale.min + i
            ).map((n) => (
              <label key={n} className="flex flex-col items-center gap-2 text-xs text-black/50 dark:text-white/50">
                <input type="radio" name={question.id} checked={value === n} onChange={() => setValue(n)} />
                {n}
              </label>
            ))}
          </div>
          {(question.scale.minLabel || question.scale.maxLabel) && (
            <div className="flex justify-between text-xs text-black/40 dark:text-white/40 mt-2">
              <span>{question.scale.minLabel}</span>
              <span>{question.scale.maxLabel}</span>
            </div>
          )}
        </div>
      )}

      {question.type === "date" && (
        <input type="date" className="form-input" value={value || ""} onChange={(e) => setValue(e.target.value)} />
      )}

      {question.type === "time" && (
        <input type="time" className="form-input" value={value || ""} onChange={(e) => setValue(e.target.value)} />
      )}

      {question.type === "file_upload" && (
        <input
          type="url"
          className="form-input"
          placeholder="Paste a link to your file (Google Drive, Dropbox, etc.)"
          value={value || ""}
          onChange={(e) => setValue(e.target.value)}
        />
      )}

      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
    </div>
  );
}

export default function FormRenderer({ form, mode = "fill", onSubmit, submitting = false }) {
  const [sectionIndex, setSectionIndex] = useState(0);
  const [responses, setResponses] = useState({});
  const [errors, setErrors] = useState({});
  const [previewNotice, setPreviewNotice] = useState("");

  const sections = form.sections || [];
  const section = sections[sectionIndex];
  const isLastSection = sectionIndex === sections.length - 1;

  function updateResponse(id, value) {
    setResponses((prev) => ({ ...prev, [id]: value }));
  }

  function goNext() {
    const sectionErrors = {};
    for (const q of section.questions) {
      if (!q.required) continue;
      const v = responses[q.id];
      const empty = v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);
      if (empty) sectionErrors[q.id] = "This question is required.";
    }
    if (Object.keys(sectionErrors).length > 0) {
      setErrors(sectionErrors);
      return;
    }
    setErrors({});
    setSectionIndex((i) => Math.min(i + 1, sections.length - 1));
  }

  function goBack() {
    setErrors({});
    setSectionIndex((i) => Math.max(i - 1, 0));
  }

  function handleSubmit() {
    const allErrors = validateResponses(form, responses);
    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      return;
    }
    if (mode === "preview") {
      setPreviewNotice("This is a preview — responses here aren't saved.");
      return;
    }
    onSubmit?.(responses);
  }

  if (!section) return null;

  return (
    <div className="max-w-2xl mx-auto grid gap-6">
      <div className="glass-card rounded-2xl p-6 border-t-4" style={{ borderTopColor: "#be185d" }}>
        <h1 className="font-display text-2xl md:text-3xl font-bold mb-2">{form.title}</h1>
        {form.description && <p className="text-black/60 dark:text-white/60">{form.description}</p>}
      </div>

      {sections.length > 1 && (
        <p className="text-xs text-black/40 dark:text-white/40 text-center">
          Section {sectionIndex + 1} of {sections.length}
          {section.title ? ` — ${section.title}` : ""}
        </p>
      )}

      {section.description && (
        <p className="text-sm text-black/50 dark:text-white/50 -mt-3">{section.description}</p>
      )}

      {section.questions.map((q) => (
        <QuestionField key={q.id} question={q} value={responses[q.id]} onChange={updateResponse} error={errors[q.id]} />
      ))}

      <div className="flex items-center justify-between">
        <button type="button" onClick={goBack} disabled={sectionIndex === 0} className="btn-secondary disabled:opacity-40">
          Back
        </button>
        {isLastSection ? (
          <button type="button" onClick={handleSubmit} disabled={submitting} className="btn-primary disabled:opacity-60">
            {submitting ? "Submitting…" : form.submitLabel || "Submit"}
          </button>
        ) : (
          <button type="button" onClick={goNext} className="btn-primary">
            Next
          </button>
        )}
      </div>

      {previewNotice && <p className="text-sm text-center text-black/50 dark:text-white/50">{previewNotice}</p>}
    </div>
  );
}
