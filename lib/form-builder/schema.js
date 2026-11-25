// One definition of every question type, its rules and its validation, shared by
// the builder, the public form and the API. If the site accepts an answer, the
// server checks it with exactly the same function.

export const QUESTION_TYPES = [
  { id: "short_answer", label: "Short answer", kind: "text", hasOptions: false },
  { id: "paragraph", label: "Paragraph", kind: "text", hasOptions: false },
  { id: "email", label: "Email", kind: "email", hasOptions: false },
  { id: "url", label: "Website", kind: "url", hasOptions: false },
  { id: "phone", label: "Phone", kind: "phone", hasOptions: false },
  { id: "number", label: "Number", kind: "number", hasOptions: false },
  { id: "multiple_choice", label: "Multiple choice", kind: "choice", hasOptions: true },
  { id: "checkboxes", label: "Checkboxes", kind: "choice", hasOptions: true },
  { id: "dropdown", label: "Dropdown", kind: "choice", hasOptions: true },
  { id: "multi_select", label: "Multi-select", kind: "choice", hasOptions: true },
  { id: "linear_scale", label: "Linear scale", kind: "scale", hasOptions: false },
  { id: "rating", label: "Rating", kind: "rating", hasOptions: false },
  { id: "date", label: "Date", kind: "date", hasOptions: false },
  { id: "time", label: "Time", kind: "time", hasOptions: false },
  { id: "ranking", label: "Ranking", kind: "ranking", hasOptions: true },
  { id: "matrix", label: "Matrix", kind: "matrix", hasOptions: true },
  { id: "signature", label: "Signature", kind: "signature", hasOptions: false },
  { id: "file_upload", label: "File upload", kind: "file", hasOptions: false },
];

// Uploads are kept with the response, so they stay small on purpose. The KV
// value also holds the base64 form, which is why the ceiling is in this range.
export const MAX_UPLOAD_BYTES = 500 * 1024;

export const LOGIC_OPERATORS = [
  { id: "is", label: "is" },
  { id: "is_not", label: "is not" },
  { id: "answered", label: "is answered" },
  { id: "empty", label: "is left empty" },
];

export function typeMeta(typeId) {
  return QUESTION_TYPES.find((type) => type.id === typeId) || QUESTION_TYPES[0];
}

const SINGLE_CHOICE = new Set(["multiple_choice", "dropdown"]);

// File answers are links, not uploads: the site stores no files of its own, so
// there is no size ceiling and nothing to clean up. Formats are checked from the
// end of the link when the link names a file.
export const ACCEPT_GROUPS = [
  {
    id: "image",
    label: "Images (JPG, PNG, GIF, WebP)",
    extensions: [".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic"],
  },
  { id: "pdf", label: "PDF", extensions: [".pdf"] },
  { id: "text", label: "Plain text", extensions: [".txt", ".rtf", ".md"] },
  { id: "word", label: "Word documents", extensions: [".doc", ".docx", ".pages"] },
  { id: "sheet", label: "Spreadsheets", extensions: [".xls", ".xlsx", ".csv", ".numbers"] },
  { id: "zip", label: "ZIP archive", extensions: [".zip", ".rar", ".7z"] },
  { id: "any", label: "Any file", extensions: [] },
];

