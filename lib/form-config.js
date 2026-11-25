import { kvGet } from "@/lib/kv";
import { DEFAULT_FORM_CONFIG } from "@/lib/form-defaults";

const CONTENT_FORM_KEY = "content:form";

// A config saved to KV before the copy pass would keep showing the old wording.
// Anything still matching the retired text is treated as untouched; edited text stays.
const RETIRED_TEXT = {
  title: "Let's make something memorable.",
  description:
    "Want to collaborate, join the team, or simply say hello? Send a message and we'll get back to you.",
  successMessage: "Thanks \u2014 your message has been sent.",
};

export async function getFormConfig() {
  const stored = await kvGet(CONTENT_FORM_KEY, {});
  const config = { ...DEFAULT_FORM_CONFIG, ...(stored || {}) };
  for (const key of Object.keys(RETIRED_TEXT)) {
    if (config[key] === RETIRED_TEXT[key]) config[key] = DEFAULT_FORM_CONFIG[key];
  }
  return config;
}
