"use client";

import { useEffect, useState } from "react";

const defaults = { title: "Let's make something memorable.", description: "Want to collaborate, join the team, or simply say hello? Send a message and we'll get back to you.", nameLabel: "Name", namePlaceholder: "Your name", emailLabel: "Email", emailPlaceholder: "you@example.com", interestLabel: "I'm interested in", messageLabel: "Message", messagePlaceholder: "Tell us what you have in mind...", submitLabel: "Send message ↗", successMessage: "Thanks — your message has been sent." };

export default function JoinPage() {
  const [config, setConfig] = useState(defaults);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/form", { cache: "no-store" }).then((response) => response.ok && response.json()).then((value) => value && setConfig({ ...defaults, ...value })).catch(() => {});
  }, []);

  async function submit(event) {
    event.preventDefault(); setBusy(true); setStatus("");
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    try {
      const response = await fetch("/api/join", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(form)) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to send your message.");
      formEl.reset(); setStatus(config.successMessage);
    } catch (error) { setStatus(error.message); } finally { setBusy(false); }
  }

  return <main className="join-page px-6 md:px-16 py-20 md:py-28"><div className="join-shell max-w-6xl mx-auto"><div className="max-w-2xl mb-12"><p className="section-kicker">Start a conversation</p><h1 className="font-display text-4xl md:text-6xl font-bold mt-3 mb-5">{config.title}</h1><p className="text-lg text-black/60 dark:text-white/60 leading-relaxed">{config.description}</p></div><form onSubmit={submit} className="join-form grid gap-8"><div className="grid md:grid-cols-2 gap-8"><label className="form-label form-question">{config.nameLabel}<input name="name" required className="form-input form-input-lg" placeholder={config.namePlaceholder} /></label><label className="form-label form-question">{config.emailLabel}<input name="email" type="email" required className="form-input form-input-lg" placeholder={config.emailPlaceholder} /></label></div><label className="form-label form-question">{config.interestLabel}<select name="role" className="form-input form-input-lg"><option>Community</option><option>Collaboration</option><option>General question</option></select></label><label className="form-label form-question">{config.messageLabel}<textarea name="message" required rows="8" className="form-input form-input-lg resize-y" placeholder={config.messagePlaceholder} /></label><div className="flex flex-wrap items-center gap-5"><button disabled={busy} className="btn-primary text-base disabled:opacity-60">{busy ? "Sending…" : config.submitLabel}</button>{status && <p role="status" className="text-sm text-black/60 dark:text-white/60">{status}</p>}</div></form></div></main>;
}
