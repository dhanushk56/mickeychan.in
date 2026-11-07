import Link from "next/link";
import { kvGet } from "@/lib/kv";

export const metadata = {
  title: "Open Positions",
  description: "Current openings to join the Mickey Chan team.",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function PositionsPage() {
  const formsIndex = await kvGet("formbuilder:index", []);
  const open = formsIndex.filter((form) => form.published !== false);

  return (
    <main className="page">
      <div className="shell">
        <div className="max-w-2xl mb-10">
          <p className="kicker">Join the team</p>
          <h1 className="display-lg mt-3 mb-4">Open Positions</h1>
          <p className="muted text-lg leading-relaxed">
            Roles we&apos;re currently looking to fill. Each listing opens a short application form —
            answers go straight to the review queue.
          </p>
        </div>

        {open.length === 0 ? (
          <div className="empty-state">
            <p className="font-display text-lg font-bold">No open positions right now</p>
            <p className="muted text-sm max-w-md">
              Check back soon, or send a message on the contact page and tell us what you&apos;d like to do.
            </p>
            <Link href="/join" className="btn btn-secondary btn-sm mt-2">
              Get in touch
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {open.map((form) => (
              <Link
                key={form.id}
                href={`/form-builder/apply/${form.id}`}
                className="glass-card lift p-6 flex items-center justify-between gap-4"
              >
                <span className="min-w-0">
                  <span className="font-display text-xl font-bold block mb-1.5">
                    {form.title || "Untitled role"}
                  </span>
                  <span className="faint text-sm block">
                    {form.createdAt ? `Posted ${new Date(form.createdAt).toLocaleDateString()}` : "Open now"}
                  </span>
                </span>
                <span className="icon-button flex-shrink-0" aria-hidden="true">↗</span>
              </Link>
            ))}
          </div>
        )}

        <div className="glass-card p-6 md:p-8 mt-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-display text-lg font-bold">Nothing fits?</p>
            <p className="muted text-sm mt-1">
              Tell us what you&apos;d bring to the channel — we read everything.
            </p>
          </div>
          <Link href="/join" className="btn btn-primary">
            Start a conversation <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
