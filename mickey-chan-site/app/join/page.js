"use client";

import { useEffect, useState } from "react";

const defaults = {
  title: "Let's make something memorable.",
  description:
    "Want to collaborate, join the team, or simply say hello? Send a message and we'll get back to you.",
  nameLabel: "Name",
  namePlaceholder: "Your name",
  emailLabel: "Email",
  emailPlaceholder: "you@example.com",
  interestLabel: "I'm interested in",
  messageLabel: "Message",
  messagePlaceholder: "Tell us what you have in mind…",
  submitLabel: "Send message ↗",
  successMessage: "Thanks — your message has been sent.",
};

export default function JoinPage() {
  const [config, setConfig] = useState(defaults);
  const [status, setStatus] = useState("");
  const [isError, setIsError] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/form", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((value) => value && setConfig({ ...defaults, ...value }))
      .catch(() => {});
  }, []);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setStatus("");
    setIsError(false);
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    try {
      const response = await fetch("/api/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(form)),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to send your message.");
      formEl.reset();
      setStatus(config.successMessage);
    } catch (error) {
      setIsError(true);
      setStatus(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page">
      <div className="shell grid gap-10 lg:grid-cols-[.9fr_1.1fr]">
        <div className="animate-rise">
          <p className="kicker">Start a conversation</p>
          <h1 className="display-lg mt-3 mb-5">{config.title}</h1>
          <p className="muted text-lg leading-relaxed max-w-lg">{config.description}</p>

          <div className="grid gap-3 mt-8 max-w-md">
            <div className="glass-soft p-4 flex items-start gap-3">
              <span className="icon-button flex-shrink-0" aria-hidden="true">✉</span>
              <div>
                <p className="font-semibold text-sm">Business &amp; sponsorships</p>
                <p className="faint text-xs mt-0.5">business@mickeychan.in</p>
              </div>
            </div>
            <div className="glass-soft p-4 flex items-start gap-3">
              <span className="icon-button flex-shrink-0" aria-hidden="true">◷</span>
              <div>
                <p className="font-semibold text-sm">Typical reply time</p>
                <p className="faint text-xs mt-0.5">A few days — everything is read.</p>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={submit} className="glass-card p-6 md:p-8 grid gap-5 animate-rise delay-1">
          <div className="grid md:grid-cols-2 gap-5">
            <label className="field">
              <span className="field-label">{config.nameLabel}</span>
              <input name="name" required className="input input-lg" placeholder={config.namePlaceholder} />
            </label>
            <label className="field">
              <span className="field-label">{config.emailLabel}</span>
              <input
                name="email"
                type="email"
                required
                className="input input-lg"
                placeholder={config.emailPlaceholder}
              />
            </label>
          </div>

          <label className="field">
            <span className="field-label">{config.interestLabel}</span>
            <select name="role" className="select input-lg">
              <option>Community</option>
              <option>Collaboration</option>
              <option>General question</option>
            </select>
          </label>

          <label className="field">
            <span className="field-label">{config.messageLabel}</span>
            <textarea
              name="message"
              required
              rows={7}
              className="textarea input-lg"
              placeholder={config.messagePlaceholder}
            />
          </label>

          <div className="flex flex-wrap items-center gap-4">
            <button disabled={busy} className="btn btn-primary">
              {busy ? "Sending…" : config.submitLabel}
            </button>
            {status && (
              <p
                role="status"
                className={`text-sm ${isError ? "" : "badge badge-accepted"}`}
                style={isError ? { color: "var(--danger)" } : undefined}
              >
                {status}
              </p>
            )}
          </div>
          <p className="faint text-xs">
            By sending a message you agree to be contacted about your enquiry.
          </p>
        </form>
      </div>
    </main>
  );
}
