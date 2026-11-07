"use client";

import { useState } from "react";
import { validateResponses } from "@/lib/form-builder/schema";

function QuestionField({ question, value, onChange, error }) {
  const setValue = (next) => onChange(question.id, next);

  return (
    <div className="glass-card p-5">
      <p className="font-display font-bold">
        {question.title || "Untitled question"}
        {question.required && <span style={{ color: "var(--accent)" }}> *</span>}
      </p>
      {question.description && <p className="muted text-sm mt-1 mb-3">{question.description}</p>}

      <div className="mt-3">
        {question.type === "short_answer" && (
          <input className="input" value={value || ""} onChange={(event) => setValue(event.target.value)} />
        )}

        {question.type === "paragraph" && (
          <textarea
            className="textarea"
            rows={4}
            value={value || ""}
            onChange={(event) => setValue(event.target.value)}
          />
        )}

        {question.type === "multiple_choice" && (
          <div className="grid gap-2">
            {question.options.map((option) => (
              <label key={option.id} className="flex items-center gap-3 text-sm">
                <input
                  type="radio"
                  className="checkbox"
                  name={question.id}
                  checked={value === option.label}
                  onChange={() => setValue(option.label)}
                />
                {option.label}
              </label>
            ))}
          </div>
        )}

        {question.type === "checkboxes" && (
          <div className="grid gap-2">
            {question.options.map((option) => {
              const array = Array.isArray(value) ? value : [];
              const checked = array.includes(option.label);
              return (
                <label key={option.id} className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={checked}
                    onChange={() =>
                      setValue(checked ? array.filter((v) => v !== option.label) : [...array, option.label])
                    }
                  />
                  {option.label}
                </label>
              );
            })}
          </div>
        )}

        {question.type === "dropdown" && (
          <select className="select" value={value || ""} onChange={(event) => setValue(event.target.value)}>
            <option value="">Choose…</option>
            {question.options.map((option) => (
              <option key={option.id} value={option.label}>
                {option.label}
              </option>
            ))}
          </select>
        )}

        {question.type === "linear_scale" && question.scale && (
          <div>
            <div className="flex flex-wrap items-center gap-3">
              {Array.from(
                { length: Math.max(0, question.scale.max - question.scale.min + 1) },
                (_, i) => question.scale.min + i
              ).map((n) => (
                <label
                  key={n}
                  className="glass-inset flex flex-col items-center gap-1 px-3 py-2 text-xs muted"
                  style={value === n ? { borderColor: "var(--primary)", color: "var(--primary)" } : undefined}
                >
                  <input
                    type="radio"
                    className="checkbox"
                    name={question.id}
                    checked={value === n}
                    onChange={() => setValue(n)}
                  />
                  {n}
                </label>
              ))}
            </div>
            {(question.scale.minLabel || question.scale.maxLabel) && (
              <div className="flex justify-between text-xs faint mt-2">
                <span>{question.scale.minLabel}</span>
                <span>{question.scale.maxLabel}</span>
              </div>
            )}
          </div>
        )}

        {question.type === "date" && (
          <input
            type="date"
            className="input"
            value={value || ""}
            onChange={(event) => setValue(event.target.value)}
          />
        )}

        {question.type === "time" && (
          <input
            type="time"
            className="input"
            value={value || ""}
            onChange={(event) => setValue(event.target.value)}
          />
        )}

        {question.type === "file_upload" && (
          <input
            type="url"
            className="input"
            placeholder="Paste a link to your file (Google Drive, Dropbox, …)"
            value={value || ""}
            onChange={(event) => setValue(event.target.value)}
          />
        )}
      </div>

      {error && (
        <p className="text-xs mt-2" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}
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
    setResponses((previous) => ({ ...previous, [id]: value }));
  }

  function goNext() {
    const sectionErrors = {};
    for (const question of section.questions) {
      if (!question.required) continue;
      const value = responses[question.id];
      const empty =
        value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);
      if (empty) sectionErrors[question.id] = "This question is required.";
    }
    if (Object.keys(sectionErrors).length > 0) {
      setErrors(sectionErrors);
      return;
    }
    setErrors({});
    setSectionIndex((index) => Math.min(index + 1, sections.length - 1));
  }

  function goBack() {
    setErrors({});
    setSectionIndex((index) => Math.max(index - 1, 0));
  }

  function handleSubmit() {
    const allErrors = validateResponses(form, responses);
    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      return;
    }
    if (mode === "preview") {
      setPreviewNotice("Preview only — responses aren't saved.");
      return;
    }
    onSubmit?.(responses);
  }

  if (!section) return null;

  return (
    <div className="grid gap-4" style={{ maxWidth: "44rem", marginInline: "auto", width: "100%" }}>
      <div className="glass-card p-6">
        <p className="kicker">Application</p>
        <h1 className="font-display text-2xl md:text-3xl font-bold mt-2">{form.title}</h1>
        {form.description && <p className="muted mt-2 leading-relaxed">{form.description}</p>}
      </div>

      {sections.length > 1 && (
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1 rounded-full" style={{ background: "var(--glass-edge)" }}>
            <div
              className="h-1 rounded-full transition-all"
              style={{
                width: `${((sectionIndex + 1) / sections.length) * 100}%`,
                background: "linear-gradient(90deg, var(--primary), var(--accent))",
              }}
            />
          </div>
          <p className="faint text-xs whitespace-nowrap">
            {sectionIndex + 1} / {sections.length}
            {section.title ? ` · ${section.title}` : ""}
          </p>
        </div>
      )}

      {section.description && <p className="muted text-sm">{section.description}</p>}

      {section.questions.map((question) => (
        <QuestionField
          key={question.id}
          question={question}
          value={responses[question.id]}
          onChange={updateResponse}
          error={errors[question.id]}
        />
      ))}

      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={goBack} disabled={sectionIndex === 0} className="btn btn-secondary">
          Back
        </button>
        {isLastSection ? (
          <button type="button" onClick={handleSubmit} disabled={submitting} className="btn btn-primary">
            {submitting ? "Submitting…" : form.submitLabel || "Submit"}
          </button>
        ) : (
          <button type="button" onClick={goNext} className="btn btn-primary">
            Next
          </button>
        )}
      </div>

      {previewNotice && <p className="faint text-sm text-center">{previewNotice}</p>}
    </div>
  );
}
