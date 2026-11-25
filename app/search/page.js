import Link from "next/link";
import { MIN_QUERY_LENGTH, searchSite } from "@/lib/search";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export const metadata = {
  title: "Search",
  description:
    "Search videos, announcements, stories, events and forum threads across mickeychan.in.",
  alternates: { canonical: "/search" },
  robots: { index: false, follow: true },
};

function queryOf(searchParams) {
  const value = searchParams?.q;
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0] || "";
  return "";
}

export default async function SearchPage({ searchParams }) {
  const params = await searchParams;
  const query = queryOf(params).trim();
  const ready = query.length >= MIN_QUERY_LENGTH;
  const results = ready ? await searchSite(query) : { groups: [], total: 0 };

  return (
    <main className="page">
      <div className="shell" style={{ maxWidth: "48rem" }}>
        <div className="max-w-2xl mb-7">
          <p className="kicker">Search</p>
          <h1 className="display-lg mt-3 mb-4">Find it on the site.</h1>
          <p className="muted text-lg leading-relaxed">
            One box for videos, announcements, stories, events, forum threads and pages.
          </p>
        </div>

        <form action="/search" method="get" role="search" className="flex flex-wrap items-end gap-2">
          <label className="field flex-1" style={{ minWidth: "14rem" }}>
            <span className="field-label">Word or phrase</span>
            <input
              className="input"
              type="search"
              name="q"
              defaultValue={query}
              placeholder="A video title, a notice, a thread"
              autoComplete="off"
            />
          </label>
          <button type="submit" className="btn btn-primary">
            Search
          </button>
        </form>

        {!ready ? (
          <p className="muted text-sm mt-6">
            Type at least {MIN_QUERY_LENGTH} characters and press Search. Every word has to appear
            somewhere in the result, and titles rank above body text.
          </p>
        ) : results.total === 0 ? (
          <div className="empty-state mt-8">
            <p className="font-display text-lg font-bold">Nothing matched "{query}"</p>
            <p className="muted text-sm max-w-md">
              Try a shorter word, or check the videos and announcements pages directly. Past
              announcements and wrapped story arcs stay searchable.
            </p>
            <Link href="/sitemap" className="btn btn-secondary btn-sm mt-2">
              Browse the sitemap
            </Link>
          </div>
        ) : (
          <>
            <p className="faint text-xs mt-6">
              {results.total} {results.total === 1 ? "result" : "results"} for "{query}"
            </p>

            {results.groups.map((group) => (
              <section key={group.id} className="mt-7" aria-label={group.label}>
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-display text-lg font-bold">{group.label}</h2>
                  <span className="faint text-xs">{group.items.length}</span>
                </div>
                <div className="grid gap-2 mt-3">
                  {group.items.map((item) => (
                    <Link
                      key={`${group.id}-${item.href}-${item.title}`}
                      href={item.href}
                      className="glass-card lift p-4 grid gap-1"
                    >
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{item.title}</span>
                        {item.meta && <span className="badge badge-neutral">{item.meta}</span>}
                      </span>
                      {item.excerpt && <span className="muted text-sm">{item.excerpt}</span>}
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </>
        )}
      </div>
    </main>
  );
}
