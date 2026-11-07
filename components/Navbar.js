"use client";

import { useState } from "react";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const links = [
    { href: "/videos", label: "Videos" },
    { href: "/socials", label: "Socials" },
    { href: "/positions", label: "Open Positions" },
  ];

  return (
    <header className="glass-nav fixed top-0 left-0 right-0 z-50 px-6 md:px-16 py-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <Link href="/" className="brand-mark" aria-label="Mickey Chan home">
          <img
            src="/mickey-logo.png"
            alt="Mickey Chan"
            width={88}
            height={88}
            className="object-cover rounded-xl"
            style={{ width: 88, height: 88, objectFit: "cover" }}
          />
          <span>MICKEY CHAN</span>
        </Link>
        <div className="flex items-center gap-3 md:hidden">
          <ThemeToggle />
          <button className="menu-button" aria-label="Toggle menu" aria-expanded={open} onClick={() => setOpen(!open)}>
            <span /><span /><span />
          </button>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm font-semibold">
          {links.map((link) => <Link key={link.href} href={link.href} className="nav-link">{link.label}</Link>)}
          <ThemeToggle />
          <Link href="/join" className="btn-primary nav-cta">Join us <span aria-hidden="true">↗</span></Link>
        </nav>
        {open && (
          <nav className="mobile-nav md:hidden">
            {links.map((link) => <Link key={link.href} href={link.href} className="nav-link py-3" onClick={() => setOpen(false)}>{link.label}</Link>)}
            <Link href="/join" className="btn-primary mt-3 text-center" onClick={() => setOpen(false)}>Join us</Link>
          </nav>
        )}
      </div>
    </header>
  );
}
