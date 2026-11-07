// Shared schema definitions used by both the builder (edit mode) and the
// public renderer (fill mode / apply page), so they can never drift apart.

export const QUESTION_TYPES = [
  { id: "short_answer", label: "Short answer", hasOptions: false, hasScale: false },
  { id: "paragraph", label: "Paragraph", hasOptions: false, hasScale: false },
  { id: "multiple_choice", label: "Multiple choice", hasOptions: true, hasScale: false },
  { id: "checkboxes", label: "Checkboxes", hasOptions: true, hasScale: false },
  { id: "dropdown", label: "Dropdown", hasOptions: true, hasScale: false },
  { id: "linear_scale", label: "Linear scale", hasOptions: false, hasScale: true },
  { id: "date", label: "Date", hasOptions: false, hasScale: false },
  { id: "time", label: "Time", hasOptions: false, hasScale: false },
  { id: "file_upload", label: "File upload (link only)", hasOptions: false, hasScale: false },
];

export function typeMeta(typeId) {
  return QUESTION_TYPES.find((t) => t.id === typeId) || QUESTION_TYPES[0];
}

function uid(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createQuestion(typeId = "short_answer") {
  const meta = typeMeta(typeId);
  return {
    id: uid("q"),
    type: meta.id,
    title: "",
    description: "",
    required: false,
    options: meta.hasOptions ? [{ id: uid("opt"), label: "Option 1" }] : [],
    scale: meta.hasScale ? { min: 1, max: 5, minLabel: "", maxLabel: "" } : null,
  };
}

export function createSection(title = "Section") {
  return {
    id: uid("sec"),
    title,
    description: "",
    questions: [createQuestion("short_answer")],
  };
}

export function emptyForm() {
  return {
    title: "Untitled form",
    description: "",
    submitLabel: "Submit",
    successMessage: "Thanks — your response has been recorded.",
    // Hours a rejected applicant has to wait before reapplying (0 = instantly).
    settings: { cooldownHours: 0 },
    sections: [createSection("Section 1")],
  };
}

// Basic client-side validation mirrored on the server before a submission is stored.
export function validateResponses(form, responses) {
  const errors = {};
  for (const section of form.sections || []) {
    for (const q of section.questions || []) {
      if (!q.required) continue;
      const value = responses[q.id];
      const empty =
        value === undefined ||
        value === null ||
        value === "" ||
        (Array.isArray(value) && value.length === 0);
      if (empty) errors[q.id] = "This question is required.";
    }
  }
  return errors;
}
