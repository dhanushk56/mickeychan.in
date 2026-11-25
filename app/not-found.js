import Link from "next/link";

export const metadata = {
  title: "Page not found",
  description: "That page doesn't exist. Here's the way back.",
};

export default function NotFound() {
  return (
    <main className="page">
      <div className="shell" style={{ maxWidth: "40rem" }}>
        <div className="glass-card p-8 md:p-10 grid gap-3">
          <p className="kicker">404</p>
          <h1 className="display-lg">This page went missing.</h1>
          <p className="muted text-lg leading-relaxed">
            The link may be old, or the page may have moved. Everything below is still here.
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            <Link href="/" className="btn btn-primary btn-sm">
              Home
            </Link>
            <Link href="/videos" className="btn btn-secondary btn-sm">
              Videos
            </Link>
            <Link href="/announcements" className="btn btn-secondary btn-sm">
              Announcements
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
