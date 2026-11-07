import { kvGet } from "@/lib/kv";

export const metadata = {
  title: "Open Positions — Mickey Chan",
  description: "Current openings to join the Mickey Chan team.",
};

export const dynamic = "force-dynamic";

export default async function PositionsPage() {
  const formsIndex = await kvGet("formbuilder:index", []);

  return (
    <main className="positions-page px-6 md:px-16 py-20 md:py-28">
      <div className="positions-shell max-w-4xl mx-auto">
        <div className="max-w-2xl mb-12">
          <p className="section-kicker">Join the team</p>
          <h1 className="font-display text-4xl md:text-6xl font-bold mt-3 mb-5">
            Open Positions
          </h1>
          <p className="text-lg text-black/60 dark:text-white/60 leading-relaxed">
            Roles we're currently looking to fill. Don't see a fit? Reach out on the join page anyway.
          </p>
        </div>

        {formsIndex.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-black/60 dark:text-white/60">
            No open positions for now.
          </div>
        ) : (
          <div className="positions-grid grid gap-4">
            {formsIndex.map((form) => (
              <a
                key={form.id}
                href={`/form-builder/apply/${form.id}`}
                className="position-card glass-card rounded-2xl p-6 flex items-center justify-between gap-4"
              >
                <span>
                  <span className="font-display text-xl font-bold block mb-1">{form.title}</span>
                  {form.createdAt && (
                    <span className="text-sm text-black/45 dark:text-white/45 block mb-2">
                      Posted {new Date(form.createdAt).toLocaleDateString()}
                    </span>
                  )}
                </span>
                <span className="social-arrow flex-shrink-0" aria-hidden="true">↗</span>
              </a>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
