"use client";

import { useState } from "react";
import Link from "next/link";

export default function MemberLogin({
  next = "/positions",
  hasAccounts = true,
  googleEnabled = false,
  initialError = "",
  initialCode = "",
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [reveal, setReveal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError);
  const [code, setCode] = useState(initialCode);
  const [resendStatus, setResendStatus] = useState("");
  const [email, setEmail] = useState("");
  const [emailStatus, setEmailStatus] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setCode("");
    setResendStatus("");
    try {
      const response = await fetch("/api/auth/member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setCode(result.code || "");
        throw new Error(result.error || "Could not sign you in.");
      }
      window.location.assign(next || "/positions");
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  async function addEmail(event) {
    event.preventDefault();
    setEmailBusy(true);
    setEmailStatus("");
    try {
      const response = await fetch("/api/auth/member/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, next }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Could not send the confirmation link.");
      setEmailStatus(`Sent to ${result.email || email}. Open the link in that inbox to finish.`);
    } catch (err) {
      setEmailStatus(err.message);
    } finally {
      setEmailBusy(false);
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
        response.ok ? "Sent — check your inbox." : result.error || "Could not send it again."
      );
    } catch {
      setResendStatus("Could not send it again.");
    }
  }

  return (
    <div className="page">
      <div className="shell" style={{ maxWidth: "30rem" }}>
        <form onSubmit={submit} className="glass-card p-8 animate-rise">
          <span className="glass-inset icon-button mx-auto mb-5" aria-hidden="true">
            ☺
          </span>
          <p className="kicker justify-center">Site account</p>
          <h1 className="font-display text-2xl font-bold mt-3 mb-2 text-center">Log in</h1>
          <p className="muted text-sm leading-relaxed mb-6 text-center">
            Log in to apply for a role and follow the status of your application.
          </p>

          {!hasAccounts && (
            <p className="badge badge-pending mb-4 w-full justify-center" role="alert">
              No accounts exist yet — create one below.
            </p>
          )}

          {googleEnabled && (
            <>
              <a
                href={`/api/auth/google?next=${encodeURIComponent(next)}`}
                className="btn btn-secondary w-full"
              >
                Continue with Google
              </a>
              <div className="flex items-center gap-3 my-5" aria-hidden="true">
                <span className="h-px flex-1" style={{ background: "var(--glass-edge)" }} />
                <span className="faint text-xs uppercase tracking-widest">or</span>
                <span className="h-px flex-1" style={{ background: "var(--glass-edge)" }} />
              </div>
            </>
          )}

          <label className="field">
            <span className="field-label">Username</span>
            <input
              className="input"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
            />
          </label>

          <label className="field mt-3">
            <span className="field-label">Password</span>
            <div className="relative flex items-center">
              <input
                className="input"
                type={reveal ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
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

          {error && (
            <p className="badge badge-denied mt-4 w-full justify-center" role="alert">
              {error}
            </p>
          )}

          {code === "unverified" && (
            <div className="mt-3">
              {resendStatus ? (
                <p className="badge badge-pending w-full justify-center" role="status">
                  {resendStatus}
                </p>
              ) : (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm w-full"
                  onClick={resend}
                  disabled={!username}
                >
                  Send the confirmation link again
                </button>
              )}
            </div>
          )}

          {code === "email_required" && (
            <div className="mt-4 grid gap-3">
              <label className="field">
                <span className="field-label">Email address</span>
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
                  We send one link here, and the account works once you open it.
                </span>
              </label>
              {emailStatus && (
                <p className="badge badge-pending w-full justify-center" role="status">
                  {emailStatus}
                </p>
              )}
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={addEmail}
                disabled={emailBusy || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())}
              >
                {emailBusy ? "Sending…" : "Send the confirmation link"}
              </button>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary w-full mt-5"
            disabled={busy || !username || !password}
          >
            {busy ? "Signing in…" : "Log in ↗"}
          </button>

          <div className="glass-soft p-4 mt-6" role="note">
            <p className="text-xs font-bold" style={{ color: "var(--warning)" }}>
              ⚠ Don&apos;t forget your password
            </p>
            <p className="faint text-xs mt-1 leading-relaxed">
              There&apos;s no self-service reset. If you lose your password you will have to contact an
              admin to get it reset.
            </p>
          </div>

          <p className="faint text-xs mt-5 text-center">
            No account yet?{" "}
            <Link
              href={`/register?next=${encodeURIComponent(next)}`}
              className="hover:underline"
              style={{ color: "var(--primary)" }}
            >
              Register Now
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
