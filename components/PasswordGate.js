"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PasswordGate({ area = "This area" }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [reveal, setReveal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // The name is only a label for the activity log; the server checks the
        // password and nothing else.
        body: JSON.stringify({ username: name, password }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Sign in failed.");
      setPassword("");
      router.refresh();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <div className="shell" style={{ maxWidth: "30rem" }}>
        <form onSubmit={submit} className="glass-card p-8 animate-rise">
          <span className="glass-inset icon-button mx-auto mb-5" aria-hidden="true">⚿</span>
          <p className="kicker justify-center">Protected</p>
          <h1 className="font-display text-2xl font-bold mt-3 mb-2 text-center">Password required</h1>
          <p className="muted text-sm leading-relaxed mb-6 text-center">
            {area} is locked. Enter the admin password to continue.
          </p>

          <label className="field">
            <span className="field-label">Your name</span>
            <input
              className="input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Mickey"
              autoComplete="username"
              autoFocus
            />
            <span className="faint text-xs mt-1 leading-relaxed">
              Only labels your entries in the activity log — it isn&apos;t checked against anything.
            </span>
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

          <button type="submit" className="btn btn-primary w-full mt-5" disabled={busy || password.length === 0}>
            {busy ? "Checking…" : "Unlock ↗"}
          </button>
        </form>
      </div>
    </div>
  );
}
