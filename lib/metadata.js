// Pages that define their own title and description do not inherit the root
// openGraph block, so a shared link used to show the site name for every page.
// This builds the Open Graph and Twitter fields from the page's own words.

const IMAGE = {
  url: "/mickey-logo.png",
  width: 88,
  height: 88,
  alt: "Mickey Chan",
};

export function socialMeta({ title, description, path, type = "website" }) {
  return {
    openGraph: {
      title,
      description,
      url: path,
      type,
      siteName: "Mickey Chan",
      images: [IMAGE],
    },
    twitter: {
      card: "summary",
      title,
      description,
      images: [IMAGE.url],
    },
  };
}
