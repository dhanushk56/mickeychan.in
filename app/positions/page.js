import Link from "next/link";
import { cookies } from "next/headers";
import { kvGet } from "@/lib/kv";
import { memberFromCookieStore } from "@/lib/members";
import {
  STATUS_TEXT,
  applicationGate,
  memberSubmission,
  submissionsKey,
} from "@/lib/applications";
import Countdown from "@/components/Countdown";
import LocalTime from "@/components/LocalTime";
import { isReadyForm } from "@/lib/form-builder/schema";

export const metadata = {
  title: "Open Positions",
  description: "Current openings to join the Mickey Chan team.",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

function StatusBlock({ gate, member }) {
  if (!member) {
    return (
      <p className="faint text-sm">
        Log in to apply — your application, its status and any reapply timer stay on your account.
      </p>
    );
  }

  if (!member.emailVerified && gate.status === "none") {
    return (
      <p className="faint text-sm">
        Verify your email address to apply — a confirmed address keeps one real person per
        application.
      </p>
    );
  }

  if (gate.status === "none") {
    return <p className="muted text-sm">You haven&apos;t applied to this role yet.</p>;
  }

  const submitted = (
    <p className="faint text-xs">
      Submitted <LocalTime iso={gate.submission.createdAt} />
    </p>
  );

  if (gate.status === "pending") {
    return (
      <>
        <span className="badge badge-pending">Pending review</span>
        <p className="muted text-sm">{STATUS_TEXT.pending}</p>
        {submitted}
      </>
    );
  }

  if (gate.status === "accepted") {
    return (
      <>
        <span className="badge badge-accepted">Accepted</span>
        <p className="muted text-sm">{STATUS_TEXT.accepted}</p>
        {submitted}
      </>
    );
  }

  return (
    <>
      <span className="badge badge-denied">Rejected</span>
      {gate.canApply ? (
        <p className="muted text-sm">Your cooldown is over — you can apply again now.</p>
      ) : (
        <p className="muted text-sm">
          You can reapply in{" "}
          {gate.availableAt ? <Countdown to={gate.availableAt} className="font-semibold" /> : "a moment"}.
        </p>
      )}
      {submitted}
    </>
  );
}

export default async function PositionsPage() {
  const member = await memberFromCookieStore(cookies());
  const formsIndex = await kvGet("formbuilder:index", []);
  const open = formsIndex.filter((form) => form.published !== false);

  const roles = (
    await Promise.all(
      open.map(async (entry) => {
        const form = (await kvGet(`formbuilder:form:${entry.id}`, null)) || entry;
        const submissions = member ? await kvGet(submissionsKey(entry.id), []) : [];
        const submission = member ? memberSubmission(submissions, member.username) : null;
        return { entry, form, gate: applicationGate(form, submission) };
      })
    )
  ).filter(({ form }) => isReadyForm(form));

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
          {!member && (
            <p className="faint text-sm mt-4">
              Applying needs an account so one person can only apply once per role.{" "}
              <Link href="/login?next=%2Fpositions" className="hover:underline" style={{ color: "var(--primary)" }}>
                Log in
              </Link>{" "}
              to see your status here.
            </p>
          )}
        </div>

        {roles.length === 0 ? (
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
            {roles.map(({ entry, form, gate }) => {
              const applyHref = `/form-builder/apply/${entry.id}`;
              const verified = Boolean(member && member.emailVerified);
              const href = !member
                ? `/login?next=${encodeURIComponent(applyHref)}`
                : !verified
                  ? `/verify?next=${encodeURIComponent(applyHref)}`
                  : applyHref;
              const label = !member
                ? "Log in to apply"
                : !verified
                  ? "Verify email to apply"
                  : gate.canApply
                    ? "Apply now"
                    : "View status";

              return (
                <article
                  key={entry.id}
                  className="glass-card lift p-6 flex flex-col gap-3 min-w-0"
                >
                  <div className="min-w-0">
                    <p className="font-display text-xl font-bold">
                      {form.title || "Untitled role"}
                    </p>
                    <p className="faint text-sm mt-1">
                      {entry.createdAt
                        ? `Posted ${new Date(entry.createdAt).toLocaleDateString()}`
                        : "Open now"}
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <StatusBlock gate={gate} member={member} />
                  </div>

                  <Link href={href} className="btn btn-secondary btn-sm mt-auto self-start">
                    {label} <span aria-hidden="true">↗</span>
                  </Link>
                </article>
              );
            })}
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
