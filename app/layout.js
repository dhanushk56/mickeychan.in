import "./globals.css";
import "./nav.css";
import "./account.css";
import "./panels.css";
import "./community.css";
import "./community-hub.css";
import "./auth-view.css";
import "./motion.css";
import "./runner.css";
import "./back-to-top.css";
import "./page-wipe.css";
import "./hover.css";
import "./auth-mark.css";
import { Suspense } from "react";
import { headers } from "next/headers";
import { maintenanceStatus } from "@/lib/maintenance";
import MaintenanceScreen from "@/components/MaintenanceScreen";
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
    template: "%s | Mickey Chan",
  },
  description:
    "Minecraft videos from Mickey Chan: long-form challenges and shorts, all playable on the site. See the latest uploads or which roles are open.",
  metadataBase: new URL("https://mickeychan.in"),
  icons: {
    icon: [{ url: "/mickey-logo.png", type: "image/png" }],
    shortcut: "/mickey-logo.png",
    apple: "/mickey-logo.png",
  },
  openGraph: {
    title: "Mickey Chan",
    description: "Minecraft challenges and shorts, plus the roles that are open right now.",
    type: "website",
  },
};

export default async function RootLayout({ children }) {
  const pathname = (await headers()).get("x-mc-path") || "";
  const maintenance = await maintenanceStatus(pathname);

  if (maintenance.closed) {
    return (
      <html lang="en">
        <body>
          <div className="grid-veil" aria-hidden="true" />
          <main className="relative z-10">
            <MaintenanceScreen message={maintenance.message} />
          </main>
        </body>
      </html>
    );
  }

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
        <Suspense fallback={null}>
          <ScrollReveal />
        </Suspense>
        <PageEnter />
        <Suspense fallback={null}>
          <RouteWipe />
        </Suspense>
        <Navbar locked={maintenance.locked} />
        <BackToTop />
        <main className="relative z-10 pt-24">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