function uid(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function defaultRules(typeId) {
  const meta = typeMeta(typeId);
  const base = {
    minChars: null,
    maxChars: null,
    min: null,
    max: null,
    minSelections: null,
    maxSelections: null,
    minDate: "",
    maxDate: "",
    ratingMax: 5,
    accept: ["image", "pdf"],
  };
  if (meta.id === "short_answer") base.maxChars = 200;
  if (meta.id === "paragraph") base.maxChars = 3000;
  if (meta.kind === "choice") {
    base.maxSelections = SINGLE_CHOICE.has(meta.id) ? 1 : 2;
    base.minSelections = null;
  }
  return base;
}

// Stored forms keep working when a rule is missing or has drifted, so every read
// goes through this instead of trusting the record.
export function questionRules(question) {
  const meta = typeMeta(question?.type);
  const base = defaultRules(meta.id);
  const stored = question?.rules && typeof question.rules === "object" ? question.rules : {};

  const number = (value, fallback) => {
    if (value === null || value === undefined || value === "") return fallback;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const positive = (value, fallback, cap) => {
    const parsed = number(value, fallback);
    return parsed === null ? null : Math.min(Math.max(parsed, 0), cap);
  };

  const accept = Array.isArray(stored.accept) && stored.accept.length > 0
    ? stored.accept.filter((entry) => ACCEPT_GROUPS.some((group) => group.id === entry))
    : base.accept;

  return {
    minChars: positive(stored.minChars, base.minChars, 20000),
    maxChars: positive(stored.maxChars, base.maxChars, 20000),
    min: number(stored.min, base.min),
    max: number(stored.max, base.max),
    minSelections: positive(stored.minSelections, base.minSelections, 50),
    maxSelections: positive(stored.maxSelections, base.maxSelections, 50),
    minDate: typeof stored.minDate === "string" ? stored.minDate.slice(0, 10) : "",
    maxDate: typeof stored.maxDate === "string" ? stored.maxDate.slice(0, 10) : "",
    ratingMax: Math.min(Math.max(number(stored.ratingMax, base.ratingMax), 3), 10),
    accept: accept.length > 0 ? accept : base.accept,
  };
}

export function createQuestion(typeId = "short_answer") {
  const meta = typeMeta(typeId);
  const options = meta.hasOptions
    ? (meta.id === "matrix"
        ? ["Column 1", "Column 2"].map((label) => ({ id: uid("opt"), label }))
        : [{ id: uid("opt"), label: "Option 1" }])
    : [];
  return {
    id: uid("q"),
    type: meta.id,
    title: "",
    description: "",
    required: false,
    options,
    rows:
      meta.id === "matrix"
        ? ["Row 1", "Row 2"].map((label) => ({ id: uid("row"), label }))
        : [],
    scale: meta.kind === "scale" ? { min: 1, max: 5, minLabel: "", maxLabel: "" } : null,
    rules: defaultRules(meta.id),
    // Optional condition: show this question only when an earlier answer matches.
    logic: null,
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
    successMessage: "Thanks, your response has been recorded.",
    settings: { cooldownHours: 0 },
    sections: [createSection("Section 1")],
  };
}

export function isReadyForm(form) {
  return (form?.sections || []).some((section) =>
    (section.questions || []).some((question) => String(question.title || "").trim())
  );
}

function isEmptyValue(value) {
  return (
    value === undefined ||
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  );
}

function lengthOf(value) {
  return [...String(value ?? "").trim()].length;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE = /^[+()\d][\d\s()+.-]{5,19}$/;

function extensionOf(name) {
  return String(name || "").toLowerCase().match(/\.[a-z0-9]{1,8}$/)?.[0] || "";
}

function extensionProblem(rules, extension) {
  if (!extension) return "";
  const accepted = ACCEPT_GROUPS.filter((group) => rules.accept.includes(group.id));
  if (accepted.length === 0 || accepted.some((group) => group.id === "any")) return "";
  const allowed = accepted.flatMap((group) => group.extensions);
  return allowed.includes(extension) ? "" : `${extension} files aren't accepted here.`;
}

function linkFileProblem(rules, value) {
  let url;
  try {
    url = new URL(String(value ?? "").trim());
  } catch {
    url = null;
  }
  if (!url || !/^https?:$/.test(url.protocol)) {
    return "Paste a full link, starting with http or https.";
  }

  // A link without a file extension cannot be judged by its name, so the format
  // rules apply only where the link actually names a file.
  return extensionProblem(rules, extensionOf(url.pathname));
}

function uploadFileProblem(rules, value) {
  if (typeof value.id !== "string" || value.id.length < 4) return "Upload that file again.";
  if (Number(value.size) > MAX_UPLOAD_BYTES) {
    return `Keep uploads under ${Math.round(MAX_UPLOAD_BYTES / 1024)} KB.`;
  }
  return extensionProblem(rules, extensionOf(value.name));
}

// Returns the accepted extensions for a file input, or "" when anything goes.
export function acceptAttribute(question) {
  const rules = questionRules(question);
  const groups = ACCEPT_GROUPS.filter((group) => rules.accept.includes(group.id));
  if (groups.length === 0 || groups.some((group) => group.id === "any")) return "";
  return groups.flatMap((group) => group.extensions).join(",");
}

// A question can depend on an earlier answer. The condition is stored on the
// question and checked the same way in the builder, the form and the API.
export function questionLogic(question) {
  const logic = question?.logic;
  if (!logic || typeof logic !== "object") return null;
  const questionId = typeof logic.questionId === "string" ? logic.questionId.slice(0, 40) : "";
  if (!questionId) return null;
  return {
    questionId,
    operator: LOGIC_OPERATORS.some((entry) => entry.id === logic.operator) ? logic.operator : "is",
    value: String(logic.value ?? "").slice(0, 200),
  };
}

export function questionIsVisible(question, responses = {}, allQuestions = [], depth = 0) {
  if (depth > 8) return true;
  const logic = questionLogic(question);
  if (!logic) return true;
  const parent = (allQuestions || []).find((entry) => entry.id === logic.questionId);
  // A deleted parent leaves the question visible instead of hiding it forever.
  if (!parent) return true;
  if (!questionIsVisible(parent, responses, allQuestions, depth + 1)) return false;

  const answer = responses?.[logic.questionId];
  if (logic.operator === "answered") return !isEmptyValue(answer);
  if (logic.operator === "empty") return isEmptyValue(answer);

  const expected = logic.value.trim().toLowerCase();
  if (!expected) return true;
  const actual = Array.isArray(answer)
    ? answer.map((entry) => String(entry).toLowerCase())
    : answer && typeof answer === "object"
      ? Object.values(answer).map((entry) => String(entry).toLowerCase())
      : [String(answer ?? "").trim().toLowerCase()];
  const hit = actual.includes(expected);
  return logic.operator === "is_not" ? !hit : hit;
}

export function visibleQuestions(questions, responses, allQuestions) {
  return (questions || []).filter((question) =>
    questionIsVisible(question, responses, allQuestions)
  );
}

// Returns a message for one answered question, or an empty string.
function answerProblem(question, value) {
  const meta = typeMeta(question?.type);
  const rules = questionRules(question);

  if (meta.kind === "text" || meta.kind === "email" || meta.kind === "url") {
    const text = String(value ?? "").trim();
    const length = lengthOf(text);
    if (meta.kind === "email" && !EMAIL.test(text)) return "Enter a valid email address.";
    if (meta.kind === "url") {
      try {
        const parsed = new URL(text);
        if (!/^https?:$/.test(parsed.protocol)) return "Use a link that starts with http or https.";
      } catch {
        return "Enter a full web address.";
      }
    }
    if (rules.minChars != null && length < rules.minChars) {
      return `Use at least ${rules.minChars} characters.`;
    }
    if (rules.maxChars != null && length > rules.maxChars) {
      return `Keep it to ${rules.maxChars} characters or fewer.`;
    }
    return "";
  }

  if (meta.kind === "phone") {
    const text = String(value ?? "").trim();
    if (!PHONE.test(text)) return "Enter a phone number.";
    return "";
  }

  if (meta.kind === "number") {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return "Enter a number.";
    if (rules.min != null && parsed < rules.min) return `${rules.min} is the lowest allowed.`;
    if (rules.max != null && parsed > rules.max) return `${rules.max} is the highest allowed.`;
    return "";
  }

  if (meta.kind === "choice") {
    const labels = (question.options || []).map((option) => option.label);
    if (SINGLE_CHOICE.has(meta.id)) {
      if (!labels.includes(value)) return "Pick one of the options.";
      return "";
    }
    const picks = Array.isArray(value) ? value : [];
    const unknown = picks.find((pick) => !labels.includes(pick));
    if (unknown) return "One of those choices is no longer on the list.";
    if (rules.minSelections != null && picks.length < rules.minSelections) {
      return `Choose at least ${rules.minSelections}.`;
    }
    if (rules.maxSelections != null && picks.length > rules.maxSelections) {
      return `Choose no more than ${rules.maxSelections}.`;
    }
    return "";
  }

  if (meta.kind === "scale") {
    const scale = question.scale || { min: 1, max: 5 };
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < scale.min || parsed > scale.max) {
      return `Pick a number from ${scale.min} to ${scale.max}.`;
    }
    return "";
  }

  if (meta.kind === "rating") {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > rules.ratingMax) {
      return `Pick a rating from 1 to ${rules.ratingMax}.`;
    }
    return "";
  }

  if (meta.kind === "date") {
    const text = String(value ?? "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return "Pick a date.";
    if (rules.minDate && text < rules.minDate) return `Pick a date on or after ${rules.minDate}.`;
    if (rules.maxDate && text > rules.maxDate) return `Pick a date on or before ${rules.maxDate}.`;
    return "";
  }

  if (meta.kind === "time") {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(value ?? ""))) return "Pick a time.";
    return "";
  }

  if (meta.kind === "ranking") {
    const labels = (question.options || []).map((option) => option.label).filter(Boolean);
    const picks = Array.isArray(value) ? value : [];
    const complete =
      picks.length === labels.length &&
      new Set(picks).size === labels.length &&
      picks.every((pick) => labels.includes(pick));
    return complete ? "" : "Put every option in order.";
  }

  if (meta.kind === "matrix") {
    const columns = (question.options || []).map((option) => option.label).filter(Boolean);
    const rows = (question.rows || []).map((row) => row.label).filter(Boolean);
    const answers = value && typeof value === "object" ? value : {};
    const unknown = rows.find((row) => answers[row] && !columns.includes(answers[row]));
    if (unknown) return "Pick one of the columns.";
    const missing = rows.find((row) => !answers[row]);
    if (missing) return question.required ? "Answer every row." : "";
    return "";
  }

  if (meta.kind === "signature") {
    const path = value?.path;
    if (typeof path !== "string" || path.length < 12) return "Draw your signature first.";
    return "";
  }

  if (meta.kind === "file") {
    if (value && typeof value === "object" && value.kind === "upload") {
      return uploadFileProblem(rules, value);
    }
    return linkFileProblem(rules, value);
  }

  return "";
}

