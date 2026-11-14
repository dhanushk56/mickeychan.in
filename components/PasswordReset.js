"use client";

import { useState } from "react";
import Link from "next/link";

export default function PasswordReset() {
  const [step, setStep] = useState("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [reveal, setReveal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function requestCode(event) {
    if (event) event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/password/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "We couldn't send that code.");
      setStep("reset");
      setNotice(`We sent a 6-digit code to ${result.email || email}.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, password, confirmPassword: confirm }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "We couldn't reset that password.");
      setStep("done");
      setNotice("");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (step === "done") {
    return (
      <div className="page">
        <div className="shell" style={{ maxWidth: "30rem" }}>
          <div className="glass-card p-8 animate-rise text-center">
            <span className="glass-inset icon-button mx-auto mb-5" aria-hidden="true">
              ✓
            </span>
            <p className="kicker justify-center">All set</p>
            <h1 className="font-display text-2xl font-bold mt-3 mb-2">Password updated</h1>
            <p className="muted text-sm leading-relaxed mb-6">
              Log in with your new password. Any other devices that were signed in have been signed
              out.
            </p>
            <Link href="/login" className="btn btn-primary w-full">
              Go to log in ↗
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="shell" style={{ maxWidth: "30rem" }}>
        <form
          onSubmit={step === "request" ? requestCode : resetPassword}
          className="glass-card p-8 animate-rise"
        >
          <span className="glass-inset icon-button mx-auto mb-5" aria-hidden="true">
            ⚿
          </span>
          <p className="kicker justify-center">Password reset</p>
          <h1 className="font-display text-2xl font-bold mt-3 mb-2 text-center">
            {step === "request" ? "Forgot your password?" : "Choose a new password"}
          </h1>
          <p className="muted text-sm leading-relaxed mb-6 text-center">
            {step === "request"
              ? "Enter the email address on your account and we'll send you a code to reset it."
              : "Enter the code from the email, then pick a new password."}
          </p>

          {step === "request" ? (
            <label className="field">
              <span className="field-label">Email address</span>
              <input
                className="input input-lg"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                required
                autoFocus
              />
            </label>
          ) : (
            <>
              <label className="field">
                <span className="field-label">Code from the email</span>
                <input
                  className="input input-lg"
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  style={{ letterSpacing: ".3em", fontVariantNumeric: "tabular-nums" }}
                  required
                  autoFocus
                />
              </label>

              <label className="field mt-3">
                <span className="field-label">New password</span>
                <div className="relative flex items-center">
                  <input
                    className="input input-lg"
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
                <span className="field-label">Confirm new password</span>
                <input
                  className="input input-lg"
                  type={reveal ? "text" : "password"}
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                  placeholder="Same password again"
                  autoComplete="new-password"
                  required
                />
              </label>

              {notice && (
                <p className="badge badge-accepted mt-4 w-full justify-center" role="status">
                  {notice}
                </p>
              )}
            </>
          )}

          {error && (
            <p className="badge badge-denied mt-4 w-full justify-center" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="btn btn-primary w-full mt-5"
            disabled={
              busy ||
              (step === "request"
                ? !email
                : code.length !== 6 || password.length < 8 || password !== confirm)
            }
          >
            {busy
              ? step === "request"
                ? "Sending…"
                : "Saving…"
              : step === "request"
                ? "Send code ↗"
                : "Update password ↗"}
          </button>

          {step === "reset" && (
            <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={requestCode}
                disabled={busy}
              >
                Send another code
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setStep("request");
                  setError("");
                  setNotice("");
                  setCode("");
                }}
              >
                Use a different email
              </button>
            </div>
          )}

          <p className="faint text-xs mt-5 text-center">
            Remembered it?{" "}
            <Link href="/login" className="hover:underline" style={{ color: "var(--primary)" }}>
              Back to log in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
