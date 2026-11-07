import { kvGet } from "@/lib/kv";

const CONTENT_FORM_KEY = "content:form";

const DEFAULT_FORM_CONFIG = {
  title: "Let's make something memorable.",
  description: "Want to collaborate, join the team, or simply say hello? Send a message and we'll get back to you.",
  nameLabel: "Name",
  namePlaceholder: "Your name",
  emailLabel: "Email",
  emailPlaceholder: "you@example.com",
  interestLabel: "I'm interested in",
  messageLabel: "Message",
  messagePlaceholder: "Tell us what you have in mind...",
  submitLabel: "Send message ↗",
  successMessage: "Thanks — your message has been sent.",
};

export async function getFormConfig() {
  return kvGet(CONTENT_FORM_KEY, DEFAULT_FORM_CONFIG);
}
