"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function PasswordGate({ area = "This area" }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [reveal, setReveal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [denied, setDenied] = useState("");

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: name, password }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (result.code === "admin_not_allowed") {
          setDenied(result.error || "That username doesn't have access to the admin console.");
          return;
        }
        throw new Error(result.error || "Sign in failed.");
      }
      setPassword("");
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function dismissDenied() {
    setDenied("");
    setName("");
    setPassword("");
  }

  return (
    <div className="page">
      <div className="shell" style={{ maxWidth: "30rem" }}>
        <form onSubmit={submit} className="glass-card p-8 animate-rise">
          <span className="glass-inset icon-button mx-auto mb-5" aria-hidden="true">
            ⚿
          </span>
          <p className="kicker justify-center">Protected</p>
          <h1 className="font-display text-2xl font-bold mt-3 mb-2 text-center">Password required</h1>
          <p className="muted text-sm leading-relaxed mb-6 text-center">
            {area} is locked. Enter your admin credentials to continue.
          </p>

          <label className="field">
            <span className="field-label">Username</span>
            <input
              className="input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
              autoFocus
            />
          </label>

          <label className="field mt-3">
            <span className="field-label">Password</span>
            <div className="relative flex items-center">
              <input
                className="input input-lg"
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
            disabled={busy || password.length === 0 || name.trim().length === 0}
          >
            {busy ? "Checking…" : "Unlock ↗"}
          </button>
        </form>
      </div>

      {denied && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="access-denied-title"
        >
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 w-full h-full"
            style={{ background: "rgba(9, 6, 18, 0.55)", backdropFilter: "blur(12px)", cursor: "default" }}
            onClick={dismissDenied}
          />
          <div className="glass-card p-6 relative w-full animate-rise" style={{ maxWidth: "24rem" }}>
            <span className="badge badge-denied">Access denied</span>
            <h2 id="access-denied-title" className="font-display text-xl font-bold mt-3">
              This account can&apos;t open the admin console
            </h2>
            <p className="muted text-sm mt-2 leading-relaxed">{denied}</p>
            <p className="faint text-xs mt-2 leading-relaxed">
              Only the usernames added to the admin list can sign in here. If you think you should
              have access, ask the site owner to add your account.
            </p>
            <div className="flex flex-wrap gap-2 mt-5">
              <button type="button" className="btn btn-primary btn-sm" onClick={dismissDenied}>
                Try another account
              </button>
              <Link href="/" className="btn btn-secondary btn-sm">
                Back to the site
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
