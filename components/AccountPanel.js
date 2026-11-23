"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function formatDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : dateFormat.format(date);
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That file couldn't be read as an image."));
    };
    image.src = url;
  });
}

async function squareImage(file) {
  const image = await loadImage(file);
  const size = 320;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Your browser couldn't process that image.");
  const scale = Math.max(size / image.width, size / image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  context.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
  return canvas.toDataURL("image/jpeg", 0.85);
}

const PROVIDER_LABEL = {
  google: "Google",
  discord: "Discord",
  password: "Password",
};

export default function AccountPanel({ profile, verificationRequired = true }) {
  const router = useRouter();
  const fileInput = useRef(null);
  const [current, setCurrent] = useState(profile);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: profile.name || "", phone: profile.phone || "" });
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const locked = current.canChange === false;
  const nextChange = formatDate(current.nextChangeAt);
  const joined = formatDate(current.createdAt);
  const needsVerify = verificationRequired && !current.emailVerified;

  function apply(result) {
    if (result?.profile) {
      setCurrent(result.profile);
      setForm({ name: result.profile.name || "", phone: result.profile.phone || "" });
    }
    router.refresh();
  }

  async function send(url, options) {
    setBusy("details");
    setError("");
    setNotice("");
    try {
      const response = await fetch(url, { ...options, headers: { "Content-Type": "application/json" } });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (result.nextChangeAt) {
          setCurrent((value) => ({ ...value, canChange: false, nextChangeAt: result.nextChangeAt }));
        }
        throw new Error(result.error || "That didn't work. Try again.");
      }
      apply(result);
      return result;
    } catch (problem) {
      setError(problem.message);
      return null;
    } finally {
      setBusy("");
    }
  }

  async function pickPhoto(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!/^image\/(png|jpeg|jpg|webp)$/.test(file.type)) {
      setError("Pick a PNG, JPEG or WebP image.");
      return;
    }
    setBusy("photo");
    setError("");
    setNotice("");
    try {
      const dataUrl = await squareImage(file);
      setBusy("");
      const result = await send("/api/account/avatar", {
        method: "POST",
        body: JSON.stringify({ dataUrl }),
      });
      if (result) setNotice("Profile photo updated.");
    } catch (problem) {
      setError(problem.message);
    } finally {
      setBusy("");
    }
  }

  async function removePhoto() {
    const result = await send("/api/account/avatar", { method: "DELETE" });
    if (result) setNotice("Profile photo removed. Your initials are showing instead.");
  }

  async function saveDetails(event) {
    event.preventDefault();
    const result = await send("/api/account/profile", {
      method: "PATCH",
      body: JSON.stringify({ name: form.name, phone: form.phone }),
    });
    if (result) {
      setEditing(false);
      setNotice("Your details are saved. They can be changed again in six months.");
    }
  }

  return (
    <div className="grid gap-5">
      <div className="glass-card account-card animate-rise">
        <div className="account-head">
          <span className="avatar-frame" aria-hidden="true">
            {current.avatar ? <img src={current.avatar} alt="" /> : current.initials}
          </span>
          <div className="grid gap-2 min-w-0">
            <p className="kicker">My account</p>
            <h1 className="font-display text-2xl font-bold leading-tight">{current.name}</h1>
            <p className="muted text-sm">@{current.username}</p>
            <div className="flex flex-wrap gap-2 mt-1">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => fileInput.current?.click()}
                disabled={busy === "photo"}
              >
                {busy === "photo" ? "Uploading…" : current.avatar ? "Change photo" : "Add a photo"}
              </button>
              {current.avatar && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={removePhoto}
                  disabled={busy === "photo"}
                >
                  Remove
                </button>
              )}
              <LogoutButton endpoint="/api/auth/member/logout" className="btn btn-ghost btn-sm">
                Log out
              </LogoutButton>
            </div>
            <input
              ref={fileInput}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              hidden
              onChange={pickPhoto}
            />
          </div>
        </div>
      </div>

      {needsVerify && (
        <div className="glass-card p-5 grid gap-3 animate-rise">
          <p className="kicker">Verify your email</p>
          <p className="muted text-sm leading-relaxed">
            Confirm {current.email || "your email address"} so applications and messages reach you.
          </p>
          <Link
            href={`/verify?next=${encodeURIComponent("/my-account")}`}
            className="btn btn-primary btn-sm justify-self-start"
          >
            Verify email <span aria-hidden="true">↗</span>
          </Link>
        </div>
      )}

      {(error || notice) && (
        <p
          className={error ? "badge badge-denied p-3 text-sm" : "badge badge-accepted p-3 text-sm"}
          role="status"
        >
          {error || notice}
        </p>
      )}

      <div className="glass-card account-card animate-rise">
        <div className="flex items-center justify-between gap-3 mb-1">
          <p className="kicker">Details</p>
          {locked && nextChange && <span className="account-lock">Next change {nextChange}</span>}
        </div>

        {editing ? (
          <form onSubmit={saveDetails} className="grid gap-4 mt-4">
            <label className="field">
              <span className="field-label">Name</span>
              <input
                className="input"
                value={form.name}
                maxLength={60}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                required
              />
            </label>
            <label className="field">
              <span className="field-label">Phone number (optional)</span>
              <input
                className="input"
                value={form.phone}
                inputMode="tel"
                maxLength={24}
                placeholder="+91 98765 43210"
                onChange={(event) => setForm({ ...form, phone: event.target.value })}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button type="submit" className="btn btn-primary btn-sm" disabled={busy === "details"}>
                {busy === "details" ? "Saving…" : "Save changes"}
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setEditing(false);
                  setForm({ name: current.name || "", phone: current.phone || "" });
                  setError("");
                }}
              >
                Cancel
              </button>
            </div>
            <p className="faint text-xs">Saving uses your one change for the next six months.</p>
          </form>
        ) : (
          <div className="account-rows">
            <div className="account-row">
              <span className="account-label">Name</span>
              <span className="account-value">{current.name}</span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setEditing(true);
                  setError("");
                  setNotice("");
                }}
                disabled={locked}
                title={locked ? `You can change this again on ${nextChange}` : undefined}
              >
                Change
              </button>
            </div>

            <div className="account-row">
              <span className="account-label">Username</span>
              <span className="account-value">@{current.username}</span>
              <span className="account-lock">Fixed</span>
            </div>

            <div className="account-row">
              <span className="account-label">Email</span>
              <span className="account-value" data-empty={!current.email}>
                {current.email || "Not added"}
              </span>
              {needsVerify ? (
                <Link
                  href={`/verify?next=${encodeURIComponent("/my-account")}`}
                  className="btn btn-secondary btn-sm"
                >
                  Verify
                </Link>
              ) : (
                <span className="badge badge-accepted">Verified</span>
              )}
            </div>

            <div className="account-row">
              <span className="account-label">Phone</span>
              <span className="account-value" data-empty={!current.phone}>
                {current.phone || "Not added yet"}
              </span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setEditing(true);
                  setError("");
                  setNotice("");
                }}
                disabled={locked}
                title={locked ? `You can change this again on ${nextChange}` : undefined}
              >
                Change
              </button>
            </div>

            <div className="account-row">
              <span className="account-label">Sign-in</span>
              <span className="account-value">{PROVIDER_LABEL[current.provider] || "Password"}</span>
              <span className="account-lock">
                {current.hasPassword ? "Password set" : "No password"}
              </span>
            </div>

            <div className="account-row">
              <span className="account-label">Joined</span>
              <span className="account-value">{joined || "—"}</span>
              <span className="account-lock" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
