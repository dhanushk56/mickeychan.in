"use client";

import { useState } from "react";

// The answer is never in this component or its props. It is sent to the server,
// checked there, and only the reply message comes back.
export default function PuzzleCard({ puzzle, solved, openedClues }) {
  const [answer, setAnswer] = useState("");
  const [hintOpen, setHintOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const done = solved || Boolean(result);

  async function submit(event) {
    event?.preventDefault?.();
    if (busy || done) return;
    const guess = answer.trim();
    if (!guess) {
      setError("Write an answer first.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/arg/solve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ puzzleId: puzzle.id, answer: guess }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "That did not save. Try again.");
      setResult({ message: data.message, clues: data.clues || [] });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function choose(choice) {
    if (done || busy) return;
    setAnswer(choice);
  }

  return (
    <article className="glass-card arg-puzzle" data-solved={done}>
      <div className="arg-card-top">
        <span className={`badge ${done ? "badge-accepted" : "badge-neutral"}`}>
          {done ? "Open" : "Locked"}
        </span>
        <span className="faint text-xs">{puzzle.points} points</span>
      </div>

      <h3 className="font-display font-bold text-lg mt-2">{puzzle.title}</h3>
      <p className="muted text-sm mt-1">{puzzle.prompt}</p>

      {puzzle.choices?.length > 0 && !done && (
        <div className="arg-choices" role="group" aria-label="Answers">
          {puzzle.choices.map((choice) => (
            <button
              key={choice}
              type="button"
              className="btn btn-secondary btn-sm"
              data-picked={answer === choice}
              onClick={() => choose(choice)}
              disabled={busy}
            >
              {choice}
            </button>
          ))}
        </div>
      )}

      {done ? (
        <div className="arg-open">
          <p className="font-semibold text-sm">{puzzle.message}</p>
          {result?.clues?.length > 0 && (
            <p className="faint text-xs mt-1">
              New clue on your trail: {result.clues.map((clue) => clue.title).join(", ")}
            </p>
          )}
          {!result && openedClues?.length > 0 && (
            <p className="faint text-xs mt-1">
              You already opened {openedClues.length === 1 ? "this clue" : "these clues"}.
            </p>
          )}
        </div>
      ) : (
        <form className="arg-answer" onSubmit={submit}>
          <label className="field flex-1">
            <span className="field-label">Your answer</span>
            <input
              className="input"
              value={answer}
              maxLength={120}
              onChange={(event) => setAnswer(event.target.value)}
              placeholder="Type what you found"
              autoComplete="off"
              required
            />
          </label>
          <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
            {busy ? "Checking…" : "Open the lock"}
          </button>
        </form>
      )}

      {error && <p className="badge badge-denied mt-2">{error}</p>}

      {!done && puzzle.hint ? (
        <div className="mt-2">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            aria-expanded={hintOpen}
            onClick={() => setHintOpen((current) => !current)}
          >
            {hintOpen ? "Hide the hint" : "I need a hint"}
          </button>
          {hintOpen && <p className="faint text-xs mt-1">{puzzle.hint}</p>}
        </div>
      ) : null}
    </article>
  );
}
