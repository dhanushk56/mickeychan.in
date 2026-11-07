"use client";

import { useState } from "react";
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
  const [form, setForm] = useState(initialForm);
  const [tab, setTab] = useState("edit");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);

  function updateForm(patch) {
    setForm((f) => ({ ...f, ...patch }));
  }

  function updateSection(sectionId, patch) {
    setForm((f) => withSection(f, sectionId, (s) => ({ ...s, ...patch })));
  }

  function addSection() {
    setForm((f) => ({ ...f, sections: [...f.sections, createSection(`Section ${f.sections.length + 1}`)] }));
  }

  function duplicateSection(sectionId) {
    setForm((f) => {
      const index = f.sections.findIndex((s) => s.id === sectionId);
      if (index === -1) return f;
      const copy = { ...f.sections[index], id: uid("sec"), questions: f.sections[index].questions.map((q) => ({ ...q, id: uid("q") })) };
      const next = [...f.sections];
      next.splice(index + 1, 0, copy);
      return { ...f, sections: next };
    });
  }

  function deleteSection(sectionId) {
    setForm((f) => (f.sections.length <= 1 ? f : { ...f, sections: f.sections.filter((s) => s.id !== sectionId) }));
  }

  function moveSection(sectionId, direction) {
    setForm((f) => {
      const index = f.sections.findIndex((s) => s.id === sectionId);
      return { ...f, sections: moveInArray(f.sections, index, direction) };
    });
  }

  function addQuestion(sectionId, type) {
    setForm((f) => withSection(f, sectionId, (s) => ({ ...s, questions: [...s.questions, createQuestion(type)] })));
  }

  function duplicateQuestion(sectionId, questionId) {
    setForm((f) =>
      withSection(f, sectionId, (s) => {
        const index = s.questions.findIndex((q) => q.id === questionId);
        if (index === -1) return s;
        const copy = { ...s.questions[index], id: uid("q"), options: s.questions[index].options.map((o) => ({ ...o, id: uid("opt") })) };
        const next = [...s.questions];
        next.splice(index + 1, 0, copy);
        return { ...s, questions: next };
      })
    );
  }

  function deleteQuestion(sectionId, questionId) {
    setForm((f) => withSection(f, sectionId, (s) => ({ ...s, questions: s.questions.filter((q) => q.id !== questionId) })));
  }

  function moveQuestion(sectionId, questionId, direction) {
    setForm((f) =>
      withSection(f, sectionId, (s) => {
        const index = s.questions.findIndex((q) => q.id === questionId);
        return { ...s, questions: moveInArray(s.questions, index, direction) };
      })
    );
  }

  function updateQuestion(sectionId, questionId, patch) {
    setForm((f) => withSection(f, sectionId, (s) => withQuestion(s, questionId, (q) => ({ ...q, ...patch }))));
  }

  function changeQuestionType(sectionId, questionId, newType) {
    setForm((f) =>
      withSection(f, sectionId, (s) =>
        withQuestion(s, questionId, (q) => {
          const meta = typeMeta(newType);
          return {
            ...q,
            type: newType,
            options: meta.hasOptions ? (q.options.length ? q.options : [{ id: uid("opt"), label: "Option 1" }]) : [],
            scale: meta.hasScale ? q.scale || { min: 1, max: 5, minLabel: "", maxLabel: "" } : null,
          };
        })
      )
    );
  }

  function addOption(sectionId, questionId) {
    setForm((f) =>
      withSection(f, sectionId, (s) =>
        withQuestion(s, questionId, (q) => ({ ...q, options: [...q.options, { id: uid("opt"), label: `Option ${q.options.length + 1}` }] }))
      )
    );
  }

  function updateOption(sectionId, questionId, optionId, label) {
    setForm((f) =>
      withSection(f, sectionId, (s) =>
        withQuestion(s, questionId, (q) => ({ ...q, options: q.options.map((o) => (o.id === optionId ? { ...o, label } : o)) }))
      )
    );
  }

  function removeOption(sectionId, questionId, optionId) {
    setForm((f) =>
      withSection(f, sectionId, (s) =>
        withQuestion(s, questionId, (q) => ({ ...q, options: q.options.filter((o) => o.id !== optionId) }))
      )
    );
  }

  function updateScale(sectionId, questionId, patch) {
    setForm((f) =>
      withSection(f, sectionId, (s) => withQuestion(s, questionId, (q) => ({ ...q, scale: { ...q.scale, ...patch } })))
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
      setStatus("Saved.");
    } catch (error) {
      setStatus(error.message);
    } finally {
      setSaving(false);
      setTimeout(() => setStatus(""), 3000);
    }
  }

  function copyLink() {
    navigator.clipboard?.writeText(publicUrl).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  }

  return (
    <div className="px-6 md:px-16 py-10 md:py-14">
      <div className="max-w-4xl mx-auto">
        {/* Header bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <a href="/form-builder" className="text-xs text-black/40 dark:text-white/40 hover:text-[#be185d]">
              ← All forms
            </a>
            <p className="section-kicker mt-2">Form builder</p>
            <h1 className="font-display text-2xl md:text-3xl font-bold mt-1">Applications</h1>
          </div>
          <div className="flex items-center gap-3">
            {currentUser && <span className="text-xs text-black/40 dark:text-white/40">Signed in as {currentUser.username}</span>}
            <a href="/api/auth/discord/logout" className="text-xs text-black/40 dark:text-white/40 hover:text-[#be185d]">
              Sign out
            </a>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-8 border-b border-black/10 dark:border-white/10">
          {["edit", "preview"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-semibold capitalize border-b-2 -mb-px transition-colors ${
                tab === t ? "border-[#be185d] text-[#be185d]" : "border-transparent text-black/50 dark:text-white/50"
              }`}
            >
              {t}
            </button>
          ))}
          <div className="flex-1" />
          <button onClick={copyLink} className="text-xs text-black/40 dark:text-white/40 hover:text-[#be185d] mb-2">
            {linkCopied ? "Copied!" : "Copy public link"}
          </button>
        </div>

        {tab === "preview" ? (
          <FormRenderer form={form} mode="preview" />
        ) : (
          <div className="grid gap-6">
            {/* Form header card */}
            <div className="glass-card rounded-2xl p-6 border-t-4" style={{ borderTopColor: "#be185d" }}>
              <input
                className="form-input form-input-lg font-display text-2xl font-bold mb-3"
                value={form.title}
                onChange={(e) => updateForm({ title: e.target.value })}
                placeholder="Form title"
              />
              <textarea
                className="form-input resize-y"
                rows={2}
                value={form.description}
                onChange={(e) => updateForm({ description: e.target.value })}
                placeholder="Form description (optional)"
              />
            </div>

            {form.sections.map((section, sIndex) => (
              <div key={section.id} className="glass-card rounded-2xl p-6 grid gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 grid gap-2">
                    <input
                      className="form-input font-semibold"
                      value={section.title}
                      onChange={(e) => updateSection(section.id, { title: e.target.value })}
                      placeholder="Section title"
                    />
                    <input
                      className="form-input text-sm"
                      value={section.description}
                      onChange={(e) => updateSection(section.id, { description: e.target.value })}
                      placeholder="Section description (optional)"
                    />
                  </div>
                  <div className="flex flex-col gap-1 pt-1">
                    <button title="Move section up" onClick={() => moveSection(section.id, -1)} disabled={sIndex === 0} className="text-xs px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30">↑</button>
                    <button title="Move section down" onClick={() => moveSection(section.id, 1)} disabled={sIndex === form.sections.length - 1} className="text-xs px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30">↓</button>
                  </div>
                </div>

                <div className="grid gap-4">
                  {section.questions.map((question, qIndex) => {
                    const meta = typeMeta(question.type);
                    return (
                      <div key={question.id} className="rounded-xl border border-black/10 dark:border-white/10 p-4 grid gap-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <input
                            className="form-input flex-1 min-w-[160px]"
                            value={question.title}
                            onChange={(e) => updateQuestion(section.id, question.id, { title: e.target.value })}
                            placeholder="Question"
                          />
                          <select
                            className="form-input w-auto"
                            value={question.type}
                            onChange={(e) => changeQuestionType(section.id, question.id, e.target.value)}
                          >
                            {QUESTION_TYPES.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <input
                          className="form-input text-sm"
                          value={question.description}
                          onChange={(e) => updateQuestion(section.id, question.id, { description: e.target.value })}
                          placeholder="Help text (optional)"
                        />

                        {meta.hasOptions && (
                          <div className="grid gap-2 pl-1">
                            {question.options.map((opt) => (
                              <div key={opt.id} className="flex items-center gap-2">
                                <span className="text-black/30 dark:text-white/30 text-xs w-4">
                                  {question.type === "checkboxes" ? "☐" : "○"}
                                </span>
                                <input
                                  className="form-input flex-1"
                                  value={opt.label}
                                  onChange={(e) => updateOption(section.id, question.id, opt.id, e.target.value)}
                                />
                                <button
                                  onClick={() => removeOption(section.id, question.id, opt.id)}
                                  disabled={question.options.length <= 1}
                                  className="text-black/30 dark:text-white/30 hover:text-[#be185d] disabled:opacity-30 px-2"
                                  title="Remove option"
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                            <button onClick={() => addOption(section.id, question.id)} className="text-sm text-[#be185d] text-left mt-1">
                              + Add option
                            </button>
                          </div>
                        )}

                        {meta.hasScale && (
                          <div className="flex flex-wrap items-center gap-3 text-sm">
                            <label className="flex items-center gap-2">
                              Min
                              <input
                                type="number"
                                className="form-input w-16"
                                value={question.scale.min}
                                onChange={(e) => updateScale(section.id, question.id, { min: Number(e.target.value) })}
                              />
                            </label>
                            <label className="flex items-center gap-2">
                              Max
                              <input
                                type="number"
                                className="form-input w-16"
                                value={question.scale.max}
                                onChange={(e) => updateScale(section.id, question.id, { max: Number(e.target.value) })}
                              />
                            </label>
                            <input
                              className="form-input flex-1 min-w-[100px]"
                              placeholder="Min label (optional)"
                              value={question.scale.minLabel}
                              onChange={(e) => updateScale(section.id, question.id, { minLabel: e.target.value })}
                            />
                            <input
                              className="form-input flex-1 min-w-[100px]"
                              placeholder="Max label (optional)"
                              value={question.scale.maxLabel}
                              onChange={(e) => updateScale(section.id, question.id, { maxLabel: e.target.value })}
                            />
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-black/5 dark:border-white/10">
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={question.required}
                              onChange={(e) => updateQuestion(section.id, question.id, { required: e.target.checked })}
                            />
                            Required
                          </label>
                          <div className="flex items-center gap-1">
                            <button title="Move up" onClick={() => moveQuestion(section.id, question.id, -1)} disabled={qIndex === 0} className="text-xs px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30">↑</button>
                            <button title="Move down" onClick={() => moveQuestion(section.id, question.id, 1)} disabled={qIndex === section.questions.length - 1} className="text-xs px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30">↓</button>
                            <button title="Duplicate" onClick={() => duplicateQuestion(section.id, question.id)} className="text-xs px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/10">⧉</button>
                            <button title="Delete" onClick={() => deleteQuestion(section.id, question.id)} className="text-xs px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/10 text-[#be185d]">🗑</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {section.questions.length === 0 && (
                    <p className="text-sm text-black/40 dark:text-white/40 text-center py-4">No questions in this section yet.</p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <select
                    className="form-input w-auto text-sm"
                    onChange={(e) => {
                      if (e.target.value) addQuestion(section.id, e.target.value);
                      e.target.value = "";
                    }}
                    defaultValue=""
                  >
                    <option value="" disabled>
                      + Add question…
                    </option>
                    {QUESTION_TYPES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <button onClick={() => duplicateSection(section.id)} className="text-sm text-black/50 dark:text-white/50">
                    Duplicate section
                  </button>
                  <button
                    onClick={() => deleteSection(section.id)}
                    disabled={form.sections.length <= 1}
                    className="text-sm text-[#be185d] disabled:opacity-30"
                  >
                    Delete section
                  </button>
                </div>
              </div>
            ))}

            <button onClick={addSection} className="btn-secondary self-start">
              + Add section
            </button>

            <div className="glass-card rounded-2xl p-6 grid gap-3">
              <p className="text-sm font-semibold">Submission settings</p>
              <label className="grid gap-1 text-sm">
                Submit button label
                <input className="form-input" value={form.submitLabel} onChange={(e) => updateForm({ submitLabel: e.target.value })} />
              </label>
              <label className="grid gap-1 text-sm">
                Success message
                <input className="form-input" value={form.successMessage} onChange={(e) => updateForm({ successMessage: e.target.value })} />
              </label>
            </div>
          </div>
        )}

        <div className="flex items-center gap-4 mt-8 sticky bottom-6">
          <button onClick={save} disabled={saving} className="btn-primary disabled:opacity-60">
            {saving ? "Saving…" : "Save form"}
          </button>
          {status && <span className="text-sm text-black/50 dark:text-white/50">{status}</span>}
        </div>
      </div>
    </div>
  );
}
