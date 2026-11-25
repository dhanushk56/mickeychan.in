"use client";

import { useState } from "react";
import Link from "next/link";

function formatWhen(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PollCard({ poll: initialPoll, signedIn }) {
  const [poll, setPoll] = useState(initialPoll);
  const [picked, setPicked] = useState(initialPoll.myChoices || []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [voted, setVoted] = useState((initialPoll.myChoices || []).length > 0);

  const showResults = voted || !poll.open;

  function toggle(optionId) {
    if (!poll.open || busy) return;
    if (poll.multiple) {
      setPicked((current) =>
        current.includes(optionId) ? current.filter((id) => id !== optionId) : [...current, optionId]
      );
    } else {
      setPicked([optionId]);
    }
  }

  async function vote() {
    if (busy) return;
    if (picked.length === 0) {
      setError("Pick an option first.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/polls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pollId: poll.id, choices: picked }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Your vote didn't save. Try again.");
      if (data.poll) setPoll(data.poll);
      setVoted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="glass-card poll-card" data-closed={!poll.open}>
      <header className="poll-head">
        <div>
          <h2 className="font-display font-bold poll-question">{poll.question}</h2>
          {poll.blurb && <p className="muted text-sm leading-relaxed">{poll.blurb}</p>}
        </div>
        <span className={`badge ${poll.open ? "badge-accepted" : "badge-neutral"}`}>
          {poll.open ? "Open" : "Closed"}
        </span>
      </header>

      <ul className="poll-options">
        {poll.tally.options.map((option) => {
          const active = picked.includes(option.id) || poll.myChoices.includes(option.id);
          return (
            <li key={option.id}>
              <button
                type="button"
                className="poll-option"
                data-active={active}
                data-results={showResults}
                disabled={!poll.open || busy}
                aria-pressed={active}
                onClick={() => toggle(option.id)}
              >
                <span className="poll-option-row">
                  <span className="poll-option-label">{option.label}</span>
                  {showResults && <span className="poll-option-count">{option.percent}%</span>}
                </span>
                {showResults && (
                  <span className="poll-bar" aria-hidden="true">
                    <span className="poll-bar-fill" style={{ width: `${option.percent}%` }} />
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <footer className="poll-foot">
        <span className="faint text-xs">
          {poll.tally.total} {poll.tally.total === 1 ? "vote" : "votes"}
          {poll.multiple ? " · pick any" : ""}
          {poll.closesAt ? ` · closes ${formatWhen(poll.closesAt)}` : ""}
        </span>

        {poll.open && signedIn && !voted && (
          <button type="button" className="btn btn-primary btn-sm" onClick={vote} disabled={busy}>
            {busy ? "Saving…" : "Vote"}
          </button>
        )}
        {poll.open && signedIn && voted && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setVoted(false)}>
            {poll.multiple ? "Change vote" : "Change answer"}
          </button>
        )}
        {poll.open && !signedIn && (
          <Link href="/login" className="btn btn-secondary btn-sm">
            Log in to vote
          </Link>
        )}
      </footer>

      {error && <p className="text-xs" style={{ color: "var(--danger, #ff8a8a)" }}>{error}</p>}
    </article>
  );
}
