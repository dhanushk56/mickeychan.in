// Shared by the /api/form response and the form itself, so the two cannot drift.
export const DEFAULT_FORM_CONFIG = {
  title: "Send the team a note.",
  description:
    "A collab, a role on the team, or a question about the site. Write it below and the team reads it.",
  nameLabel: "Name",
  namePlaceholder: "Your name",
  emailLabel: "Email",
  emailPlaceholder: "you@example.com",
  interestLabel: "I'm interested in",
  messageLabel: "Message",
  messagePlaceholder: "Tell us what you have in mind...",
  submitLabel: "Send message ↗",
  successMessage: "Thanks, your message has been sent.",
};