function validateQuestions(questions, responses, allQuestions = questions) {
  const answers = responses && typeof responses === "object" ? responses : {};
  const errors = {};
  for (const question of questions || []) {
    // A question that is hidden by its condition cannot block the form.
    if (!questionIsVisible(question, answers, allQuestions)) continue;
    const value = answers[question.id];
    const message = isEmptyValue(value)
      ? question.required
        ? "This question is required."
        : ""
      : answerProblem(question, value);
    if (message) errors[question.id] = message;
  }
  return errors;
}

export function validateResponses(form, responses) {
  const errors = {};
  const allQuestions = (form.sections || []).flatMap((section) => section.questions || []);
  for (const section of form.sections || []) {
    Object.assign(errors, validateQuestions(section.questions, responses, allQuestions));
  }
  return errors;
}

export function validateSection(section, responses, allQuestions = section?.questions) {
  return validateQuestions(section?.questions, responses, allQuestions);
}

// The small line under a field that tells people the rules before they type.
export function questionHint(question) {
  const meta = typeMeta(question?.type);
  const rules = questionRules(question);
  const parts = [];

  if (meta.kind === "text" || meta.kind === "email" || meta.kind === "url") {
    if (rules.minChars != null && rules.maxChars != null) {
      parts.push(`${rules.minChars} to ${rules.maxChars} characters`);
    } else if (rules.minChars != null) {
      parts.push(`At least ${rules.minChars} characters`);
    } else if (rules.maxChars != null) {
      parts.push(`Up to ${rules.maxChars} characters`);
    }
  }
  if (meta.kind === "number") {
    if (rules.min != null && rules.max != null) parts.push(`Between ${rules.min} and ${rules.max}`);
    else if (rules.min != null) parts.push(`${rules.min} or more`);
    else if (rules.max != null) parts.push(`${rules.max} or less`);
  }
  if (meta.kind === "choice" && !SINGLE_CHOICE.has(meta.id)) {
    if (rules.minSelections != null && rules.maxSelections != null) {
      parts.push(`Pick ${rules.minSelections} to ${rules.maxSelections}`);
    } else if (rules.minSelections != null) {
      parts.push(`Pick at least ${rules.minSelections}`);
    } else if (rules.maxSelections != null) {
      parts.push(`Pick up to ${rules.maxSelections}`);
    }
  }
  if (meta.kind === "date" && rules.minDate && rules.maxDate) {
    parts.push(`Between ${rules.minDate} and ${rules.maxDate}`);
  } else if (meta.kind === "date" && rules.minDate) {
    parts.push(`On or after ${rules.minDate}`);
  } else if (meta.kind === "date" && rules.maxDate) {
    parts.push(`On or before ${rules.maxDate}`);
  }
  if (meta.kind === "ranking") parts.push("Put every option in order");
  if (meta.kind === "matrix") parts.push("One answer per row");
  if (meta.kind === "signature") parts.push("Draw with a mouse, pen or finger");

  if (meta.kind === "file") {
    const formats = ACCEPT_GROUPS.filter((group) => rules.accept.includes(group.id))
      .map((group) => group.label.replace(/ \(.*\)$/, ""))
      .join(", ");
    parts.push(
      `Upload up to ${Math.round(MAX_UPLOAD_BYTES / 1024)} KB or paste a link, ${(
        formats || "any file"
      ).toLowerCase()}`
    );
  }
  return parts.join(" · ");
}
