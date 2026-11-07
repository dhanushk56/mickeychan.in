import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PetalField from "@/components/PetalField";
import ScrollProgress from "@/components/ScrollProgress";
import ScrollReveal from "@/components/ScrollReveal";

export const metadata = {
  title: {
    default: "Mickey Chan",
    template: "%s — Mickey Chan",
  },
  description:
    "The official home of Mickey Chan — gamer, streamer, and storyteller. Watch the latest videos and shorts, follow the channel, explore open roles, and apply to join the team.",
  metadataBase: new URL("https://mickeychan.in"),
  openGraph: {
    title: "Mickey Chan",
    description: "Gamer, streamer, and storyteller. Videos, shorts, and open roles.",
    type: "website",
  },
};

// Runs before React hydrates so the correct theme is on <html> for the very
// first paint — without this, the page would flash the wrong theme briefly.
const noFlashScript = `
(function () {
  try {
    var stored = localStorage.getItem('mc-theme');
    var theme = stored || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {}
})();
`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: noFlashScript }} />
      </head>
      <body>
        <div className="grid-veil" aria-hidden="true" />
        <PetalField />
        <ScrollProgress />
        <ScrollReveal />
        <Navbar />
        <main className="relative z-10 pt-24">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
