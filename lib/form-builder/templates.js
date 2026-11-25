import { createQuestion, createSection } from "@/lib/form-builder/schema";

function question(type, title, patch = {}) {
  return { ...createQuestion(type), title, ...patch };
}

function options(labels) {
  return labels.map((label, index) => ({ id: `opt_${index}_${Math.random().toString(36).slice(2, 8)}`, label }));
}

function section(title, description, questions) {
  return { ...createSection(title), description: description ? [{ runs: [{ text: description }] }] : [], questions };
}

function ref(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export const FORM_TEMPLATES = [
  {
    id: "role_application",
    name: "Role application",
    description: "Name, links, availability and a work sample, with a conditional call question.",
    title: "Apply to join the team",
    build() {
      const contact = question("dropdown", "Can we contact you about a call?", {
        required: true,
        options: options(["Yes", "No"]),
      });
      const days = question("checkboxes", "Which days suit a call?", {
        options: options(["Weekday evening", "Weekend morning", "Weekend evening"]),
        rules: { maxSelections: 3 },
        logic: { questionId: contact.id, operator: "is", value: "Yes" },
      });

      return [
        section("About you", "The basics, so the team can reach you.", [
          question("short_answer", "Name", { required: true }),
          question("email", "Email", { required: true }),
          question("url", "Portfolio or channel link", { required: true }),
          question("short_answer", "Timezone", { placeholder: "" }),
        ]),
        section("The role", "Tell the team what you would bring.", [
          question("paragraph", "Why this role?", { required: true }),
          question("paragraph", "What have you made before?"),
          question("dropdown", "Hours you can give each week", {
            required: true,
            options: options([
              "Under 5 hours",
              "5 to 10 hours",
              "10 to 20 hours",
              "More than 20 hours",
            ]),
          }),
          question("file_upload", "Work sample"),
        ]),
        section("Next step", "How the team should follow up.", [contact, days]),
      ];
    },
  },
  {
    id: "collab_pitch",
    name: "Collaboration pitch",
    description: "Who you are, what you want to make, and when it could happen.",
    title: "Pitch a collaboration",
    build() {
      return [
        section("Who you are", "", [
          question("short_answer", "Name", { required: true }),
          question("email", "Email", { required: true }),
          question("url", "Channel or portfolio link", { required: true }),
        ]),
        section("The idea", "The part that matters. Take your time.", [
          question("paragraph", "What do you want to make together?", { required: true }),
          question("paragraph", "What would each side bring?"),
          question("dropdown", "Audience size", {
            options: options(["Under 1,000", "1,000 to 10,000", "10,000 to 100,000", "Over 100,000"]),
          }),
          question("date", "Earliest start date"),
        ]),
        section("Files", "Optional references, mood boards or samples.", [
          question("file_upload", "Reference file"),
        ]),
      ];
    },
  },
  {
    id: "feedback",
    name: "Feedback",
    description: "A short rating and two open questions, with an optional follow-up email.",
    title: "Send feedback",
    build() {
      const followUp = question("dropdown", "May we follow up by email?", {
        required: true,
        options: options(["Yes", "No"]),
      });
      const email = question("email", "Email for a reply", {
        required: true,
        logic: { questionId: followUp.id, operator: "is", value: "Yes" },
      });

      return [
        section("How it went", "", [
          question("rating", "How would you rate it?", { required: true }),
          question("paragraph", "What worked well?", { required: true }),
          question("paragraph", "What could be better?"),
        ]),
        section("Stay in touch", "", [followUp, email]),
      ];
    },
  },
];

export const FORM_TEMPLATE_OPTIONS = FORM_TEMPLATES.map(({ id, name, description }) => ({
  id,
  name,
  description,
}));

export function formFromTemplate(templateId) {
  const template = FORM_TEMPLATES.find((entry) => entry.id === templateId);
  if (!template) return null;
  return {
    title: template.title,
    description: [{ runs: [{ text: template.description }] }],
    submitLabel: "Send",
    successMessage: "Thanks. The team reads every answer.",
    settings: { cooldownHours: 0 },
    published: false,
    sections: template.build(),
  };
}

// Duplicating a form keeps its questions and conditions, but every id is fresh
// so conditions point at the copy and not at the original.
export function duplicateForm(source) {
  const idMap = new Map();
  const sections = (source?.sections || []).map((section) => {
    const questions = (section.questions || []).map((item) => {
      const id = ref("q");
      idMap.set(item.id, id);
      return {
        ...item,
        id,
        options: (item.options || []).map((option) => ({ ...option, id: ref("opt") })),
        rows: (item.rows || []).map((row) => ({ ...row, id: ref("row") })),
      };
    });
    return { ...section, id: ref("sec"), questions };
  });

  for (const section of sections) {
    for (const item of section.questions) {
      if (item.logic?.questionId) {
        item.logic = { ...item.logic, questionId: idMap.get(item.logic.questionId) || "" };
        if (!item.logic.questionId) item.logic = null;
      }
    }
  }

  return {
    title: `${source?.title || "Untitled form"} (copy)`,
    description: source?.description || [],
    submitLabel: source?.submitLabel || "Submit",
    successMessage: source?.successMessage || "Thanks, your response has been recorded.",
    settings: { ...(source?.settings || {}) },
    published: false,
    sections,
  };
}
