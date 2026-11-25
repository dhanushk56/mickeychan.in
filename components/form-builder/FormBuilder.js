"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ACCEPT_GROUPS,
  LOGIC_OPERATORS,
  MAX_UPLOAD_BYTES,
  QUESTION_TYPES,
  createQuestion,
  createSection,
  defaultRules,
  questionLogic,
  questionRules,
  typeMeta,
} from "@/lib/form-builder/schema";
import { JOB_FIELDS, jobMeta } from "@/lib/applications";
import FormRenderer from "@/components/form-builder/FormRenderer";
import RichTextEditor from "@/components/RichTextEditor";

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

// Drag and drop moves a question between sections as well as inside one. The
// index is the row being dropped onto, so the question lands before it.
function moveQuestionTo(form, fromSectionId, questionId, toSectionId, targetIndex) {
  const sections = form.sections.map((section) => ({ ...section, questions: [...section.questions] }));
  const from = sections.find((section) => section.id === fromSectionId);
  const to = sections.find((section) => section.id === toSectionId);
  if (!from || !to) return form;
  const currentIndex = from.questions.findIndex((question) => question.id === questionId);
  if (currentIndex === -1) return form;

  const [moved] = from.questions.splice(currentIndex, 1);
  let insertAt = targetIndex;
  if (fromSectionId === toSectionId && currentIndex < targetIndex) insertAt -= 1;
  to.questions.splice(Math.max(0, Math.min(insertAt, to.questions.length)), 0, moved);
  return { ...form, sections };
}

function moveSectionTo(form, sectionId, targetIndex) {
  const from = form.sections.findIndex((section) => section.id === sectionId);
  if (from === -1) return form;
  const sections = [...form.sections];
  const [moved] = sections.splice(from, 1);
  const at = from < targetIndex ? targetIndex - 1 : targetIndex;
  sections.splice(Math.max(0, Math.min(at, sections.length)), 0, moved);
  return { ...form, sections };
}

function earlierQuestions(form, questionId) {
  const list = [];
  for (const section of form.sections) {
    for (const question of section.questions) {
      if (question.id === questionId) return list;
      list.push(question);
    }
  }
  return list;
}

