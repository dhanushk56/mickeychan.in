import Link from "next/link";

export default function Home() {
  return (
    <>
      <section className="hero-section px-6 md:px-16 py-24 md:py-36">
        <div className="hero-content max-w-6xl mx-auto">
          <div className="max-w-3xl">
            <div className="eyebrow inline-flex items-center gap-2 text-xs font-bold tracking-[0.2em] px-4 py-2 rounded-full mb-7">
              <span className="eyebrow-dot" /> GAMER · STREAMER · STORYTELLER
            </div>
            <h1 className="font-display text-5xl md:text-7xl font-extrabold leading-[0.98] tracking-[-0.04em] mb-7">
              Play boldly.
              <br />
              <span className="gradient-text">Tell better stories.</span>
            </h1>
            <p className="text-black/65 dark:text-white/65 text-lg md:text-xl max-w-xl mb-10 leading-relaxed">
              Welcome to Mickey Chan&apos;s world of games, streams, and stories. Find your next favorite moment and join the community.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/videos" className="btn-primary">Explore videos <span aria-hidden="true">↗</span></Link>
              <Link href="/join" className="btn-secondary">Join the community</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
