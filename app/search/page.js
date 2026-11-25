import { MIN_QUERY_LENGTH, searchSite } from "@/lib/search";
import SearchPanel from "@/components/SearchPanel";

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

        <SearchPanel query={query} ready={ready} results={results} minLength={MIN_QUERY_LENGTH} />
      </div>
    </main>
  );
}
