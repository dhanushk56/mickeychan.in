"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="page">
      <div className="shell" style={{ maxWidth: "40rem" }}>
        <div className="glass-card p-8 md:p-10 grid gap-3" role="alert">
          <p className="kicker">Something broke</p>
          <h1 className="display-lg">That didn&apos;t load.</h1>
          <p className="muted text-lg leading-relaxed">
            The page hit an error while rendering. Trying again usually sorts it out — if it keeps
            happening, tell us through the contact page.
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            <button type="button" className="btn btn-primary btn-sm" onClick={() => reset()}>
              Try again
            </button>
            <Link href="/" className="btn btn-secondary btn-sm">
              Home
            </Link>
            <Link href="/contact" className="btn btn-ghost btn-sm">
              Contact
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
