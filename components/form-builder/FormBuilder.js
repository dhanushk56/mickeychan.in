"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { QUESTION_TYPES, createQuestion, createSection, typeMeta } from "@/lib/form-builder/schema";
import FormRenderer from "@/components/form-builder/FormRenderer";

function uid(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function withSection(form, sectionId, fn) {
  return { ...form, sections: form.sections.map((s) => (s.id === sectionId ? fn(s) : s)) };
}

function withQuestion(section, questionId, fn) {
  return { ...section, questions: section.questions.map((q) => (q.id === questionId ? fn(q) : q)) };
}

function moveInArray(arr, index, direction) {
  const target = index + direction;
  if (target < 0 || target >= arr.length) return arr;
  const next = [...arr];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export default function FormBuilder({ initialForm, publicUrl, currentUser, formId }) {
  const [form, setForm] = useState({ ...initialForm, published: initialForm.published !== false });
  const [tab, setTab] = useState("edit");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);
  const [dirty, setDirty] = useState(false);

  const totals = useMemo(() => {
    const questions = form.sections.flatMap((section) => section.questions);
    return {
      sections: form.sections.length,
      questions: questions.length,
      required: questions.filter((question) => question.required).length,
    };
  }, [form.sections]);

  function commit(updater) {
    setForm((current) => updater(current));
    setDirty(true);
    setStatus("");
  }

  function updateForm(patch) {
    commit((f) => ({ ...f, ...patch }));
  }

  function updateSection(sectionId, patch) {
    commit((f) => withSection(f, sectionId, (s) => ({ ...s, ...patch })));
  }

  function addSection() {
    commit((f) => ({
      ...f,
      sections: [...f.sections, createSection(`Section ${f.sections.length + 1}`)],
    }));
  }

  function duplicateSection(sectionId) {
    commit((f) => {
      const index = f.sections.findIndex((s) => s.id === sectionId);
      if (index === -1) return f;
      const source = f.sections[index];
      const copy = {
        ...source,
        id: uid("sec"),
        title: `${source.title} (copy)`,
        questions: source.questions.map((q) => ({
          ...q,
          id: uid("q"),
          options: (q.options || []).map((o) => ({ ...o, id: uid("opt") })),
        })),
      };
      const next = [...f.sections];
      next.splice(index + 1, 0, copy);
      return { ...f, sections: next };
    });
  }

  function deleteSection(sectionId) {
    commit((f) =>
      f.sections.length <= 1 ? f : { ...f, sections: f.sections.filter((s) => s.id !== sectionId) }
    );
  }

  function moveSection(sectionId, direction) {
    commit((f) => {
      const index = f.sections.findIndex((s) => s.id === sectionId);
      return { ...f, sections: moveInArray(f.sections, index, direction) };
    });
  }

  function addQuestion(sectionId, type) {
    commit((f) =>
      withSection(f, sectionId, (s) => ({ ...s, questions: [...s.questions, createQuestion(type)] }))
    );
  }

  function duplicateQuestion(sectionId, questionId) {
    commit((f) =>
      withSection(f, sectionId, (s) => {
        const index = s.questions.findIndex((q) => q.id === questionId);
        if (index === -1) return s;
        const source = s.questions[index];
        const copy = {
          ...source,
          id: uid("q"),
          options: (source.options || []).map((o) => ({ ...o, id: uid("opt") })),
        };
        const next = [...s.questions];
        next.splice(index + 1, 0, copy);
        return { ...s, questions: next };
      })
    );
  }

  function deleteQuestion(sectionId, questionId) {
    commit((f) =>
      withSection(f, sectionId, (s) => ({
        ...s,
        questions: s.questions.filter((q) => q.id !== questionId),
      }))
    );
  }

  function moveQuestion(sectionId, questionId, direction) {
    commit((f) =>
      withSection(f, sectionId, (s) => {
        const index = s.questions.findIndex((q) => q.id === questionId);
        return { ...s, questions: moveInArray(s.questions, index, direction) };
      })
    );
  }

  function updateQuestion(sectionId, questionId, patch) {
    commit((f) =>
      withSection(f, sectionId, (s) => withQuestion(s, questionId, (q) => ({ ...q, ...patch })))
    );
  }

  function changeQuestionType(sectionId, questionId, newType) {
    commit((f) =>
      withSection(f, sectionId, (s) =>
        withQuestion(s, questionId, (q) => {
          const meta = typeMeta(newType);
          return {
            ...q,
            type: newType,
            options: meta.hasOptions
              ? q.options?.length
                ? q.options
                : [{ id: uid("opt"), label: "Option 1" }]
              : [],
            scale: meta.hasScale ? q.scale || { min: 1, max: 5, minLabel: "", maxLabel: "" } : null,
          };
        })
      )
    );
  }

  function addOption(sectionId, questionId) {
    commit((f) =>
      withSection(f, sectionId, (s) =>
        withQuestion(s, questionId, (q) => ({
          ...q,
          options: [...(q.options || []), { id: uid("opt"), label: `Option ${(q.options?.length || 0) + 1}` }],
        }))
      )
    );
  }

  function updateOption(sectionId, questionId, optionId, label) {
    commit((f) =>
      withSection(f, sectionId, (s) =>
        withQuestion(s, questionId, (q) => ({
          ...q,
          options: q.options.map((o) => (o.id === optionId ? { ...o, label } : o)),
        }))
      )
    );
  }

  function removeOption(sectionId, questionId, optionId) {
    commit((f) =>
      withSection(f, sectionId, (s) =>
        withQuestion(s, questionId, (q) => ({
          ...q,
          options: q.options.filter((o) => o.id !== optionId),
        }))
      )
    );
  }

  function updateScale(sectionId, questionId, patch) {
    commit((f) =>
      withSection(f, sectionId, (s) =>
        withQuestion(s, questionId, (q) => ({ ...q, scale: { ...q.scale, ...patch } }))
      )
    );
  }

  async function save() {
    setSaving(true);
    setStatus("");
    try {
      const response = await fetch(`/api/form-builder/forms/${formId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!response.ok) throw new Error("Save failed.");
      setStatus(form.published ? "Saved and live." : "Saved as draft.");
      setDirty(false);
    } catch (error) {
      setStatus(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function togglePublished() {
    const next = !form.published;
    updateForm({ published: next });
    try {
      const response = await fetch(`/api/form-builder/forms/${formId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, published: next }),
      });
      if (!response.ok) throw new Error("Could not update visibility.");
      setDirty(false);
      setStatus(next ? "Published — listed on open positions." : "Unpublished — link only.");
    } catch (error) {
      setStatus(error.message);
    }
  }

  function copyLink() {
    navigator.clipboard?.writeText(publicUrl).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  }

  return (
    <div className="page">
      <div className="shell builder-layout" style={{ maxWidth: "62rem" }}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link href="/form-builder" className="btn btn-ghost -ml-2">
              ← All forms
            </Link>
            <p className="kicker mt-2">Form builder</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`badge ${form.published ? "badge-accepted" : "badge-neutral"}`}>
              {form.published ? "Live" : "Draft"}
            </span>
            <a href="/api/auth/logout" className="btn btn-ghost">
              Lock
            </a>
          </div>
        </div>

        <div className="builder-toolbar">
          <div className="tabbar" role="tablist">
            {[
              { id: "edit", label: "Edit" },
              { id: "preview", label: "Preview" },
            ].map((item) => (
              <button
                key={item.id}
                role="tab"
                aria-selected={tab === item.id}
                className="tab"
                data-active={tab === item.id}
                onClick={() => setTab(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="btn btn-secondary btn-sm" onClick={togglePublished}>
              {form.published ? "Unpublish" : "Publish"}
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={copyLink}>
              {linkCopied ? "Link copied!" : "Copy apply link"}
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={save} disabled={saving}>
              {saving ? "Saving…" : dirty ? "Save changes •" : "Save form"}
            </button>
          </div>
        </div>

        {status && <p className="badge badge-accepted self-start">{status}</p>}

        {tab === "preview" ? (
          <FormRenderer form={form} mode="preview" />
        ) : (
          <div className="grid gap-4">
            <div className="glass-card p-5 grid gap-3">
              <label className="field">
                <span className="field-label">Form title</span>
                <input
                  className="input input-lg font-display font-bold"
                  value={form.title}
                  onChange={(event) => updateForm({ title: event.target.value })}
                  placeholder="Application form title"
                />
              </label>
              <label className="field">
                <span className="field-label">Description</span>
                <textarea
                  className="textarea"
                  rows={2}
                  value={form.description || ""}
                  onChange={(event) => updateForm({ description: event.target.value })}
                  placeholder="What is this form for?"
                />
              </label>
              <div className="flex flex-wrap gap-2 pt-1">
                <span className="chip" data-active="true">{totals.sections} sections</span>
                <span className="chip">{totals.questions} questions</span>
                <span className="chip">{totals.required} required</span>
              </div>
            </div>

            {form.sections.map((section, sIndex) => (
              <div key={section.id} className="glass-card p-5 grid gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1 grid gap-2">
                    <input
                      className="input font-semibold"
                      value={section.title}
                      onChange={(event) => updateSection(section.id, { title: event.target.value })}
                      placeholder="Section title"
                    />
                    <input
                      className="input text-sm"
                      value={section.description || ""}
                      onChange={(event) => updateSection(section.id, { description: event.target.value })}
                      placeholder="Section description (optional)"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      className="icon-button"
                      title="Move section up"
                      onClick={() => moveSection(section.id, -1)}
                      disabled={sIndex === 0}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="icon-button"
                      title="Move section down"
                      onClick={() => moveSection(section.id, 1)}
                      disabled={sIndex === form.sections.length - 1}
                    >
                      ↓
                    </button>
                  </div>
                </div>

                <div className="grid gap-3">
                  {section.questions.map((question, qIndex) => {
                    const meta = typeMeta(question.type);
                    return (
                      <div key={question.id} className="question-block grid gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            className="input flex-1"
                            style={{ minWidth: "10rem" }}
                            value={question.title}
                            onChange={(event) =>
                              updateQuestion(section.id, question.id, { title: event.target.value })
                            }
                            placeholder="Question"
                          />
                          <select
                            className="select"
                            style={{ width: "auto" }}
                            value={question.type}
                            onChange={(event) =>
                              changeQuestionType(section.id, question.id, event.target.value)
                            }
                            aria-label="Question type"
                          >
                            {QUESTION_TYPES.map((type) => (
                              <option key={type.id} value={type.id}>
                                {type.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <input
                          className="input text-sm"
                          value={question.description || ""}
                          onChange={(event) =>
                            updateQuestion(section.id, question.id, { description: event.target.value })
                          }
                          placeholder="Helper text (optional)"
                        />

                        {meta.hasOptions && (
                          <div className="grid gap-2">
                            {question.options.map((option) => (
                              <div key={option.id} className="option-row">
                                <span className="option-marker">
                                  {question.type === "checkboxes" ? "☐" : "○"}
                                </span>
                                <input
                                  className="input flex-1"
                                  value={option.label}
                                  onChange={(event) =>
                                    updateOption(section.id, question.id, option.id, event.target.value)
                                  }
                                />
                                <button
                                  type="button"
                                  className="icon-button"
                                  onClick={() => removeOption(section.id, question.id, option.id)}
                                  disabled={question.options.length <= 1}
                                  title="Remove option"
                                  aria-label="Remove option"
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                            <button
                              type="button"
                              className="btn btn-ghost self-start"
                              onClick={() => addOption(section.id, question.id)}
                            >
                              + Add option
                            </button>
                          </div>
                        )}

                        {meta.hasScale && question.scale && (
                          <div className="flex flex-wrap items-end gap-3">
                            <label className="field" style={{ width: "5rem" }}>
                              <span className="field-label">Min</span>
                              <input
                                type="number"
                                className="input"
                                value={question.scale.min}
                                onChange={(event) =>
                                  updateScale(section.id, question.id, { min: Number(event.target.value) })
                                }
                              />
                            </label>
                            <label className="field" style={{ width: "5rem" }}>
                              <span className="field-label">Max</span>
                              <input
                                type="number"
                                className="input"
                                value={question.scale.max}
                                onChange={(event) =>
                                  updateScale(section.id, question.id, { max: Number(event.target.value) })
                                }
                              />
                            </label>
                            <label className="field flex-1" style={{ minWidth: "8rem" }}>
                              <span className="field-label">Min label</span>
                              <input
                                className="input"
                                value={question.scale.minLabel || ""}
                                onChange={(event) =>
                                  updateScale(section.id, question.id, { minLabel: event.target.value })
                                }
                              />
                            </label>
                            <label className="field flex-1" style={{ minWidth: "8rem" }}>
                              <span className="field-label">Max label</span>
                              <input
                                className="input"
                                value={question.scale.maxLabel || ""}
                                onChange={(event) =>
                                  updateScale(section.id, question.id, { maxLabel: event.target.value })
                                }
                              />
                            </label>
                          </div>
                        )}

                        <div
                          className="flex flex-wrap items-center justify-between gap-2 pt-2"
                          style={{ borderTop: "1px solid var(--glass-edge)" }}
                        >
                          <label className="flex items-center gap-2 text-sm muted">
                            <input
                              type="checkbox"
                              className="checkbox"
                              checked={Boolean(question.required)}
                              onChange={(event) =>
                                updateQuestion(section.id, question.id, { required: event.target.checked })
                              }
                            />
                            Required
                          </label>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              className="icon-button"
                              title="Move up"
                              onClick={() => moveQuestion(section.id, question.id, -1)}
                              disabled={qIndex === 0}
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              className="icon-button"
                              title="Move down"
                              onClick={() => moveQuestion(section.id, question.id, 1)}
                              disabled={qIndex === section.questions.length - 1}
                            >
                              ↓
                            </button>
                            <button
                              type="button"
                              className="icon-button"
                              title="Duplicate"
                              onClick={() => duplicateQuestion(section.id, question.id)}
                            >
                              ⧉
                            </button>
                            <button
                              type="button"
                              className="icon-button"
                              title="Delete question"
                              onClick={() => deleteQuestion(section.id, question.id)}
                              style={{ color: "var(--danger)" }}
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {section.questions.length === 0 && (
                    <p className="faint text-sm text-center py-3">No questions in this section yet.</p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    className="select btn-sm"
                    style={{ width: "auto" }}
                    onChange={(event) => {
                      if (event.target.value) addQuestion(section.id, event.target.value);
                      event.target.value = "";
                    }}
                    defaultValue=""
                    aria-label="Add question"
                  >
                    <option value="" disabled>
                      + Add question…
                    </option>
                    {QUESTION_TYPES.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                  <button type="button" className="btn btn-ghost" onClick={() => duplicateSection(section.id)}>
                    Duplicate section
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => deleteSection(section.id)}
                    disabled={form.sections.length <= 1}
                    style={{ color: "var(--danger)" }}
                  >
                    Delete section
                  </button>
                </div>
              </div>
            ))}

            <button type="button" onClick={addSection} className="btn btn-secondary self-start">
              + Add section
            </button>

            <div className="glass-card p-5 grid gap-3">
              <p className="font-semibold text-sm">Submission settings</p>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="field">
                  <span className="field-label">Submit button label</span>
                  <input
                    className="input"
                    value={form.submitLabel}
                    onChange={(event) => updateForm({ submitLabel: event.target.value })}
                  />
                </label>
                <label className="field">
                  <span className="field-label">Success message</span>
                  <input
                    className="input"
                    value={form.successMessage}
                    onChange={(event) => updateForm({ successMessage: event.target.value })}
                  />
                </label>
                <label className="field">
                  <span className="field-label">Reapply cooldown after rejection (hours)</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    className="input"
                    value={form.settings?.cooldownHours ?? 0}
                    onChange={(event) =>
                      updateForm({
                        settings: {
                          ...(form.settings || {}),
                          cooldownHours: Math.max(0, Math.floor(Number(event.target.value) || 0)),
                        },
                      })
                    }
                  />
                </label>
              </div>
              <p className="faint text-xs">
                A rejected applicant sees a live countdown and can apply again once it ends. 0 lets
                them reapply straight away; 24 = one day, 168 = one week.
              </p>
              <p className="faint text-xs">
                Public link: <span className="font-mono break-all">{publicUrl}</span>
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 mt-2">
          <p className="faint text-xs">
            {dirty ? "Unsaved changes" : "All changes saved"} ·{" "}
            <Link href="/admin" className="hover:underline">
              Review submissions
            </Link>
          </p>
          <button type="button" onClick={save} disabled={saving} className="btn btn-primary">
            {saving ? "Saving…" : "Save form"}
          </button>
        </div>
      </div>
    </div>
  );
}
