"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import LogoutButton from "@/components/LogoutButton";
import useBodyScrollLock from "@/lib/useBodyScrollLock";

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
  context.drawImage(
    image,
    (size - width) / 2,
    (size - height) / 2,
    width,
    height,
  );
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
  const [form, setForm] = useState({
    name: profile.name || "",
    username: profile.username || "",
    email: profile.email || "",
    phone: profile.phone || "",
    password: "",
  });
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [photoMenu, setPhotoMenu] = useState(false);
  const [enlarged, setEnlarged] = useState(false);
  const [mounted, setMounted] = useState(false);
  useBodyScrollLock(Boolean(mounted && photoMenu && current?.avatar));
  useBodyScrollLock(Boolean(mounted && enlarged && current?.avatar));
  const [profileVisible, setProfileVisible] = useState(false);
  const [profileBusy, setProfileBusy] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    let alive = true;
    fetch("/api/profile", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (alive && data?.settings) setProfileVisible(data.settings.profileVisible === true);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  async function toggleProfile() {
    setProfileBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visible: !profileVisible }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "That didn't save. Try again.");
      const visible = data.settings?.profileVisible === true;
      setProfileVisible(visible);
      setNotice(visible ? "Your public profile is live." : "Your public profile is private again.");
    } catch (problem) {
      setError(problem.message);
    } finally {
      setProfileBusy(false);
    }
  }

  const locked = current.canChange === false;
  const nextChange = formatDate(current.nextChangeAt);
  const joined = formatDate(current.createdAt);
  const needsVerify = verificationRequired && !current.emailVerified;
  const emailChangeable =
    current.emailChangeable !== false && current.emailVerified !== true;

  function apply(result) {
    if (result?.profile) {
      setCurrent(result.profile);
      setForm({
        name: result.profile.name || "",
        username: result.profile.username || "",
        email: result.profile.email || "",
        phone: result.profile.phone || "",
        password: "",
      });
    }
    router.refresh();
  }

  async function send(url, options) {
    setBusy("details");
    setError("");
    setNotice("");
    try {
      const response = await fetch(url, {
        ...options,
        headers: { "Content-Type": "application/json" },
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (result.nextChangeAt) {
          setCurrent((value) => ({
            ...value,
            canChange: false,
            nextChangeAt: result.nextChangeAt,
          }));
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
    if (result)
      setNotice("Profile photo removed. Your initials are showing instead.");
    return Boolean(result);
  }

  useEffect(() => {
    if (!photoMenu && !enlarged) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") {
        setPhotoMenu(false);
        setEnlarged(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [photoMenu, enlarged]);

  function changePhoto() {
    setPhotoMenu(false);
    fileInput.current?.click();
  }

  async function removePicture() {
    const removed = await removePhoto();
    if (removed) setPhotoMenu(false);
  }

  function openEditor() {
    setForm({
      name: current.name || "",
      username: current.username || "",
      email: current.email || "",
      phone: current.phone || "",
      password: "",
    });
    setError("");
    setNotice("");
    setEditing(true);
  }

  async function saveDetails(event) {
    event.preventDefault();
    const patch = {};

    if (!locked) {
      if (form.name.trim() !== (current.name || "").trim())
        patch.name = form.name;
      if (
        form.username.trim().toLowerCase() !==
        (current.username || "").toLowerCase()
      ) {
        patch.username = form.username.trim();
      }
      if (form.phone.trim() !== (current.phone || "").trim())
        patch.phone = form.phone;
      if (form.password) patch.password = form.password;
    }

    if (
      emailChangeable &&
      form.email.trim().toLowerCase() !== (current.email || "").toLowerCase()
    ) {
      patch.email = form.email.trim();
    }

    if (Object.keys(patch).length === 0) {
      setEditing(false);
      setNotice("Nothing to change.");
      return;
    }

    const result = await send("/api/account/profile", {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
    if (result) {
      setEditing(false);
      setNotice(
        patch.email
          ? "Saved. Confirm the new email address so it counts as verified."
          : "Saved. Your details can be changed again in six months.",
      );
    }
  }

  const lockedNote = locked && nextChange ? `Next change ${nextChange}` : "";

  return (
    <div className="grid gap-5">
      <div className="glass-card account-card animate-rise">
        <div className="account-head">
          <p className="kicker">My account</p>
          {current.avatar ? (
            <button
              type="button"
              className="avatar-frame avatar-button"
              onClick={() => setPhotoMenu(true)}
              aria-haspopup="dialog"
              aria-label="Profile picture options"
              title="Profile picture options"
            >
              <img
                src={current.avatar}
                alt={`${current.name || current.username}'s profile picture`}
              />
            </button>
          ) : (
            <button
              type="button"
              className="avatar-frame avatar-button"
              onClick={() => fileInput.current?.click()}
              aria-label="Add a profile picture"
              title="Add a profile picture"
            >
              {current.initials}
            </button>
          )}
          <div className="account-head-text">
            <h1 className="font-display text-2xl font-bold leading-tight">
              {current.name}
            </h1>
            <p className="muted text-sm">@{current.username}</p>
            <div className="flex flex-wrap gap-2 mt-1">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => fileInput.current?.click()}
                disabled={busy === "photo"}
              >
                {busy === "photo"
                  ? "Uploading…"
                  : current.avatar
                    ? "Change photo"
                    : "Add a photo"}
              </button>
              <LogoutButton
                endpoint="/api/auth/member/logout"
                className="btn btn-ghost btn-sm"
              >
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
        <div className="glass-card account-card grid gap-3 animate-rise">
          <p className="kicker">Verify your email</p>
          <p className="muted text-sm leading-relaxed">
            Confirm {current.email || "your email address"} so applications and
            messages reach you.
          </p>
          <Link
            href={`/verify?next=${encodeURIComponent("/my-account")}`}
            className="btn btn-primary btn-sm justify-self-start"
          >
            Verify email <span aria-hidden="true">↗</span>
          </Link>
        </div>
      )}

      <div className="glass-card account-card animate-rise">
        <div className="flex items-center justify-between gap-3 mb-1">
          <p className="kicker">Public profile</p>
          <span className={`badge ${profileVisible ? "badge-accepted" : "badge-neutral"}`}>
            {profileVisible ? "Live" : "Private"}
          </span>
        </div>
        <p className="muted text-sm leading-relaxed mt-2">
          A public profile shows your name, handle, photo and the ideas you have posted. It never
          shows your email, phone number or applications.
        </p>
        <div className="flex flex-wrap gap-2 mt-3">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={toggleProfile}
            disabled={profileBusy}
          >
            {profileBusy
              ? "Saving…"
              : profileVisible
                ? "Make my profile private"
                : "Make my profile public"}
          </button>
          {profileVisible && (
            <Link
              href={`/community/${current.username}`}
              className="btn btn-secondary btn-sm"
            >
              View my public profile
            </Link>
          )}
        </div>
      </div>

      {(error || notice) && (
        <p
          className={
            error
              ? "badge badge-denied p-3 text-sm"
              : "badge badge-accepted p-3 text-sm"
          }
          role="status"
        >
          {error || notice}
        </p>
      )}

      <div className="glass-card account-card animate-rise">
        <div className="flex items-center justify-between gap-3 mb-1">
          <p className="kicker">Details</p>
          {lockedNote && <span className="account-lock">{lockedNote}</span>}
        </div>

        {editing ? (
          <form onSubmit={saveDetails} className="grid gap-4 mt-4">
            <label className="field">
              <span className="field-label">Name</span>
              <input
                className="input"
                value={form.name}
                maxLength={60}
                disabled={locked}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
                required
              />
            </label>

            <label className="field">
              <span className="field-label">Username</span>
              <input
                className="input"
                value={form.username}
                maxLength={24}
                disabled={locked}
                autoCapitalize="none"
                spellCheck={false}
                onChange={(event) =>
                  setForm({ ...form, username: event.target.value })
                }
                required
              />
              <span className="faint text-xs mt-1">
                3–24 letters, numbers, dot, dash or underscore.
              </span>
            </label>

            <label className="field">
              <span className="field-label">Email</span>
              <input
                className="input"
                type="email"
                value={form.email}
                disabled={!emailChangeable}
                autoCapitalize="none"
                spellCheck={false}
                onChange={(event) =>
                  setForm({ ...form, email: event.target.value })
                }
              />
              <span className="faint text-xs mt-1">
                {emailChangeable
                  ? "You can change this until the address is confirmed."
                  : "This address is confirmed, so it can no longer be changed."}
              </span>
            </label>

            <label className="field">
              <span className="field-label">Phone number (optional)</span>
              <input
                className="input"
                value={form.phone}
                inputMode="tel"
                maxLength={24}
                disabled={locked}
                placeholder="+91 98765 43210"
                onChange={(event) =>
                  setForm({ ...form, phone: event.target.value })
                }
              />
            </label>

            <label className="field">
              <span className="field-label">New password (optional)</span>
              <input
                className="input"
                type="password"
                value={form.password}
                disabled={locked || !current.hasPassword}
                autoComplete="new-password"
                placeholder="Leave blank to keep your password"
                onChange={(event) =>
                  setForm({ ...form, password: event.target.value })
                }
              />
              <span className="faint text-xs mt-1">
                {current.hasPassword
                  ? "At least 8 characters. Changing it signs out your other devices."
                  : "This account signs in with Google or Discord, so it has no password."}
              </span>
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={busy === "details"}
              >
                {busy === "details" ? "Saving…" : "Save changes"}
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setEditing(false);
                  setError("");
                }}
              >
                Cancel
              </button>
            </div>
            <p className="faint text-xs">
              {locked && nextChange
                ? `Name, username, password and phone can be changed again on ${nextChange}.`
                : "Saving name, username, password or phone uses your one change for the next six months. Email does not."}
            </p>
          </form>
        ) : (
          <div className="account-rows">
            <div className="account-row">
              <span className="account-label">Name</span>
              <span className="account-value">{current.name}</span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={openEditor}
                disabled={locked}
                title={
                  locked
                    ? `You can change this again on ${nextChange}`
                    : undefined
                }
              >
                Change
              </button>
            </div>

            <div className="account-row">
              <span className="account-label">Username</span>
              <span className="account-value">@{current.username}</span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={openEditor}
                disabled={locked}
                title={
                  locked
                    ? `You can change this again on ${nextChange}`
                    : undefined
                }
              >
                Change
              </button>
            </div>

            <div className="account-row">
              <span className="account-label">Email</span>
              <span className="account-value" data-empty={!current.email}>
                {current.email || "Not added"}
              </span>
              <div className="flex items-center gap-2">
                {needsVerify && (
                  <Link
                    href={`/verify?next=${encodeURIComponent("/my-account")}`}
                    className="btn btn-secondary btn-sm"
                  >
                    Verify
                  </Link>
                )}
                {emailChangeable ? (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={openEditor}
                  >
                    Change
                  </button>
                ) : (
                  <span className="badge badge-accepted">Locked</span>
                )}
              </div>
            </div>

            <div className="account-row">
              <span className="account-label">Phone</span>
              <span className="account-value" data-empty={!current.phone}>
                {current.phone || "Not added yet"}
              </span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={openEditor}
                disabled={locked}
                title={
                  locked
                    ? `You can change this again on ${nextChange}`
                    : undefined
                }
              >
                Change
              </button>
            </div>

            <div className="account-row">
              <span className="account-label">Password</span>
              <span className="account-value">
                {current.hasPassword ? "Set" : "Google or Discord only"}
              </span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={openEditor}
                disabled={locked || !current.hasPassword}
                title={
                  locked
                    ? `You can change this again on ${nextChange}`
                    : undefined
                }
              >
                Change
              </button>
            </div>

            <div className="account-row">
              <span className="account-label">Sign-in</span>
              <span className="account-value">
                {PROVIDER_LABEL[current.provider] || "Password"}
              </span>
              <span className="account-lock">
                {current.hasPassword ? "Password set" : "No password"}
              </span>
            </div>

            <div className="account-row">
              <span className="account-label">Joined</span>
              <span className="account-value">{joined || "-"}</span>
              <span className="account-lock" />
            </div>
          </div>
        )}
      </div>

      {mounted &&
        photoMenu &&
        current.avatar &&
        createPortal(
          <div
            className="overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="photo-menu-title"
            onClick={() => setPhotoMenu(false)}
          >
            <div
              className="glass-card p-6 w-full animate-rise"
              style={{ maxWidth: "22rem" }}
              onClick={(event) => event.stopPropagation()}
            >
              <span className="badge badge-neutral">Profile picture</span>
              <h2
                id="photo-menu-title"
                className="font-display text-xl font-bold mt-3"
              >
                Your photo
              </h2>
              <p className="muted text-sm mt-2 leading-relaxed">
                Enlarge it, swap it for another image, or go back to your
                initials.
              </p>
              <div className="grid gap-2 mt-4">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setPhotoMenu(false);
                    setEnlarged(true);
                  }}
                  autoFocus
                >
                  Enlarge picture
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={changePhoto}
                  disabled={busy === "photo"}
                >
                  Change picture
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={removePicture}
                  disabled={busy === "photo"}
                >
                  {busy === "photo" ? "Removing…" : "Remove picture"}
                </button>
              </div>
              <button
                type="button"
                className="btn btn-ghost w-full mt-4"
                onClick={() => setPhotoMenu(false)}
              >
                Close
              </button>
            </div>
          </div>,
          document.body,
        )}

      {mounted &&
        enlarged &&
        current.avatar &&
        createPortal(
          <div
            className="overlay"
            role="dialog"
            aria-modal="true"
            aria-label="Profile picture, enlarged"
            onClick={() => setEnlarged(false)}
          >
            <button
              type="button"
              className="btn btn-secondary btn-sm photo-viewer-close"
              onClick={() => setEnlarged(false)}
              autoFocus
            >
              Close
            </button>
            <img
              className="photo-viewer-img"
              src={current.avatar}
              alt={`${current.name || current.username}'s profile picture, enlarged`}
            />
          </div>,
          document.body,
        )}
    </div>
  );
}
