import Link from "next/link";

const BASE_URL = "https://mickeychan.in";

export default function Breadcrumbs({ items = [] }) {
  if (!Array.isArray(items) || items.length === 0) return null;

  const trail = [{ label: "Home", href: "/" }, ...items];
  const structured = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      ...(item.href ? { item: `${BASE_URL}${item.href}` } : {}),
    })),
  };

  return (
    <>
      <nav aria-label="Breadcrumb" className="faint text-xs">
        <ol className="flex flex-wrap items-center gap-2">
          {trail.map((item, index) => {
            const last = index === trail.length - 1;
            return (
              <li key={`${item.label}-${index}`} className="flex items-center gap-2 min-w-0">
                {index > 0 && <span aria-hidden="true">/</span>}
                {item.href && !last ? (
                  <Link href={item.href} className="hover:underline">
                    {item.label}
                  </Link>
                ) : (
                  <span aria-current="page" className="truncate" style={{ maxWidth: "18rem" }}>
                    {item.label}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structured).replace(/</g, "\\u003c"),
        }}
      />
    </>
  );
}
