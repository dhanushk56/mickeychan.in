"use client";

import { useState } from "react";
import Link from "next/link";
import GoogleMark from "@/components/GoogleMark";

export default function MemberLogin({
  next = "/positions",
  hasAccounts = true,
  googleEnabled = false,
  initialError = "",
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [reveal, setReveal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Could not sign you in.");
      window.location.assign(next || "/positions");
    } catch (err) {
      setError(err.message);
      setBusy(false);
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

          <button
            type="submit"
            className="btn btn-primary w-full mt-5"
            disabled={busy || !username || !password}
          >
            {busy ? "Signing in…" : "Log in ↗"}
          </button>

          {googleEnabled && (
            <>
              <div className="flex items-center gap-3 my-5" aria-hidden="true">
                <span className="h-px flex-1" style={{ background: "var(--glass-edge)" }} />
                <span className="faint text-xs uppercase tracking-widest">or</span>
                <span className="h-px flex-1" style={{ background: "var(--glass-edge)" }} />
              </div>
              <a
                href={`/api/auth/google?next=${encodeURIComponent(next)}`}
                className="btn btn-secondary w-full gap-2"
              >
                <GoogleMark />
                Continue with Google
              </a>
            </>
          )}

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
