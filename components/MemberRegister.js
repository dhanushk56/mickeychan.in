"use client";

import { useState } from "react";
import Link from "next/link";

export default function MemberRegister({ next = "/positions", googleEnabled = false }) {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [reveal, setReveal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [resendStatus, setResendStatus] = useState("");

  const mismatch = confirmPassword.length > 0 && password !== confirmPassword;
  const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const canSubmit =
    username.trim().length >= 3 &&
    emailLooksValid &&
    password.length >= 8 &&
    password === confirmPassword &&
    !busy;

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, username, email, password, confirmPassword, next }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Could not create your account.");
      setPendingEmail(result.email || email.trim());
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    setResendStatus("Sending…");
    try {
      const response = await fetch("/api/auth/verify/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, next }),
      });
      const result = await response.json().catch(() => ({}));
      setResendStatus(
        response.ok ? "Sent — check your inbox again." : result.error || "Could not send it again."
      );
    } catch {
      setResendStatus("Could not send it again.");
    }
  }

  if (pendingEmail) {
    return (
      <div className="page">
        <div className="shell" style={{ maxWidth: "30rem" }}>
          <div className="glass-card p-8 animate-rise">
            <span className="glass-inset icon-button mx-auto mb-5" aria-hidden="true">
              ✉
            </span>
            <p className="kicker justify-center">One step left</p>
            <h1 className="font-display text-2xl font-bold mt-3 mb-2 text-center">
              Check your inbox
            </h1>
            <p className="muted text-sm leading-relaxed mb-4 text-center">
              We sent a confirmation link to <strong>{pendingEmail}</strong>. Open it to finish
              creating @{username} and sign in.
            </p>
            <p className="faint text-xs leading-relaxed text-center">
              The link works for 24 hours. If it isn&apos;t there in a minute, check your spam folder.
            </p>

            {resendStatus && (
              <p className="badge badge-pending mt-4 w-full justify-center" role="status">
                {resendStatus}
              </p>
            )}

            <button type="button" className="btn btn-secondary w-full mt-5" onClick={resend}>
              Send the link again
            </button>

            <p className="faint text-xs mt-5 text-center">
              Already confirmed?{" "}
              <Link
                href={`/login?next=${encodeURIComponent(next)}`}
                className="hover:underline"
                style={{ color: "var(--primary)" }}
              >
                Log in
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="shell" style={{ maxWidth: "30rem" }}>
        <form onSubmit={submit} className="glass-card p-8 animate-rise">
          <span className="glass-inset icon-button mx-auto mb-5" aria-hidden="true">
            ✧
          </span>
          <p className="kicker justify-center">Site account</p>
          <h1 className="font-display text-2xl font-bold mt-3 mb-2 text-center">Create an account</h1>
          <p className="muted text-sm leading-relaxed mb-6 text-center">
            You need an account to apply for a role — it keeps one application per person and lets
            you follow your status afterwards.
          </p>

          {googleEnabled && (
            <>
              <a
                href={`/api/auth/google?next=${encodeURIComponent(next)}`}
                className="btn btn-secondary w-full"
              >
                Continue with Google
              </a>
              <p className="faint text-xs leading-relaxed mt-2 text-center">
                Google confirms your email for you, and you never set a password here.
              </p>
              <div className="flex items-center gap-3 my-5" aria-hidden="true">
                <span className="h-px flex-1" style={{ background: "var(--glass-edge)" }} />
                <span className="faint text-xs uppercase tracking-widest">or</span>
                <span className="h-px flex-1" style={{ background: "var(--glass-edge)" }} />
              </div>
            </>
          )}

          <label className="field">
            <span className="field-label">Display name (optional)</span>
            <input
              className="input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              placeholder="How your name shows up for the team"
            />
          </label>

          <label className="field mt-3">
            <span className="field-label">Username</span>
            <input
              className="input"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="3–24 letters, numbers, . _ -"
              required
            />
          </label>

          <label className="field mt-3">
            <span className="field-label">Email</span>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="you@example.com"
              required
            />
            <span className="faint text-xs mt-1">
              We email a link here and you confirm it before your first login.
            </span>
          </label>

          <label className="field mt-3">
            <span className="field-label">Password</span>
            <div className="relative flex items-center">
              <input
                className="input"
                type={reveal ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                required
                style={{ paddingRight: "3rem" }}
              />
              <button
                type="button"
                className="icon-button absolute right-2"
                onClick={() => setReveal(!reveal)}
                aria-label={reveal ? "Hide password" : "Show password"}
                style={{ width: "1.9rem", height: "1.9rem" }}
              >
                {reveal ? "◡" : "◉"}
              </button>
            </div>
          </label>

          <label className="field mt-3">
            <span className="field-label">Confirm password</span>
            <input
              className="input"
              type={reveal ? "text" : "password"}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              required
            />
          </label>

          {mismatch && (
            <p className="faint text-xs mt-2" style={{ color: "var(--danger)" }}>
              Those passwords don&apos;t match yet.
            </p>
          )}

          {error && (
            <p className="badge badge-denied mt-4 w-full justify-center" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="btn btn-primary w-full mt-5" disabled={!canSubmit}>
            {busy ? "Creating…" : "Create account ↗"}
          </button>

          <div className="glass-soft p-4 mt-6" role="note">
            <p className="text-xs font-bold" style={{ color: "var(--warning)" }}>
              ⚠ Don&apos;t forget your password
            </p>
            <p className="faint text-xs mt-1 leading-relaxed">
              There&apos;s no self-service reset. If you lose your password you will have to contact an
              admin to get it reset — write it down somewhere safe.
            </p>
          </div>

          <p className="faint text-xs mt-5 text-center">
            Already have an account?{" "}
            <Link
              href={`/login?next=${encodeURIComponent(next)}`}
              className="hover:underline"
              style={{ color: "var(--primary)" }}
            >
              Log in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