export default function FormBuilder({ initialForm, publicUrl, currentUser, formId }) {
  const [form, setForm] = useState({ ...initialForm, published: initialForm.published !== false });
  const [tab, setTab] = useState("edit");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [dragging, setDragging] = useState(null);

  // Role details live in form.settings.job so older forms keep working with an
  // empty set of fields. The draft holds exactly what was typed, spaces
  // included, while the stored copy gets trimmed on read.
  const [job, setJob] = useState(() => jobMeta(initialForm));

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

  function updateJob(field, value) {
    const next = { ...job, [field]: value };
    setJob(next);
    updateForm({ settings: { ...(form.settings || {}), job: next } });
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

  // One press: in reading order, every question waits for the one before it to
  // be answered. The first question stays open, or the form would never start.
  function chainConditions() {
    commit((f) => {
      let previousId = "";
      return {
        ...f,
        sections: f.sections.map((section) => ({
          ...section,
          questions: section.questions.map((question) => {
            const logic = previousId
              ? { questionId: previousId, operator: "answered", value: "" }
              : null;
            previousId = question.id;
            return { ...question, logic };
          }),
        })),
      };
    });
    setStatus("Each question now waits for the one before it. Save to keep it.");
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
            rows:
              meta.id === "matrix"
                ? q.rows?.length
                  ? q.rows
                  : [{ id: uid("row"), label: "Row 1" }]
                : [],
            scale:
              meta.kind === "scale" ? q.scale || { min: 1, max: 5, minLabel: "", maxLabel: "" } : null,
            rules: defaultRules(newType),
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

  function addRow(sectionId, questionId) {
    commit((f) =>
      withSection(f, sectionId, (s) =>
        withQuestion(s, questionId, (q) => ({
          ...q,
          rows: [...(q.rows || []), { id: uid("row"), label: `Row ${(q.rows?.length || 0) + 1}` }],
        }))
      )
    );
  }
  function updateRow(sectionId, questionId, rowId, label) {
    commit((f) =>
      withSection(f, sectionId, (s) =>
        withQuestion(s, questionId, (q) => ({
          ...q,
          rows: (q.rows || []).map((row) => (row.id === rowId ? { ...row, label } : row)),
        }))
      )
    );
  }
  function removeRow(sectionId, questionId, rowId) {
    commit((f) =>
      withSection(f, sectionId, (s) =>
        withQuestion(s, questionId, (q) => ({
          ...q,
          rows: (q.rows || []).filter((row) => row.id !== rowId),
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

  function startDrag(event, payload) {
    setDragging(payload);
    event.dataTransfer.effectAllowed = "move";
    try {
      event.dataTransfer.setData("text/plain", payload.questionId || payload.sectionId || "move");
    } catch {
      // Some browsers refuse custom data; the state above still drives the drop.
    }
  }

  function dropQuestion(event, sectionId, index) {
    if (!dragging || dragging.type !== "question") return;
    event.preventDefault();
    event.stopPropagation();
    const source = dragging;
    setDragging(null);
    commit((f) => moveQuestionTo(f, source.sectionId, source.questionId, sectionId, index));
  }

  function dropSection(event, index) {
    if (!dragging || dragging.type !== "section") return;
    event.preventDefault();
    const source = dragging;
    setDragging(null);
    commit((f) => moveSectionTo(f, source.sectionId, index));
  }

  function updateRules(sectionId, questionId, patch) {
    commit((f) =>
      withSection(f, sectionId, (s) =>
        withQuestion(s, questionId, (q) => ({
          ...q,
          rules: { ...defaultRules(q.type), ...(q.rules || {}), ...patch },
        }))
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
      setStatus(next ? "Published, listed on open positions." : "Unpublished, link only.");
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
              <div className="field">
                <span className="field-label">Description</span>
                <RichTextEditor
                  label="Form description"
                  value={form.description}
                  onChange={(blocks) => updateForm({ description: blocks })}
                  placeholder="What is this form for? Press Enter for a new line."
                />
                <span className="faint text-xs">
                  Enter starts a new line. Highlight text to bold it, underline it, or change its
                  size and font.
                </span>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <span className="chip" data-active="true">{totals.sections} sections</span>
                <span className="chip">{totals.questions} questions</span>
                <span className="chip">{totals.required} required</span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={chainConditions}
                >
                  Ask one at a time
                </button>
                <span className="faint text-xs">
                  Each question appears once the one before it has an answer. The first one always
                  shows.
                </span>
              </div>
            </div>

            {form.sections.map((section, sIndex) => (
              <div
                key={section.id}
                className="glass-card p-5 grid gap-4"
                data-dragging={dragging?.type === "section" && dragging.sectionId === section.id}
                onDragOver={(event) => {
                  if (dragging?.type === "section") event.preventDefault();
                }}
                onDrop={(event) => dropSection(event, sIndex)}
              >
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    className="icon-button drag-handle"
                    title="Drag to reorder this section"
                    aria-label="Drag to reorder this section"
                    draggable
                    onDragStart={(event) =>
                      startDrag(event, { type: "section", sectionId: section.id })
                    }
                    onDragEnd={() => setDragging(null)}
                  >
                    ⠿
                  </button>
                  <div className="flex-1 grid gap-2">
                    <input
                      className="input font-semibold"
                      value={section.title}
                      onChange={(event) => updateSection(section.id, { title: event.target.value })}
                      placeholder="Section title"
                    />
                    <RichTextEditor
                      label={`Section ${sIndex + 1} description`}
                      value={section.description}
                      onChange={(blocks) => updateSection(section.id, { description: blocks })}
                      placeholder="Section description (optional)"
                      minHeight="2.5rem"
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
                    const rules = questionRules(question);
                    return (
                      <div
                        key={question.id}
                        className="question-block grid gap-3"
                        data-dragging={
                          dragging?.type === "question" && dragging.questionId === question.id
                        }
                        onDragOver={(event) => {
                          if (dragging?.type === "question") event.preventDefault();
                        }}
                        onDrop={(event) => dropQuestion(event, section.id, qIndex)}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            className="icon-button drag-handle"
                            title="Drag to reorder this question"
                            aria-label="Drag to reorder this question"
                            draggable
                            onDragStart={(event) =>
                              startDrag(event, {
                                type: "question",
                                sectionId: section.id,
                                questionId: question.id,
                              })
                            }
                            onDragEnd={() => setDragging(null)}
                          >
                            ⠿
                          </button>
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
                            <option value="payment" disabled>
                              Payment (needs Stripe, not available)
                            </option>
                          </select>
                        </div>

                        <RichTextEditor
                          label="Question helper text"
                          value={question.description}
                          onChange={(blocks) =>
                            updateQuestion(section.id, question.id, { description: blocks })
                          }
                          placeholder="Helper text (optional)"
                          minHeight="2.5rem"
                        />

                        {meta.hasOptions && (
                          <div className="grid gap-2">
                            {meta.kind === "matrix" && (
                              <span className="field-label">Columns</span>
                            )}
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
                              + Add {meta.kind === "matrix" ? "column" : "option"}
                            </button>
                          </div>
                        )}

                        {meta.kind === "matrix" && (
                          <div className="grid gap-2">
                            <span className="field-label">Rows</span>
                            {(question.rows || []).map((row) => (
                              <div key={row.id} className="option-row">
                                <span className="option-marker">▤</span>
                                <input
                                  className="input flex-1"
                                  value={row.label}
                                  onChange={(event) =>
                                    updateRow(section.id, question.id, row.id, event.target.value)
                                  }
                                  aria-label="Row label"
                                />
                                <button
                                  type="button"
                                  className="icon-button"
                                  onClick={() => removeRow(section.id, question.id, row.id)}
                                  disabled={(question.rows || []).length <= 1}
                                  title="Remove row"
                                  aria-label="Remove row"
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                            <button
                              type="button"
                              className="btn btn-ghost self-start"
                              onClick={() => addRow(section.id, question.id)}
                            >
                              + Add row
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

                        {(meta.kind === "text" || meta.kind === "email" || meta.kind === "url") && (
                          <div className="flex flex-wrap items-end gap-3">
                            <label className="field" style={{ width: "8rem" }}>
                              <span className="field-label">Min characters</span>
                              <input
                                type="number"
                                min="0"
                                className="input"
                                value={rules.minChars ?? ""}
                                placeholder="None"
                                onChange={(event) =>
                                  updateRules(section.id, question.id, {
                                    minChars: event.target.value === "" ? null : Number(event.target.value),
                                  })
                                }
                              />
                            </label>
                            <label className="field" style={{ width: "8rem" }}>
                              <span className="field-label">Max characters</span>
                              <input
                                type="number"
                                min="0"
                                className="input"
                                value={rules.maxChars ?? ""}
                                placeholder="None"
                                onChange={(event) =>
                                  updateRules(section.id, question.id, {
                                    maxChars: event.target.value === "" ? null : Number(event.target.value),
                                  })
                                }
                              />
                            </label>
                          </div>
                        )}

                        {meta.kind === "number" && (
                          <div className="flex flex-wrap items-end gap-3">
                            <label className="field" style={{ width: "8rem" }}>
                              <span className="field-label">Lowest</span>
                              <input
                                type="number"
                                className="input"
                                value={rules.min ?? ""}
                                placeholder="None"
                                onChange={(event) =>
                                  updateRules(section.id, question.id, {
                                    min: event.target.value === "" ? null : Number(event.target.value),
                                  })
                                }
                              />
                            </label>
                            <label className="field" style={{ width: "8rem" }}>
                              <span className="field-label">Highest</span>
                              <input
                                type="number"
                                className="input"
                                value={rules.max ?? ""}
                                placeholder="None"
                                onChange={(event) =>
                                  updateRules(section.id, question.id, {
                                    max: event.target.value === "" ? null : Number(event.target.value),
                                  })
                                }
                              />
                            </label>
                          </div>
                        )}

                        {meta.kind === "choice" &&
                          question.type !== "multiple_choice" &&
                          question.type !== "dropdown" && (
                            <div className="flex flex-wrap items-end gap-3">
                              <label className="field" style={{ width: "9rem" }}>
                                <span className="field-label">Choose at least</span>
                                <input
                                  type="number"
                                  min="0"
                                  className="input"
                                  value={rules.minSelections ?? ""}
                                  placeholder="None"
                                  onChange={(event) =>
                                    updateRules(section.id, question.id, {
                                      minSelections:
                                        event.target.value === "" ? null : Number(event.target.value),
                                    })
                                  }
                                />
                              </label>
                              <label className="field" style={{ width: "9rem" }}>
                                <span className="field-label">Choose at most</span>
                                <input
                                  type="number"
                                  min="1"
                                  className="input"
                                  value={rules.maxSelections ?? ""}
                                  placeholder="None"
                                  onChange={(event) =>
                                    updateRules(section.id, question.id, {
                                      maxSelections:
                                        event.target.value === "" ? null : Number(event.target.value),
                                    })
                                  }
                                />
                              </label>
                            </div>
                          )}

                        {meta.kind === "date" && (
                          <div className="flex flex-wrap items-end gap-3">
                            <label className="field" style={{ width: "10rem" }}>
                              <span className="field-label">Earliest</span>
                              <input
                                type="date"
                                className="input"
                                value={rules.minDate || ""}
                                onChange={(event) =>
                                  updateRules(section.id, question.id, { minDate: event.target.value })
                                }
                              />
                            </label>
                            <label className="field" style={{ width: "10rem" }}>
                              <span className="field-label">Latest</span>
                              <input
                                type="date"
                                className="input"
                                value={rules.maxDate || ""}
                                onChange={(event) =>
                                  updateRules(section.id, question.id, { maxDate: event.target.value })
                                }
                              />
                            </label>
                          </div>
                        )}

                        {meta.kind === "rating" && (
                          <label className="field" style={{ width: "10rem" }}>
                            <span className="field-label">Stars</span>
                            <select
                              className="select"
                              value={rules.ratingMax}
                              onChange={(event) =>
                                updateRules(section.id, question.id, {
                                  ratingMax: Number(event.target.value),
                                })
                              }
                            >
                              {[3, 4, 5, 6, 7, 8, 9, 10].map((count) => (
                                <option key={count} value={count}>
                                  {count}
                                </option>
                              ))}
                            </select>
                          </label>
                        )}

                        {meta.kind === "file" && (
                          <div className="grid gap-3">
                            <div className="grid gap-2">
                              <span className="field-label">Accepted formats</span>
                              <p className="faint text-xs">
                                People can upload a file straight from the form, up to{" "}
                                {Math.round(MAX_UPLOAD_BYTES / 1024)} KB each, or paste a link
                                instead.
                              </p>
                              <div className="flex flex-wrap gap-x-4 gap-y-2">
                                {ACCEPT_GROUPS.map((group) => {
                                  const on = rules.accept.includes(group.id);
                                  return (
                                    <label key={group.id} className="flex items-center gap-2 text-sm muted">
                                      <input
                                        type="checkbox"
                                        className="checkbox"
                                        checked={on}
                                        onChange={() =>
                                          updateRules(section.id, question.id, {
                                            accept: on
                                              ? rules.accept.filter((entry) => entry !== group.id)
                                              : [...rules.accept, group.id],
                                          })
                                        }
                                      />
                                      {group.label}
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        )}

                        {(() => {
                          const earlier = earlierQuestions(form, question.id);
                          const logic = questionLogic(question);
                          const parent = logic
                            ? form.sections
                                .flatMap((entry) => entry.questions)
                                .find((entry) => entry.id === logic.questionId)
                            : null;
                          if (earlier.length === 0) return null;

                          return (
                            <div className="flex flex-wrap items-end gap-2">
                              <label className="field" style={{ minWidth: "14rem" }}>
                                <span className="field-label">Show this question</span>
                                <select
                                  className="select"
                                  value={logic?.questionId || ""}
                                  onChange={(event) =>
                                    updateQuestion(section.id, question.id, {
                                      logic: event.target.value
                                        ? {
                                            questionId: event.target.value,
                                            operator: "is",
                                            value: "",
                                          }
                                        : null,
                                    })
                                  }
                                >
                                  <option value="">Always</option>
                                  {earlier.map((entry) => (
                                    <option key={entry.id} value={entry.id}>
                                      {entry.title || "Untitled question"}
                                    </option>
                                  ))}
                                </select>
                              </label>

                              {logic && (
                                <label className="field" style={{ minWidth: "9rem" }}>
                                  <span className="field-label">When that answer</span>
                                  <select
                                    className="select"
                                    value={logic.operator}
                                    onChange={(event) =>
                                      updateQuestion(section.id, question.id, {
                                        logic: { ...logic, operator: event.target.value },
                                      })
                                    }
                                  >
                                    {LOGIC_OPERATORS.map((operator) => (
                                      <option key={operator.id} value={operator.id}>
                                        {operator.label}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                              )}

                              {logic &&
                                logic.operator !== "answered" &&
                                logic.operator !== "empty" &&
                                ((parent?.options || []).filter((option) => option.label).length > 0 ? (
                                  <label className="field" style={{ minWidth: "10rem" }}>
                                    <span className="field-label">Value</span>
                                    <select
                                      className="select"
                                      value={logic.value}
                                      onChange={(event) =>
                                        updateQuestion(section.id, question.id, {
                                          logic: { ...logic, value: event.target.value },
                                        })
                                      }
                                    >
                                      <option value="">Choose…</option>
                                      {parent.options
                                        .filter((option) => option.label)
                                        .map((option) => (
                                          <option key={option.id} value={option.label}>
                                            {option.label}
                                          </option>
                                        ))}
                                    </select>
                                  </label>
                                ) : (
                                  <label className="field" style={{ minWidth: "10rem" }}>
                                    <span className="field-label">Value</span>
                                    <input
                                      className="input"
                                      value={logic.value}
                                      placeholder="Answer text"
                                      onChange={(event) =>
                                        updateQuestion(section.id, question.id, {
                                          logic: { ...logic, value: event.target.value },
                                        })
                                      }
                                    />
                                  </label>
                                ))}
                            </div>
                          );
                        })()}

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
                  {dragging?.type === "question" && (
                    <div
                      className="question-drop"
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => dropQuestion(event, section.id, section.questions.length)}
                    >
                      Drop at the end of this section
                    </div>
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
                    <option value="payment" disabled>
                      Payment (needs Stripe, not available)
                    </option>
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
              <div className="grid gap-3 md:grid-cols-2 border-t pt-4" style={{ borderColor: "var(--border)" }}>
                <p className="font-semibold text-sm md:col-span-2">Role details</p>
                {JOB_FIELDS.map((field) =>
                  field.rich ? (
                    <div key={field.id} className="field md:col-span-2">
                      <span className="field-label">{field.label}</span>
                      <RichTextEditor
                        label={field.label}
                        value={job[field.id]}
                        placeholder={field.placeholder}
                        minHeight="5.5rem"
                        onChange={(blocks) => updateJob(field.id, blocks)}
                      />
                    </div>
                  ) : (
                    <label key={field.id} className="field">
                      <span className="field-label">{field.label}</span>
                      <input
                        className="input"
                        type={field.type === "date" ? "date" : "text"}
                        value={job[field.id]}
                        placeholder={field.placeholder}
                        onChange={(event) => updateJob(field.id, event.target.value)}
                      />
                    </label>
                  )
                )}
                <p className="faint text-xs md:col-span-2">
                  Shown on the role card and the application page. Responsibilities and requirements
                  keep every line break and blank line you type, and highlighted text can be bold,
                  underlined or resized. Leave a field blank to hide it.
                </p>
              </div>

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
