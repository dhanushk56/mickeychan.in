"use client";

import { useRef, useState } from "react";
import { ENQUIRY_CATEGORIES, MAX_MESSAGE, MAX_SUBJECT } from "@/lib/enquiry-meta";

const EMPTY = {
  name: "",
  email: "",
  category: "general",
  subject: "",
  message: "",
};

export default function ContactForm({ defaultName = "", defaultEmail = "", emailConfigured = false }) {
  const [fields, setFields] = useState({ ...EMPTY, name: defaultName, email: defaultEmail });
  const [company, setCompany] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const startedAt = useRef(Date.now());

  function update(key, value) {
    setFields((current) => ({ ...current, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    if (sending) return;
    setSending(true);
    setError("");
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...fields, company, startedAt: startedAt.current }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not send that message.");
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  function again() {
    setResult(null);
    setFields({ ...EMPTY, name: defaultName, email: defaultEmail });
    setCompany("");
    startedAt.current = Date.now();
  }

  if (result) {
    return (
      <div className="glass-card p-6 md:p-8 grid gap-3 animate-rise" role="status">
        <span className="badge badge-accepted">Message sent</span>
        <h2 className="font-display text-2xl font-bold">Thanks, that reached us.</h2>
        <p className="muted text-sm">
          Your reference is{" "}
          <strong className="font-semibold" style={{ color: "var(--text)" }}>
            {result.reference}
          </strong>
          . Keep it if you need to follow up.
        </p>
        <p className="faint text-xs leading-relaxed">
          {result.emailed || emailConfigured
            ? "A copy is on its way to your inbox. We read everything and reply by email."
            : "We reply by email. If you don't hear back within a few days, write to business@mickeychan.in."}
        </p>
        <div className="flex flex-wrap gap-2 mt-1">
          <button type="button" className="btn btn-secondary btn-sm" onClick={again}>
            Send another message
          </button>
          <a href="/positions" className="btn btn-ghost btn-sm">
            See open positions
          </a>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="glass-card p-6 md:p-8 grid gap-4">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="field">
          <span className="field-label">Your name</span>
          <input
            className="input"
            value={fields.name}
            onChange={(event) => update("name", event.target.value)}
            maxLength={80}
            autoComplete="name"
            required
          />
        </label>
        <label className="field">
          <span className="field-label">Email</span>
          <input
            className="input"
            type="email"
            value={fields.email}
            onChange={(event) => update("email", event.target.value)}
            maxLength={254}
            autoComplete="email"
            required
          />
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="field">
          <span className="field-label">What's this about?</span>
          <select
            className="select"
            value={fields.category}
            onChange={(event) => update("category", event.target.value)}
          >
            {ENQUIRY_CATEGORIES.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">Subject</span>
          <input
            className="input"
            value={fields.subject}
            onChange={(event) => update("subject", event.target.value)}
            maxLength={MAX_SUBJECT}
            placeholder="A one-line summary"
            required
          />
        </label>
      </div>

      <label className="field">
        <span className="field-label">Message</span>
        <textarea
          className="textarea"
          rows={8}
          value={fields.message}
          onChange={(event) => update("message", event.target.value)}
          maxLength={MAX_MESSAGE}
          placeholder="Tell us what you need. The more context, the better."
          required
        />
        <span className="faint text-xs">
          {fields.message.length}/{MAX_MESSAGE}
        </span>
      </label>

      <div
        aria-hidden="true"
        style={{ position: "absolute", left: "-9999px", width: "1px", height: "1px", overflow: "hidden" }}
      >
        <label>
          Company
          <input
            tabIndex={-1}
            autoComplete="off"
            value={company}
            onChange={(event) => setCompany(event.target.value)}
          />
        </label>
      </div>

      {error && (
        <p className="badge badge-denied" role="alert">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn btn-primary" disabled={sending}>
          {sending ? "Sending…" : "Send message"}
        </button>
        <p className="faint text-xs leading-relaxed" style={{ maxWidth: "26rem" }}>
          We only use your details to reply. No newsletters unless you ask.
        </p>
      </div>
    </form>
  );
}
