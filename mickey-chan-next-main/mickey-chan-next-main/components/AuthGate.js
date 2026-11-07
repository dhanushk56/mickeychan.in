// Presentational only — the actual auth check happens server-side in
// app/admin/page.js and app/form-builder/page.js via lib/auth-guard.js.
// This just renders the right message for whichever state that check found.

export default function AuthGate({ session, next, area }) {
  if (!session.authenticated) {
    return (
      <div className="px-6 md:px-16 py-24 md:py-32 max-w-lg mx-auto text-center">
        <p className="section-kicker">Restricted</p>
        <h1 className="font-display text-3xl md:text-4xl font-bold mt-3 mb-5">Sign in required</h1>
        <p className="text-black/60 dark:text-white/60 mb-10 leading-relaxed">
          {area} is only accessible to specific Discord accounts. Sign in to continue.
        </p>
        <a href={`/api/auth/discord/login?next=${encodeURIComponent(next)}`} className="btn-primary">
          Sign in with Discord ↗
        </a>
      </div>
    );
  }

  if (!session.authorized) {
    return (
      <div className="px-6 md:px-16 py-24 md:py-32 max-w-lg mx-auto text-center">
        <p className="section-kicker">Restricted</p>
        <h1 className="font-display text-3xl md:text-4xl font-bold mt-3 mb-5">Not authorized</h1>
        <p className="text-black/60 dark:text-white/60 mb-2 leading-relaxed">
          You're signed in as <strong>{session.user?.username}</strong>, but this Discord account
          isn't on the allowed list for {area.toLowerCase()}.
        </p>
        <p className="text-black/40 dark:text-white/40 text-sm mb-10">ID: {session.user?.id}</p>
        <a href="/api/auth/discord/logout" className="btn-secondary">
          Sign out
        </a>
      </div>
    );
  }

  return null;
}
