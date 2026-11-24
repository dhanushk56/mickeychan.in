import "./globals.css";
import "./nav.css";
import "./account.css";
import "./auth-view.css";
import "./motion.css";
import "./runner.css";
import "./back-to-top.css";
import "./page-wipe.css";
import "./hover.css";
import "./auth-mark.css";
import { Suspense } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PetalField from "@/components/PetalField";
import ScrollRunner from "@/components/ScrollRunner";
import ScrollReveal from "@/components/ScrollReveal";
import RouteWipe from "@/components/RouteWipe";
import PageEnter from "@/components/PageEnter";
import PetalCursor from "@/components/PetalCursor";
import BackToTop from "@/components/BackToTop";

export const metadata = {
  title: {
    default: "Mickey Chan",
    template: "%s — Mickey Chan",
  },
  description:
    "The official home of Mickey Chan — gamer, streamer, and storyteller. Watch the latest videos and shorts, follow the channel, explore open roles, and apply to join the team.",
  metadataBase: new URL("https://mickeychan.in"),
  icons: {
    icon: [{ url: "/mickey-logo.png", type: "image/png" }],
    shortcut: "/mickey-logo.png",
    apple: "/mickey-logo.png",
  },
  openGraph: {
    title: "Mickey Chan",
    description: "Gamer, streamer, and storyteller. Videos, shorts, and open roles.",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* Pull the intro clip with the HTML, before hydration asks for it, so the
            character is ready by the first navigation. */}
        <link rel="preload" as="video" type="video/mp4" href="/media/route-intro.mp4" />
      </head>
      <body>
        <div className="grid-veil" aria-hidden="true" />
        <PetalField />
        <PetalCursor />
        <ScrollRunner />
        <ScrollReveal />
        <PageEnter />
        <Suspense fallback={null}>
          <RouteWipe />
        </Suspense>
        <Navbar />
        <BackToTop />
        <main className="relative z-10 pt-24">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
