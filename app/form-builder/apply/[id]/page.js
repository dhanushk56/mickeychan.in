import Link from "next/link";
import { cookies } from "next/headers";
import { kvGet } from "@/lib/kv";
import ApplyForm from "@/components/form-builder/ApplyForm";
import { memberFromCookieStore } from "@/lib/members";
import { STATUS_TEXT, applicationGate, memberSubmission, submissionsKey } from "@/lib/applications";
import { isReadyForm } from "@/lib/form-builder/schema";
import Countdown from "@/components/Countdown";
import LocalTime from "@/components/LocalTime";
import { EMAIL_VERIFICATION_REQUIRED } from "@/lib/features";
import { blacklistEntry } from "@/lib/blacklist";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

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
  const { id } = await params;

  const form = await kvGet(`formbuilder:form:${id}`, null);

  if (!form) {
    return (
      <Card kicker="Closed" title="This application is no longer available.">
        <p className="muted text-sm">
          The form may have been removed. Take a look at the other open positions.
        </p>
      </Card>
    );
  }

  if (!isReadyForm(form)) {
    return (
      <Card kicker="Not ready" title="This form has no questions yet.">
        <p className="muted text-sm">
          Nothing to fill in yet — the team is still putting this one together. Check back soon.
        </p>
      </Card>
    );
  }

  const member = await memberFromCookieStore(cookies());
  const applyHref = `/form-builder/apply/${id}`;

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

  if (EMAIL_VERIFICATION_REQUIRED && !member.emailVerified) {
    return (
      <Card kicker="Verify" title="Verify your email to apply">
        <p className="muted text-sm leading-relaxed">
          Applications need a confirmed email address, so every response comes from a real, reachable
          person.
        </p>
        <Link
          href={`/verify?next=${encodeURIComponent(applyHref)}`}
          className="btn btn-primary mt-2 self-start"
        >
          Verify my email <span aria-hidden="true">↗</span>
        </Link>
      </Card>
    );
  }

  const blocked = await blacklistEntry(member.username);
  if (blocked) {
    return (
      <Card kicker="Restricted" title="You can't submit applications right now">
        <p className="muted text-sm leading-relaxed whitespace-pre-wrap">
          {blocked.reason ||
            "You've been blocked from submitting applications at this moment. Contact an administrator if you think this is a mistake."}
        </p>
      </Card>
    );
  }

  const submissions = await kvGet(submissionsKey(id), []);
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
        <p className="muted text-sm leading-relaxed whitespace-pre-wrap">
          {gate.submission.reviewNote || STATUS_TEXT.accepted}
        </p>
        <p className="faint text-xs">
          Submitted <LocalTime iso={gate.submission.createdAt} />
          {gate.submission.reviewedBy ? ` · reviewed by @${gate.submission.reviewedBy}` : ""}
        </p>
      </Card>
    );
  }

  if (gate.status === "denied" && !gate.canApply) {
    return (
      <Card kicker={form.title} title="Your application was rejected">
        <span className="badge badge-denied self-start">Rejected</span>
        <p className="muted text-sm leading-relaxed whitespace-pre-wrap">
          {gate.submission.reviewNote || STATUS_TEXT.denied}
        </p>
        <p className="muted text-sm leading-relaxed">
          You can apply again in{" "}
          {gate.availableAt ? <Countdown to={gate.availableAt} className="font-semibold" /> : "a moment"}
          . This page unlocks on its own — no need to refresh.
        </p>
        <p className="faint text-xs">
          Submitted <LocalTime iso={gate.submission.createdAt} />
          {gate.submission.reviewedAt ? <> · reviewed <LocalTime iso={gate.submission.reviewedAt} /></> : null}
          {gate.submission.reviewedBy ? ` · by @${gate.submission.reviewedBy}` : ""}
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
          <div className="grid gap-2 mb-4">
            <p className="badge badge-neutral self-start">
              Your last application was rejected — you&apos;re free to apply again.
            </p>
            <p className="muted text-sm whitespace-pre-wrap">
              {gate.submission.reviewNote || STATUS_TEXT.denied}
            </p>
            {gate.submission.reviewedBy && (
              <p className="faint text-xs">{`Reviewed by @${gate.submission.reviewedBy}`}</p>
            )}
          </div>
        )}
        <ApplyForm form={form} formId={id} />
      </div>
    </div>
  );
}
