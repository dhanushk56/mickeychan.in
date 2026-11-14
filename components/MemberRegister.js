"use client";

import { useState } from "react";
import Link from "next/link";
import GoogleMark from "@/components/GoogleMark";
import DiscordMark from "@/components/DiscordMark";

export default function MemberRegister({ next = "/positions", googleEnabled = false, discordEnabled = false }) {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [reveal, setReveal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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
        body: JSON.stringify({ name, username, email, password, confirmPassword }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Could not create your account.");
      window.location.assign(`/verify?next=${encodeURIComponent(next)}`);
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
            ✧
          </span>
          <p className="kicker justify-center">Site account</p>
          <h1 className="font-display text-2xl font-bold mt-3 mb-2 text-center">Create an account</h1>
          <p className="muted text-sm leading-relaxed mb-6 text-center">
            You need an account to apply for a role — it keeps one application per person and lets
            you follow your status afterwards.
          </p>

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
              We send a 6-digit code here, and a confirmed address is needed to apply for roles.
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

          {(googleEnabled || discordEnabled) && (
            <>
              <div className="flex items-center gap-3 my-5" aria-hidden="true">
                <span className="h-px flex-1" style={{ background: "var(--glass-edge)" }} />
                <span className="faint text-xs uppercase tracking-widest">or</span>
                <span className="h-px flex-1" style={{ background: "var(--glass-edge)" }} />
              </div>
              <div className="grid gap-2">
                {googleEnabled && (
                  <a
                    href={`/api/auth/google?next=${encodeURIComponent(next)}`}
                    className="btn btn-secondary w-full gap-2"
                  >
                    <GoogleMark />
                    Continue with Google
                  </a>
                )}
                {discordEnabled && (
                  <a
                    href={`/api/auth/discord?next=${encodeURIComponent(next)}`}
                    className="btn btn-secondary w-full gap-2"
                  >
                    <DiscordMark />
                    Continue with Discord
                  </a>
                )}
              </div>
            </>
          )}

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
