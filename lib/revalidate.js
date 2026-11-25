import { revalidatePath } from "next/cache";

// Pages are rendered per request, so this is not what makes content appear. It
// clears any cached copy a host or browser kept from before the change, which is
// the difference between "saved" and "live" for the person looking at both.
const PUBLIC_PATHS = {
  announcements: ["/", "/announcements", "/hub"],
  polls: ["/", "/polls", "/hub"],
  events: ["/", "/events", "/hub"],
  ideas: ["/", "/ideas", "/hub"],
  stories: ["/", "/stories", "/hub"],
  studio: ["/", "/studio"],
  home: ["/"],
  content: ["/", "/videos", "/contact", "/join", "/socials"],
  forms: ["/", "/positions", "/form-builder"],
};

export function refreshPublic(...areas) {
  const paths = new Set();
  for (const area of areas) {
    for (const path of PUBLIC_PATHS[area] || []) paths.add(path);
  }
  for (const path of paths) {
    try {
      revalidatePath(path);
    } catch {
      // Called outside a request scope: nothing cached to clear.
    }
  }
}

// Maintenance mode changes every page at once, so the whole layout is cleared.
export function refreshMaintenance() {
  try {
    revalidatePath("/", "layout");
  } catch {
    // Called outside a request scope: nothing cached to clear.
  }
}

export function refreshStory(slug) {
  if (!slug) return;
  try {
    revalidatePath(`/stories/${slug}`);
  } catch {
    // Nothing cached to clear.
  }
}

export function refreshFormApply(formId) {
  if (!formId) return;
  try {
    revalidatePath(`/form-builder/apply/${formId}`);
  } catch {
    // Nothing cached to clear.
  }
}
