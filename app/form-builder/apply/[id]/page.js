import Link from "next/link";
import { cookies } from "next/headers";
import { kvGet } from "@/lib/kv";
import ApplyForm from "@/components/form-builder/ApplyForm";
import { memberFromCookieStore } from "@/lib/members";
import { STATUS_TEXT, applicationGate, memberSubmission, submissionsKey } from "@/lib/applications";
import Countdown from "@/components/Countdown";
import LocalTime from "@/components/LocalTime";

export const dynamic = "force-dynamic";

export const metadata = { title: "Apply" };

function Card({ kicker, title, children }) {
  return (
    <div className="page">
      <div className="shell" style={{ maxWidth: "34rem" }}>
        <div className="glass-card p-8 grid gap-3">
          <p className="kicker">{kicker}</p>
          <p className="font-display text-xl font-bold">{title}</p>
          {children}
          <Link href="/positions" className="btn btn-secondary btn-sm mt-2 self-start">
            ← Back to open positions
          </Link>
        </div>
      </div>
    </div>
  );
}

export default async function ApplyPage({ params }) {
  const form = await kvGet(`formbuilder:form:${params.id}`, null);

  if (!form) {
    return (
      <Card kicker="Closed" title="This application is no longer available.">
        <p className="muted text-sm">
          The form may have been removed. Take a look at the other open positions.
        </p>
      </Card>
    );
  }

  const member = memberFromCookieStore(cookies());
  const applyHref = `/form-builder/apply/${params.id}`;

  if (!member) {
    return (
      <Card kicker="Log in" title="Log in to apply">
        <p className="muted text-sm leading-relaxed">
          Applications are tied to a site account so one person can only apply once per role and can
          follow their status afterwards.
        </p>
        <Link
          href={`/login?next=${encodeURIComponent(applyHref)}`}
          className="btn btn-primary mt-2 self-start"
        >
          Log in <span aria-hidden="true">↗</span>
        </Link>
      </Card>
    );
  }

  const submissions = await kvGet(submissionsKey(params.id), []);
  const gate = applicationGate(form, memberSubmission(submissions, member.username));

  if (gate.status === "pending") {
    return (
      <Card kicker={form.title} title="You've already responded">
        <span className="badge badge-pending self-start">Pending review</span>
        <p className="muted text-sm leading-relaxed">{STATUS_TEXT.pending}</p>
        <p className="faint text-xs">
          Submitted <LocalTime iso={gate.submission.createdAt} />
        </p>
      </Card>
    );
  }

  if (gate.status === "accepted") {
    return (
      <Card kicker={form.title} title="You've been accepted">
        <span className="badge badge-accepted self-start">Accepted</span>
        <p className="muted text-sm leading-relaxed">{STATUS_TEXT.accepted}</p>
        <p className="faint text-xs">
          Submitted <LocalTime iso={gate.submission.createdAt} />
        </p>
      </Card>
    );
  }

  if (gate.status === "denied" && !gate.canApply) {
    return (
      <Card kicker={form.title} title="Your application was rejected">
        <span className="badge badge-denied self-start">Rejected</span>
        <p className="muted text-sm leading-relaxed">
          You can apply again in{" "}
          {gate.availableAt ? <Countdown to={gate.availableAt} className="font-semibold" /> : "a moment"}
          . This page unlocks on its own — no need to refresh.
        </p>
        <p className="faint text-xs">
          Submitted <LocalTime iso={gate.submission.createdAt} />
          {gate.submission.reviewedAt ? <> · reviewed <LocalTime iso={gate.submission.reviewedAt} /></> : null}
        </p>
      </Card>
    );
  }

  return (
    <div className="page">
      <div className="shell" style={{ maxWidth: "46rem" }}>
        <div className="mb-6">
          <Link href="/positions" className="btn btn-ghost -ml-2">
            ← Open positions
          </Link>
        </div>
        {gate.status === "denied" && gate.canApply && (
          <p className="badge badge-neutral mb-4">
            Your last application was rejected — you&apos;re free to apply again.
          </p>
        )}
        <ApplyForm form={form} formId={params.id} />
      </div>
    </div>
  );
}
