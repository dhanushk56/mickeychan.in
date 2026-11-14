"use client";

import { useState } from "react";
import Link from "next/link";

export default function VerifyEmail({ email = "", next = "/positions", emailConfigured = true }) {
  const [address, setAddress] = useState(email);
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address.trim());

  async function send() {
    setBusy(true);
    setError("");
    setStatus("");
    try {
      const response = await fetch("/api/auth/verify/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: address.trim() === email ? "" : address.trim() }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Could not send the code.");
      setSent(true);
      setStatus(`Code sent to ${result.email || address}.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function confirm(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/verify/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Could not confirm the code.");
      window.location.assign(next || "/positions");
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <div className="shell" style={{ maxWidth: "30rem" }}>
        <div className="glass-card p-8 animate-rise">
          <span className="glass-inset icon-button mx-auto mb-5" aria-hidden="true">
            ✉
          </span>
          <p className="kicker justify-center">One step left</p>
          <h1 className="font-display text-2xl font-bold mt-3 mb-2 text-center">
            Verify your account
          </h1>
          <p className="muted text-sm leading-relaxed mb-6 text-center">
            {email
              ? `Enter the 6-digit code we send to ${email} to confirm this address.`
              : "Add an email address and we'll send a 6-digit code to confirm it."}
          </p>

          {!emailConfigured && (
            <p className="badge badge-pending mb-4 w-full justify-center" role="alert">
              Email sending isn&apos;t set up on this site yet.
            </p>
          )}

          {!email && (
            <label className="field">
              <span className="field-label">Email address</span>
              <input
                className="input"
                type="email"
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="you@example.com"
              />
            </label>
          )}

          <button
            type="button"
            className="btn btn-secondary w-full mt-3"
            onClick={send}
            disabled={busy || !emailConfigured || !emailLooksValid}
          >
            {busy ? "Sending…" : sent ? "Send a new code" : "Send the code"}
          </button>

          {status && (
            <p className="badge badge-pending mt-4 w-full justify-center" role="status">
              {status}
            </p>
          )}

          <form onSubmit={confirm} className="grid gap-3 mt-5">
            <label className="field">
              <span className="field-label">6-digit code</span>
              <input
                className="input"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456"
                style={{ letterSpacing: ".35em", fontSize: "1.15rem" }}
              />
            </label>

            {error && (
              <p className="badge badge-denied w-full justify-center" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={busy || code.length !== 6}
            >
              {busy ? "Checking…" : "Confirm email ↗"}
            </button>
          </form>

          <p className="faint text-xs mt-5 text-center">
            <Link href={next} className="hover:underline" style={{ color: "var(--primary)" }}>
              Do this later
            </Link>{" "}
            — the banner stays until you confirm.
          </p>
        </div>
      </div>
    </div>
  );
}
